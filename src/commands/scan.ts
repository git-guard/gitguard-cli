import { resolve } from 'path';
import { ConfigManager } from '../lib/config';
import { APIClient } from '../lib/api-client';
import { Reporter } from '../lib/reporter';
import { FileScanner } from '../lib/file-scanner';
import { RepoDetector } from '../lib/repo-detector';
import { detectEditor, openFileInEditor, copyToClipboard, generateFixPrompt } from '../lib/fix-assist';

interface ScanOptions {
  dir?: string;
  file?: string;
  ai?: boolean;
  noAi?: boolean;
  dependencies?: boolean;
  noDependencies?: boolean;
  secrets?: boolean;
  noSecrets?: boolean;
  cvss?: boolean;
  noCvss?: boolean;
  apiSecurity?: boolean;
  noApiSecurity?: boolean;
  validate?: boolean;
  noValidate?: boolean;
  compliance?: string;
  json?: boolean;
  fix?: boolean;
}

export async function scanCommand(options: ScanOptions): Promise<void> {
  const config = new ConfigManager();
  const reporter = new Reporter(config);
  const apiClient = new APIClient(config);

  if (!config.isAuthenticated()) {
    reporter.error('Not authenticated');
    reporter.info('Run "gitguard login" to authenticate');
    process.exit(1);
  }

  try {
    reporter.info('Collecting files...');

    const fileScanner = new FileScanner();
    const scanDir = options.file ? process.cwd() : (options.dir || process.cwd());
    let files: Record<string, string>;

    if (options.file) {
      files = await fileScanner.scanSingleFile(options.file);
    } else {
      files = await fileScanner.collectFiles(scanDir);
    }

    const fileCount = Object.keys(files).length;

    if (fileCount === 0) {
      reporter.warning('No code files found to scan');
      return;
    }

    // Detect repository name from .git/config or package.json
    const repository = RepoDetector.detectRepositoryName(scanDir);

    reporter.info(`Found ${fileCount} file(s), sending to GitGuard...`);

    const preferences = config.getPreferences();
    const subscription = config.getSubscription() || 'free';

    const includeAI = options.noAi ? false : (options.ai || preferences.aiScanEnabled);
    const includeDependencies = options.noDependencies ? false : (options.dependencies || preferences.dependencyScanEnabled);
    const includeSecrets = options.noSecrets ? false : (options.secrets || preferences.secretScanEnabled);
    const includeCVSS = options.noCvss ? false : (options.cvss || preferences.cvssEnabled);
    const includeAPISecurityScan = options.noApiSecurity ? false : (options.apiSecurity || preferences.apiSecurityEnabled);
    const validateVulnerabilities = options.noValidate ? false : (options.validate || preferences.validationEnabled);

    const complianceFramework = options.compliance as 'owasp' | 'pci-dss' | 'soc2' | 'hipaa' | 'cis' | 'all' | undefined;

    const result = await apiClient.scan(
      {
        files,
        repository,
        options: {
          // Always send real booleans so JSON never drops `undefined` keys (server would treat as off).
          includeAI: Boolean(includeAI),
          includeDependencies: Boolean(includeDependencies),
          includeSecrets: Boolean(includeSecrets),
          includeCVSS: Boolean(includeCVSS),
          includeAPISecurityScan: Boolean(includeAPISecurityScan),
          validateVulnerabilities: Boolean(validateVulnerabilities),
          complianceFramework,
        },
      },
      {
        onPollingStart: () => reporter.info('Scan running on server. Waiting for results...'),
      }
    );

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      try {
        reporter.reportScan(result);
      } catch (reportError: unknown) {
        const err = reportError as Error;
        reporter.error('Scan failed. Please try again.');
        if (err?.message) console.error(err.message);
        if (process.env.GITGUARD_DEBUG && err?.stack) console.error(err.stack);
        const fromRepo = __dirname.includes('gitguard-cli');
        if (!fromRepo) {
          reporter.info('Run the CLI from this repo after building: cd gitguard-cli && yarn build && GITGUARD_API_URL=http://localhost:3100 node dist/index.js scan');
        }
        process.exit(1);
      }

      if (options.fix) {
        const vulns = Array.isArray(result.vulnerabilities) ? result.vulnerabilities : [];
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        const fixableVulns = vulns
          .filter(v => v.severity === 'critical' || v.severity === 'high')
          .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        if (fixableVulns.length === 0) {
          reporter.info('No critical/high vulnerabilities to fix');
        } else {
          const editor = detectEditor();
          reporter.reportFixAssistHeader(fixableVulns.length);

          for (let i = 0; i < fixableVulns.length; i++) {
            const vuln = fixableVulns[i];
            const prompt = generateFixPrompt(vuln);
            const isFirst = i === 0;

            let clipboardSuccess = false;
            if (isFirst) {
              clipboardSuccess = copyToClipboard(prompt);
              if (editor) {
                const filePath = resolve(scanDir, vuln.file);
                openFileInEditor(editor, filePath, vuln.line);
              }
            }

            reporter.reportFixPrompt(vuln, prompt, i, fixableVulns.length, isFirst, editor, clipboardSuccess);
          }
        }
      }
    }

    const summary = result.summary && typeof result.summary === 'object' ? result.summary : { critical: 0, high: 0 };
    const hasCriticalOrHigh = (summary.critical ?? 0) > 0 || (summary.high ?? 0) > 0;

    if (hasCriticalOrHigh) {
      process.exit(1);
    }
  } catch (error: any) {
    if (error.response?.status === 401) {
      reporter.error('Authentication expired. Please login again.');
      config.clearAuth();
    } else if (error.response?.status === 429) {
      reporter.error('Rate limit exceeded');
      if (error.response.data?.message) {
        reporter.info(error.response.data.message);
      }
    } else if (error.response?.status === 503 || error.response?.data?.maintenance) {
      reporter.error('GitGuard is currently undergoing maintenance');
      reporter.info('Please try again later. Check https://status.gitguard.net for updates.');
    } else if (error.response?.status === 504) {
      reporter.error('Request timed out.');
      reporter.info('Large scans may still complete on the server. Check your dashboard for results.');
    } else if (typeof error?.message === 'string' && error.message.startsWith('Scan timed out')) {
      reporter.error('Scan did not finish within the CLI wait window.');
      reporter.info(error.message);
    } else if (error.response?.data?.message) {
      reporter.error(error.response.data.message);
    } else {
      reporter.error('Scan failed. Please try again.');
      if (error.message) {
        console.error(error.message);
      }
    }
    process.exit(1);
  }
}
