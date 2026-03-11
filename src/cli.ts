#!/usr/bin/env node

import { Command } from 'commander';
import { CodeAnalyzer } from './analyzer.js';
import { ViolationFormatter } from './formatter.js';
import { GuardrailsConfig } from './types/config.js';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { sync as globSync } from 'glob';

const program = new Command();

program
  .name('design-guardrails')
  .description('Make your AI coding agent use your design system without human intervention.')
  .version('0.1.0');

program
  .command('check')
  .description('Check files for design system violations')
  .option('-c, --config <path>', 'Path to guardrails config file')
  .option('--json', 'Output results as JSON')
  .action((options) => {
    const config = loadConfig(options.config);
    if (!config) {
      console.error('No guardrails config found. Create a guardrails.config.js file.');
      process.exit(1);
    }

    const files = resolveFiles(config);
    if (files.length === 0) {
      console.log('No files matched the include patterns.');
      return;
    }

    const analyzer = new CodeAnalyzer(config);
    const results = analyzer.analyzeFiles(files);
    const formatter = new ViolationFormatter();

    if (options.json) {
      console.log(formatter.formatAsJson(results));
    } else {
      const output = formatter.formatForClaudeCode(results);
      if (output) {
        console.log(output);
      }
      console.log(formatter.formatSummary(results));
    }

    const hasViolations = results.some(r => r.violations.length > 0);
    if (hasViolations) {
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Create a starter guardrails config')
  .action(() => {
    console.log(`Create a guardrails.config.js in your project root:

const { defineConfig } = require('design-guardrails');

module.exports = defineConfig({
  include: ['src/**/*.tsx'],
  rules: {
    elements: {
      button: { use: 'Button', from: '@/components/ui/button' },
      input: { use: 'Input', from: '@/components/ui/input' },
      a: { use: 'Link', from: '@/components/ui/link' },
    },
    tokens: {
      '#000000': 'text-primary',
      '#ffffff': 'bg-background',
    }
  }
});`);
  });

program.parse();

function loadConfig(configPath?: string): GuardrailsConfig | null {
  const cwd = process.cwd();

  if (configPath) {
    try {
      const fullPath = resolve(cwd, configPath);
      const configModule = require(fullPath);
      return configModule.default || configModule;
    } catch {
      return null;
    }
  }

  const possiblePaths = [
    'guardrails.config.js',
    'guardrails.config.ts',
    '.guardrails.js',
    '.guardrails.ts',
  ];

  for (const p of possiblePaths) {
    try {
      const fullPath = join(cwd, p);
      const configModule = require(fullPath);
      return configModule.default || configModule;
    } catch {
      continue;
    }
  }

  return null;
}

function resolveFiles(config: GuardrailsConfig): string[] {
  const cwd = process.cwd();
  const files: string[] = [];

  for (const pattern of config.include) {
    const matched = globSync(pattern, {
      cwd,
      absolute: true,
      ignore: config.exclude,
    });
    files.push(...matched);
  }

  return [...new Set(files)];
}
