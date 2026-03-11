#!/usr/bin/env node

import { CodeAnalyzer } from '../analyzer.js';
import { ViolationFormatter } from '../formatter.js';
import { GuardrailsConfig } from '../types/config.js';
import { readFileSync } from 'fs';
import { join } from 'path';

interface ClaudeCodeHookInput {
  session_id: string;
  cwd: string;
  hook_event_name: string;
  tool_name: string;
  tool_input: {
    path?: string;
    content?: string;
    command?: string;
  };
  tool_use_id: string;
}

interface ClaudeCodeHookOutput {
  hookSpecificOutput: {
    hookEventName: string;
    permissionDecision: 'allow' | 'deny' | 'ask';
    permissionDecisionReason?: string;
  };
}

async function main() {
  try {
    // Read hook input from stdin
    const input = await readStdin();
    const hookData: ClaudeCodeHookInput = JSON.parse(input);

    // Only process Edit/Write tools
    if (!['Edit', 'Write'].includes(hookData.tool_name)) {
      return allowAction();
    }

    // Get the file path that was modified
    const filePath = hookData.tool_input.path;
    if (!filePath) {
      return allowAction();
    }

    // Check if it's a file type we care about
    if (!filePath.match(/\.(tsx?|jsx?)$/)) {
      return allowAction();
    }

    // Load guardrails config
    const config = loadGuardrailsConfig(hookData.cwd);
    if (!config) {
      return allowAction(); // No config found, allow
    }

    // Check if file matches include patterns
    if (!shouldAnalyzeFile(filePath, config)) {
      return allowAction();
    }

    // Analyze the file
    const analyzer = new CodeAnalyzer(config);
    const result = analyzer.analyzeFile(join(hookData.cwd, filePath));
    
    if (result.violations.length === 0) {
      return allowAction();
    }

    // Format violations and deny
    const formatter = new ViolationFormatter();
    const violationMessage = formatter.formatForClaudeCode([result]);
    
    return denyAction(violationMessage);

  } catch (error) {
    // On error, allow the action but log the error
    console.error('design-guardrails hook error:', error);
    return allowAction();
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    
    process.stdin.on('end', () => {
      resolve(data);
    });
  });
}

function loadGuardrailsConfig(cwd: string): GuardrailsConfig | null {
  const possiblePaths = [
    join(cwd, 'guardrails.config.js'),
    join(cwd, 'guardrails.config.ts'),
    join(cwd, '.guardrails.js'),
    join(cwd, '.guardrails.ts')
  ];

  for (const configPath of possiblePaths) {
    try {
      // Clear require cache
      if (require.cache[configPath]) {
        delete require.cache[configPath];
      }
      
      const configModule = require(configPath);
      return configModule.default || configModule;
    } catch (error) {
      // Try next path
      continue;
    }
  }

  // Config not found
  return null;
}

function shouldAnalyzeFile(filePath: string, config: GuardrailsConfig): boolean {
  // Simple glob matching - in production we'd use a proper glob library
  for (const pattern of config.include) {
    // Convert glob pattern to regex
    let regexPattern = pattern
      .replace(/\./g, '\\.')  // Escape dots first
      .replace(/\*\*/g, '{{GLOBSTAR}}') // Placeholder for **
      .replace(/\*/g, '[^/]*') // * matches any file/dir name
      .replace(/\?/g, '.') // ? matches single char
      .replace(/{{GLOBSTAR}}/g, '.*'); // ** matches any path including empty
    
    // Handle special case: **/*.ext should match both dir/file.ext AND file.ext
    regexPattern = regexPattern.replace(/^\.\*\//, '(?:.*/)?');
    
    const regex = new RegExp(`^${regexPattern}$`);
    
    if (regex.test(filePath)) {
      return true;
    }
  }
  
  return false;
}

function allowAction(): ClaudeCodeHookOutput {
  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      permissionDecision: 'allow'
    }
  };
}

function denyAction(reason: string): ClaudeCodeHookOutput {
  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason
    }
  };
}

// Run the hook
main().then((output) => {
  console.log(JSON.stringify(output));
  process.exit(output.hookSpecificOutput.permissionDecision === 'deny' ? 2 : 0);
}).catch((error) => {
  console.error('Hook failed:', error);
  process.exit(1);
});