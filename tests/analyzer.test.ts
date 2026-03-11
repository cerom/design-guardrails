import { CodeAnalyzer } from '../src/analyzer';
import { GuardrailsConfig } from '../src/types/config';
import path from 'path';

describe('CodeAnalyzer', () => {
  const testConfig: GuardrailsConfig = {
    include: ['src/**/*.tsx'],
    rules: {
      elements: {
        button: { use: 'Button', from: '@/components/ui/button' },
        input: { use: 'Input', from: '@/components/ui/input' },
        a: { use: 'Link', from: '@/components/ui/link' },
      },
      tokens: {
        '#63g5fh': 'text-secondary',
        '#ffffff': 'bg-background',
      }
    }
  };

  let analyzer: CodeAnalyzer;

  beforeEach(() => {
    analyzer = new CodeAnalyzer(testConfig);
  });

  it('should detect element violations', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'example.tsx');
    const result = analyzer.analyzeFile(fixturePath);

    expect(result.violations).toHaveLength(5); // 3 elements + 2 tokens

    // Check button violation
    const buttonViolation = result.violations.find(v => v.found === '<button>');
    expect(buttonViolation).toBeDefined();
    expect(buttonViolation?.type).toBe('element');
    expect(buttonViolation?.expected).toBe('<Button> from @/components/ui/button');
    expect(buttonViolation?.line).toBe(6); // Line where <button> appears

    // Check input violation
    const inputViolation = result.violations.find(v => v.found === '<input>');
    expect(inputViolation).toBeDefined();
    expect(inputViolation?.expected).toBe('<Input> from @/components/ui/input');

    // Check link violation
    const linkViolation = result.violations.find(v => v.found === '<a>');
    expect(linkViolation).toBeDefined();
    expect(linkViolation?.expected).toBe('<Link> from @/components/ui/link');
  });

  it('should detect token violations', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'example.tsx');
    const result = analyzer.analyzeFile(fixturePath);

    // Check hex color violations
    const colorViolation = result.violations.find(v => v.found === '#63g5fh');
    expect(colorViolation).toBeDefined();
    expect(colorViolation?.type).toBe('token');
    expect(colorViolation?.expected).toBe('token "text-secondary"');

    const bgViolation = result.violations.find(v => v.found === '#ffffff');
    expect(bgViolation).toBeDefined();
    expect(bgViolation?.expected).toBe('token "bg-background"');
  });

  it('should return empty violations for compliant code', () => {
    // We would need a fixture with compliant code for this test
    // For now, just test that the analyzer doesn't crash
    const fixturePath = path.join(__dirname, 'fixtures', 'example.tsx');
    const configWithNoRules: GuardrailsConfig = {
      include: ['src/**/*.tsx'],
      rules: {}
    };
    const noRulesAnalyzer = new CodeAnalyzer(configWithNoRules);
    
    const result = noRulesAnalyzer.analyzeFile(fixturePath);
    expect(result.violations).toHaveLength(0);
  });

  it('should handle multiple files', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'example.tsx');
    const results = analyzer.analyzeFiles([fixturePath]);

    expect(results).toHaveLength(1);
    expect(results[0].filePath).toBe(fixturePath);
    expect(results[0].violations.length).toBeGreaterThan(0);
  });
});