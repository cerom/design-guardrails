import { readFileSync, existsSync } from 'fs';
import { join, relative, basename, extname, dirname } from 'path';
import { sync as globSync } from 'glob';

export interface DetectedElementRule {
  htmlElement: string;
  componentName: string;
  importPath: string;
}

const TARGET_ELEMENTS = [
  'button', 'input', 'a', 'select', 'textarea',
  'img', 'form', 'label', 'dialog', 'table',
];

const SEARCH_DIRS = [
  'src/components/ui',
  'src/components',
  'components/ui',
  'components',
  'app/components',
  'src/ui',
  'lib/components',
];

const SKIP_PATTERNS = ['*.test.*', '*.spec.*', '*.stories.*', '__tests__/**'];

export function scanComponents(cwd: string): DetectedElementRule[] {
  const hasPathAlias = checkPathAlias(cwd);
  const existingDirs = SEARCH_DIRS.filter(d => existsSync(join(cwd, d)));

  if (existingDirs.length === 0) return [];

  // Collect all component files and read them once
  const componentFiles = new Set<string>();
  for (const dir of existingDirs) {
    const files = globSync('**/*.{tsx,jsx}', {
      cwd: join(cwd, dir),
      absolute: true,
      ignore: SKIP_PATTERNS,
    });
    files.forEach(f => componentFiles.add(f));
  }

  // Cache file contents to avoid re-reading for each element
  const fileContents = new Map<string, string>();
  for (const filePath of componentFiles) {
    const componentName = getComponentName(filePath);
    // Only consider files that resolve to an uppercase name (React components)
    if (!componentName || !/^[A-Z]/.test(componentName)) continue;
    try {
      fileContents.set(filePath, readFileSync(filePath, 'utf-8'));
    } catch {
      continue;
    }
  }

  const results: DetectedElementRule[] = [];

  for (const element of TARGET_ELEMENTS) {
    const match = findComponentForElement(element, fileContents, cwd);
    if (match) {
      results.push({
        htmlElement: element,
        componentName: match.componentName,
        importPath: deriveImportPath(match.filePath, cwd, hasPathAlias),
      });
    }
  }

  return results;
}

// Resolves a component name from a file path.
// For `Button.tsx` → "Button", for `Button/index.tsx` → "Button"
function getComponentName(filePath: string): string | null {
  const fileName = basename(filePath, extname(filePath));
  if (fileName.toLowerCase() === 'index') {
    // Use parent directory name for index files
    return basename(dirname(filePath));
  }
  return fileName;
}

// Maps HTML elements to keywords that likely indicate a reusable wrapper component.
// A component named "Button" or "Btn" is far more likely to be a <button> replacement
// than "ProgressBack" which just happens to render a <button> internally.
const ELEMENT_NAME_HINTS: Record<string, string[]> = {
  button: ['button', 'btn', 'cta'],
  input: ['input', 'field', 'textfield'],
  a: ['link', 'anchor', 'navlink'],
  select: ['select', 'dropdown', 'picker', 'combobox'],
  textarea: ['textarea', 'textfield', 'editor'],
  img: ['image', 'img', 'avatar', 'photo', 'picture'],
  form: ['form'],
  label: ['label'],
  dialog: ['dialog', 'modal', 'drawer', 'sheet'],
  table: ['table', 'datagrid', 'datatable'],
};

function findComponentForElement(
  element: string,
  fileContents: Map<string, string>,
  cwd: string
): { componentName: string; filePath: string } | null {
  const regex = new RegExp(`<${element}[\\s/>]`);
  const hints = ELEMENT_NAME_HINTS[element] || [element];
  const candidates: { componentName: string; filePath: string; score: number }[] = [];

  for (const [filePath, content] of fileContents) {
    if (regex.test(content)) {
      const componentName = getComponentName(filePath)!;
      const nameLower = componentName.toLowerCase();
      const relativePath = relative(cwd, filePath);

      // Strong bonus if the component name matches a known hint for this element
      const nameMatchesHint = hints.some(hint => nameLower.includes(hint));
      // Bonus for /ui/ or /atoms/ directories (design system primitives)
      const isDesignSystemDir = /\/(ui|atoms|primitives|base)\//i.test(relativePath);

      let score = relativePath.length;
      if (!nameMatchesHint) score += 500;  // heavy penalty for unrelated names
      if (isDesignSystemDir) score -= 50;  // bonus for design system dirs

      candidates.push({ componentName, filePath, score });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.score - b.score);
  return candidates[0];
}

function checkPathAlias(cwd: string): boolean {
  try {
    const tsconfig = JSON.parse(readFileSync(join(cwd, 'tsconfig.json'), 'utf-8'));
    const paths = tsconfig.compilerOptions?.paths || {};
    return Object.keys(paths).some(k => k.startsWith('@/'));
  } catch {
    return false;
  }
}

function deriveImportPath(filePath: string, cwd: string, hasPathAlias: boolean): string {
  const rel = relative(cwd, filePath);
  const withoutExt = rel.replace(/\.(tsx|jsx)$/, '');
  const importPath = withoutExt.replace(/\/index$/, '');

  if (hasPathAlias && importPath.startsWith('src/')) {
    return '@/' + importPath.slice(4);
  }

  return './' + importPath;
}
