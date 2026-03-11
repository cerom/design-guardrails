import * as ts from 'typescript';
import { readFileSync } from 'fs';
import { GuardrailsConfig, Violation, AnalysisResult } from './types/config.js';

export class CodeAnalyzer {
  private config: GuardrailsConfig;

  constructor(config: GuardrailsConfig) {
    this.config = config;
  }

  analyzeFile(filePath: string): AnalysisResult {
    const violations: Violation[] = [];
    
    try {
      const sourceCode = readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceCode,
        ts.ScriptTarget.Latest,
        true,
        filePath.endsWith('.tsx') || filePath.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      );

      // Visit all nodes in the AST
      this.visitNode(sourceFile, violations, sourceCode, filePath);

    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error);
    }

    return {
      filePath,
      violations
    };
  }

  private visitNode(node: ts.Node, violations: Violation[], sourceCode: string, filePath: string): void {
    // Check for JSX elements (HTML tags)
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      this.checkElementViolation(node, violations, sourceCode, filePath);
    }

    // Check for string literals that might be colors/tokens
    if (ts.isStringLiteral(node)) {
      this.checkTokenViolation(node, violations, sourceCode, filePath);
    }

    // Recursively visit child nodes
    ts.forEachChild(node, (child) => {
      this.visitNode(child, violations, sourceCode, filePath);
    });
  }

  private checkElementViolation(
    node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
    violations: Violation[],
    sourceCode: string,
    filePath: string
  ): void {
    const tagName = node.tagName;
    
    if (ts.isIdentifier(tagName)) {
      const elementName = tagName.text.toLowerCase();
      const rule = this.config.rules.elements?.[elementName];
      
      if (rule) {
        const position = ts.getLineAndCharacterOfPosition(
          node.getSourceFile(),
          node.getStart()
        );

        violations.push({
          type: 'element',
          line: position.line + 1,
          column: position.character + 1,
          found: `<${tagName.text}>`,
          expected: `<${rule.use}> from ${rule.from}`,
          message: rule.message || `use <${rule.use}> from ${rule.from}`,
          filePath
        });
      }
    }
  }

  private checkTokenViolation(
    node: ts.StringLiteral,
    violations: Violation[],
    sourceCode: string,
    filePath: string
  ): void {
    const value = node.text;
    const tokenRule = this.config.rules.tokens?.[value];
    
    if (tokenRule) {
      const position = ts.getLineAndCharacterOfPosition(
        node.getSourceFile(),
        node.getStart()
      );

      violations.push({
        type: 'token',
        line: position.line + 1,
        column: position.character + 1,
        found: value,
        expected: `token "${tokenRule}"`,
        message: `use token "${tokenRule}"`,
        filePath
      });
    }
  }

  analyzeFiles(filePaths: string[]): AnalysisResult[] {
    return filePaths.map(filePath => this.analyzeFile(filePath));
  }
}