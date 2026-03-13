import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface DetectedTokenRule {
  hexValue: string;
  tokenName: string;
  source: string;
}

const TAILWIND_CONFIG_FILES = [
  'tailwind.config.js',
  'tailwind.config.ts',
  'tailwind.config.mjs',
  'tailwind.config.cjs',
];

const CSS_FILES = [
  'src/app/globals.css',
  'app/globals.css',
  'src/globals.css',
  'src/index.css',
  'styles/globals.css',
  'src/styles/globals.css',
  'src/styles/variables.css',
  'src/app/globals.scss',
  'app/globals.scss',
  'src/globals.scss',
  'styles/globals.scss',
  'src/styles/globals.scss',
  'src/styles/variables.scss',
];

export function scanTokens(cwd: string): DetectedTokenRule[] {
  const tokens: DetectedTokenRule[] = [];
  const seenHex = new Set<string>();

  // Scan Tailwind config first (preferred source)
  const tailwindTokens = scanTailwindConfig(cwd);
  for (const t of tailwindTokens) {
    const normalized = normalizeHex(t.hexValue);
    if (!seenHex.has(normalized)) {
      seenHex.add(normalized);
      tokens.push({ ...t, hexValue: normalized });
    }
  }

  // Scan CSS custom properties
  const cssTokens = scanCssVariables(cwd);
  for (const t of cssTokens) {
    const normalized = normalizeHex(t.hexValue);
    if (!seenHex.has(normalized)) {
      seenHex.add(normalized);
      tokens.push({ ...t, hexValue: normalized });
    }
  }

  return tokens;
}

function scanTailwindConfig(cwd: string): DetectedTokenRule[] {
  const tokens: DetectedTokenRule[] = [];

  for (const configFile of TAILWIND_CONFIG_FILES) {
    const filePath = join(cwd, configFile);
    if (!existsSync(filePath)) continue;

    try {
      const content = readFileSync(filePath, 'utf-8');
      extractColorsFromTailwind(content, configFile, tokens);
    } catch {
      continue;
    }
    break; // Only read the first found config
  }

  return tokens;
}

function extractColorsFromTailwind(content: string, source: string, tokens: DetectedTokenRule[]): void {
  // Match key-value pairs like: colorName: '#hex' or 'colorName': '#hex'
  const hexPattern = /['"]?([a-zA-Z0-9_-]+)['"]?\s*:\s*['"]?(#[0-9a-fA-F]{3,8})['"]?/g;
  let match;

  while ((match = hexPattern.exec(content)) !== null) {
    const tokenName = match[1];
    const hexValue = match[2];

    // Skip common non-color keys
    if (['extend', 'theme', 'colors', 'plugins', 'content'].includes(tokenName)) continue;

    tokens.push({ hexValue, tokenName, source });
  }
}

function scanCssVariables(cwd: string): DetectedTokenRule[] {
  const tokens: DetectedTokenRule[] = [];

  for (const cssFile of CSS_FILES) {
    const filePath = join(cwd, cssFile);
    if (!existsSync(filePath)) continue;

    try {
      const content = readFileSync(filePath, 'utf-8');
      extractCssCustomProperties(content, cssFile, tokens);
    } catch {
      continue;
    }
  }

  return tokens;
}

function extractCssCustomProperties(content: string, source: string, tokens: DetectedTokenRule[]): void {
  // Match --variable-name: #hex
  const cssVarPattern = /--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})/g;
  let match;

  while ((match = cssVarPattern.exec(content)) !== null) {
    tokens.push({
      hexValue: match[2],
      tokenName: `--${match[1]}`,
      source,
    });
  }
}

function normalizeHex(hex: string): string {
  // Normalize 3-char hex to 6-char
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase();
  }
  return hex.toLowerCase();
}
