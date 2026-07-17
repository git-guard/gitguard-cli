import { ScanResponse, Vulnerability, Secret, Dependency, APISecurityFinding, ComplianceReport } from '../types';
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
    console.log(this.color('[OK] ', 'green') + message);
  }

  error(message: string): void {
    console.error(this.color('[FAIL] ', 'red') + message);
  }

  warning(message: string): void {
    console.warn(this.color('[WARN] ', 'yellow') + message);
  }

  info(message: string): void {
    console.log(this.color('[INFO] ', 'blue') + message);
  }

  reportScan(result: ScanResponse): void {
    const safe = result != null && typeof result === 'object' ? result : ({} as ScanResponse);
    const vulnerabilities: typeof safe.vulnerabilities = Array.isArray(safe.vulnerabilities) ? safe.vulnerabilities : [];
    const summary =
      safe.summary && typeof safe.summary === 'object'
        ? safe.summary
        : { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0 };

    console.log(this.color('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim'));
    console.log(this.color('  GitGuard Security Scan Results', 'bright'));
    console.log(this.color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'dim'));

    console.log(this.color(`Files scanned: ${safe.filesScanned ?? 0}`, 'dim'));
    if (safe.duration != null) {
      console.log(this.color(`Duration: ${(safe.duration / 1000).toFixed(2)}s`, 'dim'));
    }

    const hasAI = Array.isArray(vulnerabilities) && vulnerabilities.some((v: { aiRemediation?: string }) => !!v?.aiRemediation);
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

    const totalFindings = vulnerabilities.length +
                          (safe.secrets?.length || 0) +
                          (safe.dependencies?.length || 0);

    if (totalFindings === 0) {
      this.success('No security issues found');
      console.log(this.color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'dim'));
      return;
    }

    console.log(this.color(`Found ${vulnerabilities.length} issue(s):`, 'bright'));
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

    const sorted = this.sortBySeverity(vulnerabilities);

    for (const vuln of sorted.slice(0, 10)) {
      this.reportVulnerability(vuln);
    }

    if (vulnerabilities.length > 10) {
      console.log(
        this.color(
          `\n... and ${vulnerabilities.length - 10} more issue(s)\n`,
          'dim'
        )
      );
    }

    // Display secrets if found
    if (safe.secrets && safe.secrets.length > 0) {
      console.log();
      console.log(this.color(`Found ${safe.secrets.length} secret(s):`, 'bright'));
      for (const secret of safe.secrets.slice(0, 5)) {
        this.reportSecret(secret);
      }
      if (safe.secrets.length > 5) {
        console.log(this.color(`... and ${safe.secrets.length - 5} more secret(s)\n`, 'dim'));
      }
    }

    // Display dependency issues if found
    if (safe.dependencies && safe.dependencies.length > 0) {
      console.log();

      // Separate by type for clearer display
      const cveVulns = safe.dependencies.filter((d: any) => d.type === 'vulnerability' || d.cve);
      const outdatedPkgs = safe.dependencies.filter((d: any) => d.type === 'outdated');
      const suspiciousPkgs = safe.dependencies.filter((d: any) =>
        d.type === 'typosquatting' || d.type === 'malicious' || d.type === 'dependency-confusion'
      );

      // Show CVE vulnerabilities (these affect score)
      if (cveVulns.length > 0) {
        console.log(this.color(`Found ${cveVulns.length} package(s) with known vulnerabilities:`, 'red'));
        for (const dep of cveVulns.slice(0, 5)) {
          this.reportDependency(dep);
        }
        if (cveVulns.length > 5) {
          console.log(this.color(`... and ${cveVulns.length - 5} more vulnerable package(s)\n`, 'dim'));
        }
      }

      // Show outdated packages (informational, doesn't affect score)
      if (outdatedPkgs.length > 0) {
        console.log();
        console.log(this.color(`${outdatedPkgs.length} outdated package(s) (informational):`, 'yellow'));
        console.log(this.color('  These do not affect your security score unless they have known CVEs.', 'dim'));
      }

      // Show suspicious packages (warnings)
      if (suspiciousPkgs.length > 0) {
        console.log();
        console.log(this.color(`${suspiciousPkgs.length} suspicious package(s) detected:`, 'yellow'));
        for (const dep of suspiciousPkgs.slice(0, 3)) {
          this.reportDependency(dep);
        }
        if (suspiciousPkgs.length > 3) {
          console.log(this.color(`... and ${suspiciousPkgs.length - 3} more suspicious package(s)\n`, 'dim'));
        }
      }
    }

    // Display API security findings if found
    if (safe.apiSecurityFindings && safe.apiSecurityFindings.length > 0) {
      console.log();
      console.log(this.color(`Found ${safe.apiSecurityFindings.length} API security issue(s):`, 'bright'));
      for (const finding of safe.apiSecurityFindings.slice(0, 5)) {
        this.reportAPISecurityFinding(finding);
      }
      if (safe.apiSecurityFindings.length > 5) {
        console.log(this.color(`... and ${safe.apiSecurityFindings.length - 5} more API issue(s)\n`, 'dim'));
      }
    }

    // Display compliance reports if available
    if (safe.complianceReports && safe.complianceReports.length > 0) {
      console.log();
      console.log(this.color('Compliance Reports:', 'bright'));
      for (const report of safe.complianceReports) {
        this.reportComplianceReport(report);
      }
    }

    // Display security score if available
    if (safe.securityScore) {
      console.log();
      console.log(this.color(`Security Score: ${safe.securityScore.grade} (${safe.securityScore.overall}/100)`, 'bright'));
    }

    console.log(this.color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'dim'));
    console.log(
      this.color(
        `View full results: ${this.config.get().apiUrl.replace('/api/v1', '')}/dashboard/scans?scan=${safe.scanId}`,
        'cyan'
      )
    );
    console.log(this.color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'dim'));
  }

  private reportSecret(secret: Secret): void {
    const severityColor = this.getSeverityColor(secret.severity);
    const severityLabel = secret.severity.toUpperCase().padEnd(8);

    console.log(this.color('┌─', 'dim') + this.color(` ${severityLabel}`, severityColor) + this.color('─────────────────────────────────────────', 'dim'));
    console.log(this.color('│ ', 'dim') + this.color(secret.type, 'bright'));
    console.log(this.color('│ ', 'dim') + this.color(`${secret.file}:${secret.line}`, 'cyan'));
    console.log(this.color('├─────────────────────────────────────────────────────', 'dim'));
    console.log(this.color('│ ', 'dim') + this.color('Description:', 'bright'));
    const descLines = this.wrapText(secret.description, 50);
    for (const line of descLines) {
      console.log(this.color('│ ', 'dim') + `  ${line}`);
    }

    if (secret.recommendation) {
      console.log(this.color('│ ', 'dim'));
      console.log(this.color('│ ', 'dim') + this.color('Recommendation:', 'bright'));
      const recLines = this.wrapText(secret.recommendation, 50);
      for (const line of recLines.slice(0, 3)) {
        console.log(this.color('│ ', 'dim') + `  ${line}`);
      }
    }

    console.log(this.color('└─────────────────────────────────────────────────────', 'dim'));
    console.log();
  }

  private reportDependency(dep: Dependency): void {
    const severityColor = this.getSeverityColor(dep.severity || 'medium');
    const severityLabel = (dep.severity || 'medium').toUpperCase().padEnd(8);

    console.log(this.color('┌─', 'dim') + this.color(` ${severityLabel}`, severityColor) + this.color('─────────────────────────────────────────', 'dim'));
    console.log(this.color('│ ', 'dim') + this.color(`${dep.package || 'unknown'}@${dep.version || 'unknown'}`, 'bright'));
    console.log(this.color('│ ', 'dim') + this.color(dep.type || 'vulnerability', 'cyan'));
    console.log(this.color('├─────────────────────────────────────────────────────', 'dim'));

    if (dep.vulnerability) {
      console.log(this.color('│ ', 'dim') + this.color('Vulnerability:', 'bright'));
      console.log(this.color('│ ', 'dim') + `  ${dep.vulnerability}`);
      if (dep.cve) {
        console.log(this.color('│ ', 'dim') + `  CVE: ${dep.cve}`);
      }
    }

    if (dep.latestVersion) {
      console.log(this.color('│ ', 'dim'));
      console.log(this.color('│ ', 'dim') + this.color('Latest version:', 'bright') + ` ${dep.latestVersion}`);
    }

    console.log(this.color('│ ', 'dim'));
    console.log(this.color('│ ', 'dim') + this.color('Description:', 'bright'));
    const descLines = this.wrapText(dep.description, 50);
    for (const line of descLines.slice(0, 3)) {
      console.log(this.color('│ ', 'dim') + `  ${line}`);
    }

    console.log(this.color('└─────────────────────────────────────────────────────', 'dim'));
    console.log();
  }

  private reportAPISecurityFinding(finding: APISecurityFinding): void {
    const severityColor = this.getSeverityColor(finding.severity);
    const severityLabel = finding.severity.toUpperCase().padEnd(8);

    console.log(this.color('┌─', 'dim') + this.color(` ${severityLabel}`, severityColor) + this.color('─────────────────────────────────────────', 'dim'));
    console.log(this.color('│ ', 'dim') + this.color(finding.type, 'bright'));
    if (finding.endpoint) {
      console.log(this.color('│ ', 'dim') + this.color(`${finding.method || 'ANY'} ${finding.endpoint}`, 'cyan'));
    }
    console.log(this.color('│ ', 'dim') + this.color(`${finding.file}:${finding.line}`, 'dim'));
    console.log(this.color('├─────────────────────────────────────────────────────', 'dim'));
    console.log(this.color('│ ', 'dim') + this.color('Description:', 'bright'));
    const descLines = this.wrapText(finding.description, 50);
    for (const line of descLines) {
      console.log(this.color('│ ', 'dim') + `  ${line}`);
    }

    if (finding.remediation) {
      console.log(this.color('│ ', 'dim'));
      console.log(this.color('│ ', 'dim') + this.color('Remediation:', 'bright'));
      const remLines = this.wrapText(finding.remediation, 50);
      for (const line of remLines.slice(0, 3)) {
        console.log(this.color('│ ', 'dim') + `  ${line}`);
      }
    }

    console.log(this.color('└─────────────────────────────────────────────────────', 'dim'));
    console.log();
  }

  private reportComplianceReport(report: ComplianceReport): void {
    const overallScore = report.overallScore ?? 0;
    const scoreColor = overallScore >= 80 ? 'green' : overallScore >= 50 ? 'yellow' : 'red';

    console.log(this.color('┌─────────────────────────────────────────────────────', 'dim'));
    console.log(this.color('│ ', 'dim') + this.color(`${(report.framework || 'Unknown').toUpperCase()} Compliance Report`, 'bright'));
    console.log(this.color('├─────────────────────────────────────────────────────', 'dim'));
    console.log(this.color('│ ', 'dim') + this.color('Score:', 'bright') + ` ${this.color(overallScore + '%', scoreColor)}`);
    console.log(this.color('│ ', 'dim') + this.color('Passed:', 'green') + ` ${report.passedControls} controls`);
    console.log(this.color('│ ', 'dim') + this.color('Failed:', 'red') + ` ${report.failedControls} controls`);
    console.log(this.color('├─────────────────────────────────────────────────────', 'dim'));

    const failedMappings = report.mappings.filter(m => m.status === 'fail').slice(0, 5);
    if (failedMappings.length > 0) {
      console.log(this.color('│ ', 'dim') + this.color('Failed Controls:', 'bright'));
      for (const mapping of failedMappings) {
        console.log(this.color('│ ', 'dim') + this.color(`  ${mapping.control}`, 'red'));
        console.log(this.color('│ ', 'dim') + `    ${mapping.description.substring(0, 45)}...`);
      }
    }

    console.log(this.color('└─────────────────────────────────────────────────────', 'dim'));
    console.log();
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
      console.log(this.color('│ ', 'dim') + this.color('AI Suggestion:', 'cyan'));
      const aiLines = this.wrapText(vuln.aiRemediation, 50);
      for (const line of aiLines.slice(0, 5)) {
        console.log(this.color('│ ', 'dim') + `  ${line}`);
      }
    }

    // CVSS score if available
    if (vuln.cvss && vuln.cvss.baseScore != null) {
      console.log(this.color('│ ', 'dim'));
      const cvssColor = this.getCVSSColor(vuln.cvss.baseScore);
      console.log(this.color('│ ', 'dim') + this.color('CVSS 3.1:', 'bright') + ` ${this.color(vuln.cvss.baseScore.toFixed(1), cvssColor)} (${vuln.cvss.baseSeverity || 'N/A'})`);
      if (vuln.cvss.vector) {
        console.log(this.color('│ ', 'dim') + this.color('Vector:', 'dim') + ` ${vuln.cvss.vector}`);
      }
      if (vuln.cvss.temporalScore != null) {
        console.log(this.color('│ ', 'dim') + this.color('Temporal:', 'dim') + ` ${vuln.cvss.temporalScore.toFixed(1)}`);
      }
    }

    // Validation result if available
    if (vuln.validation && vuln.validation.confidence != null) {
      console.log(this.color('│ ', 'dim'));
      const confidenceColor = vuln.validation.confidence >= 80 ? 'green' : vuln.validation.confidence >= 50 ? 'yellow' : 'red';
      console.log(this.color('│ ', 'dim') + this.color('Confidence:', 'bright') + ` ${this.color(vuln.validation.confidence + '%', confidenceColor)}`);
      if (vuln.validation.falsePositive) {
        console.log(this.color('│ ', 'dim') + this.color('Likely False Positive', 'yellow'));
      }
    }

    console.log(this.color('└─────────────────────────────────────────────────────', 'dim'));
    console.log();
  }

  reportFixAssistHeader(count: number): void {
    console.log();
    console.log(this.color(`Fix Assist: ${count} critical/high vulnerabilit${count === 1 ? 'y' : 'ies'} found`, 'bright'));
    console.log(this.color('──────────────────────────────────────────────────', 'dim'));
  }

  reportFixPrompt(
    vuln: Vulnerability,
    prompt: string,
    index: number,
    total: number,
    isFirst: boolean,
    editor: string | null,
    clipboardSuccess: boolean
  ): void {
    const severityColor = this.getSeverityColor(vuln.severity);
    const severityLabel = vuln.severity.toUpperCase();

    console.log();
    console.log(this.color(`[${index + 1}/${total}] `, 'bright') + this.color(severityLabel, severityColor) + this.color(` - ${vuln.type}`, 'bright'));
    console.log(this.color(`  ${vuln.file}:${vuln.line}`, 'cyan'));

    if (isFirst) {
      const parts: string[] = [];
      if (clipboardSuccess) {
        parts.push('Prompt copied to clipboard.');
      }
      if (editor) {
        const editorName = editor === 'cursor' ? 'Cursor' : 'VS Code';
        parts.push(`Opening in ${editorName}...`);
      }
      if (parts.length > 0) {
        console.log(this.color(`  ${parts.join(' ')}`, 'green'));
      } else {
        console.log(this.color('  Copy the prompt below and paste in your AI assistant:', 'dim'));
      }
    } else {
      console.log(this.color('  Copy the prompt below and paste in your AI assistant:', 'dim'));
    }

    console.log();
    console.log(this.color('  +- Fix Prompt ──────────────────────────────────────', 'dim'));
    const promptLines = prompt.split('\n');
    for (const line of promptLines) {
      console.log(this.color('  | ', 'dim') + line);
    }
    console.log(this.color('  +──────────────────────────────────────────────────', 'dim'));
  }

  private getCVSSColor(score: number): keyof typeof COLORS {
    if (score == null) return 'dim';
    if (score >= 9.0) return 'red';
    if (score >= 7.0) return 'red';
    if (score >= 4.0) return 'yellow';
    return 'green';
  }

  private wrapText(text: string | undefined | null, maxWidth: number): string[] {
    if (!text) return ['No description available'];
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
