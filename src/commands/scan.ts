import { ConfigManager } from '../lib/config';
import { APIClient } from '../lib/api-client';
import { Reporter } from '../lib/reporter';
import { FileScanner } from '../lib/file-scanner';

interface ScanOptions {
  dir?: string;
  ai?: boolean;
  dependencies?: boolean;
  secrets?: boolean;
  json?: boolean;
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

  const scanDir = options.dir || process.cwd();

  try {
    reporter.info('Collecting files...');

    const fileScanner = new FileScanner();
    const files = await fileScanner.collectFiles(scanDir);

    const fileCount = Object.keys(files).length;

    if (fileCount === 0) {
      reporter.warning('No code files found to scan');
      return;
    }

    reporter.info(`Found ${fileCount} file(s), sending to GitGuard...`);

    const result = await apiClient.scan({
      files,
      options: {
        includeAI: options.ai,
        includeDependencies: options.dependencies,
        includeSecrets: options.secrets,
      },
    });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      reporter.reportScan(result);
    }

    const hasCriticalOrHigh = result.summary.critical > 0 || result.summary.high > 0;

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
