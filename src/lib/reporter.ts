import { ScanResponse, Vulnerability } from '../types';
import { ConfigManager } from './config';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

export class Reporter {
  private useColors: boolean;
  private config: ConfigManager;

  constructor(config: ConfigManager, useColors: boolean = true) {
    this.config = config;
    this.useColors = useColors && process.stdout.isTTY;
  }

  private color(text: string, color: keyof typeof COLORS): string {
    if (!this.useColors) {
      return text;
    }
    return `${COLORS[color]}${text}${COLORS.reset}`;
  }

  success(message: string): void {
    console.log(this.color('✓ ', 'green') + message);
  }

  error(message: string): void {
    console.error(this.color('✗ ', 'red') + message);
  }

  warning(message: string): void {
    console.warn(this.color('⚠ ', 'yellow') + message);
  }

  info(message: string): void {
    console.log(this.color('ℹ ', 'blue') + message);
  }

  reportScan(result: ScanResponse): void {
    console.log(this.color('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim'));
    console.log(this.color('  GitGuard Security Scan Results', 'bright'));
    console.log(this.color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'dim'));

    // Show scan metadata
    console.log(this.color(`Files scanned: ${result.filesScanned}`, 'dim'));
    console.log(this.color(`Duration: ${(result.duration / 1000).toFixed(2)}s`, 'dim'));

    // Show enhanced features status
    const hasAI = result.vulnerabilities.some(v => v.aiRemediation);
    const preferences = this.config.getPreferences();
    if (hasAI) {
      console.log(this.color('AI-Enhanced: Yes', 'cyan'));
    }
    if (preferences.dependencyScanEnabled) {
      console.log(this.color('Dependency Scan: Enabled', 'cyan'));
    }
    if (preferences.secretScanEnabled) {
      console.log(this.color('Secret Scan: Enabled', 'cyan'));
    }
    console.log();

    if (result.vulnerabilities.length === 0) {
      this.success('No vulnerabilities found');
      console.log(this.color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'dim'));
      return;
    }

    const { summary } = result;

    console.log(this.color(`Found ${result.vulnerabilities.length} issue(s):`, 'bright'));
    if (summary.critical > 0) {
      console.log(this.color(`  CRITICAL: ${summary.critical}`, 'red'));
    }
    if (summary.high > 0) {
      console.log(this.color(`  HIGH: ${summary.high}`, 'red'));
    }
    if (summary.medium > 0) {
      console.log(this.color(`  MEDIUM: ${summary.medium}`, 'yellow'));
    }
    if (summary.low > 0) {
      console.log(this.color(`  LOW: ${summary.low}`, 'blue'));
    }
    if (summary.info > 0) {
      console.log(this.color(`  INFO: ${summary.info}`, 'cyan'));
    }
    console.log();

    const sorted = this.sortBySeverity(result.vulnerabilities);

    for (const vuln of sorted.slice(0, 10)) {
      this.reportVulnerability(vuln);
    }

    if (result.vulnerabilities.length > 10) {
      console.log(
        this.color(
          `\n... and ${result.vulnerabilities.length - 10} more issue(s)\n`,
          'dim'
        )
      );
    }

    console.log(this.color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim'));
    console.log(
      this.color(
        `View full results: ${this.config.get().apiUrl.replace('/api/v1', '')}/dashboard/scans?scan=${result.scanId}`,
        'cyan'
      )
    );
    console.log(this.color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'dim'));
  }

  private reportVulnerability(vuln: Vulnerability): void {
    const severityColor = this.getSeverityColor(vuln.severity);
    const severityLabel = vuln.severity.toUpperCase().padEnd(8);

    // Header with severity and type
    console.log(this.color('┌─', 'dim') + this.color(` ${severityLabel}`, severityColor) + this.color('─────────────────────────────────────────', 'dim'));
    console.log(this.color('│ ', 'dim') + this.color(vuln.type, 'bright'));
    console.log(this.color('│ ', 'dim') + this.color(`${vuln.file}:${vuln.line}`, 'cyan'));
    console.log(this.color('├─────────────────────────────────────────────────────', 'dim'));

    // Description
    console.log(this.color('│ ', 'dim') + this.color('Description:', 'bright'));
    const descLines = this.wrapText(vuln.description, 50);
    for (const line of descLines) {
      console.log(this.color('│ ', 'dim') + `  ${line}`);
    }

    // Code snippet if available
    if (vuln.code) {
      console.log(this.color('│ ', 'dim'));
      console.log(this.color('│ ', 'dim') + this.color('Code:', 'bright'));
      const codeLines = vuln.code.split('\n');
      for (const line of codeLines.slice(0, 3)) {
        if (line.trim()) {
          console.log(this.color('│ ', 'dim') + this.color(`  ${line.trim().substring(0, 50)}`, 'dim'));
        }
      }
    }

    // Standard remediation
    if (vuln.remediation) {
      console.log(this.color('│ ', 'dim'));
      console.log(this.color('│ ', 'dim') + this.color('How to fix:', 'bright'));
      const remLines = this.wrapText(vuln.remediation, 50);
      for (const line of remLines.slice(0, 5)) {
        console.log(this.color('│ ', 'dim') + `  ${line}`);
      }
    }

    // AI remediation if available
    if (vuln.aiRemediation) {
      console.log(this.color('│ ', 'dim'));
      console.log(this.color('│ ', 'dim') + this.color('AI Suggestion:', 'cyan') + this.color(' ✨', 'bright'));
      const aiLines = this.wrapText(vuln.aiRemediation, 50);
      for (const line of aiLines.slice(0, 5)) {
        console.log(this.color('│ ', 'dim') + `  ${line}`);
      }
    }

    console.log(this.color('└─────────────────────────────────────────────────────', 'dim'));
    console.log();
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).length <= maxWidth) {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines;
  }

  private getSeverityColor(severity: string): keyof typeof COLORS {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'red';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'blue';
      case 'info':
        return 'cyan';
      default:
        return 'reset';
    }
  }

  private sortBySeverity(vulnerabilities: Vulnerability[]): Vulnerability[] {
    const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return [...vulnerabilities].sort(
      (a, b) => order[a.severity] - order[b.severity]
    );
  }
}
