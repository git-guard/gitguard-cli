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
    console.log(this.color('\nScan Results', 'bright'));
    console.log(this.color(`Files scanned: ${result.filesScanned}`, 'dim'));
    console.log(
      this.color(`Duration: ${(result.duration / 1000).toFixed(2)}s\n`, 'dim')
    );

    if (result.vulnerabilities.length === 0) {
      this.success('No vulnerabilities found');
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
          `\n... and ${result.vulnerabilities.length - 10} more issues\n`,
          'dim'
        )
      );
      console.log(
        this.color(
          `View full results at: ${this.config.get().apiUrl}/scans/${result.scanId}`,
          'blue'
        )
      );
    }
  }

  private reportVulnerability(vuln: Vulnerability): void {
    const severityColor = this.getSeverityColor(vuln.severity);
    const severityLabel = vuln.severity.toUpperCase().padEnd(8);

    console.log(this.color(severityLabel, severityColor) + ` ${vuln.type}`);
    console.log(this.color(`  ${vuln.file}:${vuln.line}`, 'dim'));
    console.log(this.color(`  ${vuln.description}\n`, 'reset'));
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
