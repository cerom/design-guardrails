import { AnalysisResult, Violation } from './types/config.js';
import chalk from 'chalk';

export class ViolationFormatter {
  formatForClaudeCode(results: AnalysisResult[]): string {
    const violationsFound = results.some(r => r.violations.length > 0);
    
    if (!violationsFound) {
      return '';
    }

    let output = chalk.red('🚨 design-guardrails: violations found\n\n');
    
    for (const result of results) {
      if (result.violations.length === 0) continue;
      
      const relativePath = result.filePath.replace(process.cwd(), '');
      output += chalk.yellow(`${result.violations.length} violation${result.violations.length > 1 ? 's' : ''} in ${relativePath}\n\n`);
      
      for (const violation of result.violations) {
        const lineInfo = chalk.dim(`line ${violation.line}`);
        const found = chalk.red(violation.found);
        const arrow = chalk.dim('→');
        const expected = chalk.green(violation.expected);
        
        output += `  ${lineInfo}: ${found} ${arrow} ${expected}\n`;
      }
      
      output += '\n';
    }

    output += chalk.dim('Fix these violations before continuing.\n');
    
    return output;
  }

  formatAsJson(results: AnalysisResult[]): string {
    const violations = results.flatMap(r => r.violations);
    
    return JSON.stringify({
      tool: 'design-guardrails',
      violations: violations.map(v => ({
        file: v.filePath.replace(process.cwd(), ''),
        line: v.line,
        column: v.column,
        type: v.type,
        found: v.found,
        expected: v.expected,
        message: v.message
      }))
    }, null, 2);
  }

  formatSummary(results: AnalysisResult[]): string {
    const totalViolations = results.reduce((sum, r) => sum + r.violations.length, 0);
    const filesWithViolations = results.filter(r => r.violations.length > 0).length;
    
    if (totalViolations === 0) {
      return chalk.green('✅ No design system violations found');
    }
    
    return chalk.red(
      `❌ Found ${totalViolations} violation${totalViolations > 1 ? 's' : ''} ` +
      `across ${filesWithViolations} file${filesWithViolations > 1 ? 's' : ''}`
    );
  }
}