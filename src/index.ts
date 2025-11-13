#!/usr/bin/env node

import { Command } from 'commander';
import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { whoamiCommand } from './commands/whoami';
import { scanCommand } from './commands/scan';

const program = new Command();

program
  .name('gitguard')
  .description('GitGuard CLI - Security scanning for developers')
  .version('1.0.0');

program
  .command('login')
  .description('Authenticate with GitGuard')
  .option('-e, --email <email>', 'Email address')
  .option('-p, --password <password>', 'Password')
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
  .description('Scan code for security vulnerabilities')
  .option('-d, --dir <path>', 'Directory to scan', process.cwd())
  .option('--ai', 'Include AI-powered analysis (Pro/Premier only)')
  .option('--dependencies', 'Include dependency scanning (Premier only)')
  .option('--secrets', 'Include secret scanning (Premier only)')
  .option('--json', 'Output results as JSON')
  .action(scanCommand);

program.parse(process.argv);
