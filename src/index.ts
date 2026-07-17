#!/usr/bin/env node

import { Command } from 'commander';
import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { whoamiCommand } from './commands/whoami';
import { scanCommand } from './commands/scan';
import { readFileSync } from 'fs';
import { join } from 'path';

// Get package version dynamically
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('gitguard')
  .description('GitGuard CLI - Security scanning for developers')
  .version(packageJson.version);

program
  .command('login')
  .description('Authenticate with GitGuard via browser')
  .action(loginCommand);

program
  .command('logout')
  .description('Log out of GitGuard')
  .action(logoutCommand);

program
  .command('whoami')
  .description('Show current user and subscription info')
  .action(whoamiCommand);

program
  .command('scan')
  .description('Scan code for security vulnerabilities (uses your preferences by default)')
  .option('-d, --dir <path>', 'Directory to scan')
  .option('-f, --file <path>', 'Specific file to scan')
  .option('--ai', 'Force enable AI-powered analysis')
  .option('--no-ai', 'Disable AI-powered analysis')
  .option('--dependencies', 'Force enable dependency scanning')
  .option('--no-dependencies', 'Disable dependency scanning')
  .option('--secrets', 'Force enable secret scanning')
  .option('--no-secrets', 'Disable secret scanning')
  .option('--cvss', 'Enable CVSS 3.1 scoring for vulnerabilities (Pro/Premier)')
  .option('--no-cvss', 'Disable CVSS scoring')
  .option('--api-security', 'Enable API security scanning (OpenAPI/GraphQL) (Premier)')
  .option('--no-api-security', 'Disable API security scanning')
  .option('--validate', 'Enable vulnerability validation with confidence scoring (Pro/Premier)')
  .option('--no-validate', 'Disable vulnerability validation')
  .option('--compliance <framework>', 'Generate compliance report (owasp, pci-dss, soc2, hipaa, cis, all) (Premier)')
  .option('--json', 'Output results as JSON')
  .option('--fix', 'Generate fix prompts and open vulnerabilities in your editor')
  .action(scanCommand);

program.parse(process.argv);
