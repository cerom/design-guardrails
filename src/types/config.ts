export interface GuardrailsConfig {
  include: string[];
  exclude?: string[];
  rules: {
    elements?: ElementRules;
    tokens?: TokenRules;
  };
}

export interface ElementRules {
  [htmlElement: string]: {
    use: string;
    from: string;
    message?: string;
  };
}

export interface TokenRules {
  [hexColor: string]: string;
}

export interface Violation {
  type: 'element' | 'token';
  line: number;
  column: number;
  found: string;
  expected: string;
  message: string;
  filePath: string;
}

export interface AnalysisResult {
  filePath: string;
  violations: Violation[];
}

export function defineConfig(config: GuardrailsConfig): GuardrailsConfig {
  return config;
}