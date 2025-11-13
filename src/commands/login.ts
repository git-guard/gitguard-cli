import open from 'open';
import readline from 'readline';
import { ConfigManager } from '../lib/config';
import { APIClient } from '../lib/api-client';
import { Reporter } from '../lib/reporter';

const POLL_INTERVAL = 2000;
const MAX_POLL_TIME = 600000;

export async function loginCommand(): Promise<void> {
  const config = new ConfigManager();
  const reporter = new Reporter(config);

  if (process.env.GITGUARD_API_URL) {
    config.set({ apiUrl: process.env.GITGUARD_API_URL });
    reporter.info(`Using API URL: ${process.env.GITGUARD_API_URL}`);
  }

  const apiClient = new APIClient(config);

  try {
    reporter.info('Initializing authentication...');

    const { requestCode, authUrl } = await apiClient.requestAuth();

    reporter.info('\nIMPORTANT: You must be logged into GitGuard in your browser first!');
    reporter.info('If you don\'t have an account, visit the web app to sign up.\n');
    reporter.info('Please authenticate in your browser.');
    reporter.info(`Opening: ${authUrl}\n`);
    reporter.info('If the browser does not open automatically, please visit the URL above.\n');

    await open(authUrl);

    reporter.info('Waiting for authentication...');

    let token: string;

    try {
      token = await pollForToken(apiClient, requestCode, reporter);
    } catch (pollError: any) {
      if (pollError.message === 'Authentication timeout' || pollError.message === 'Authentication expired') {
        reporter.warning('\nAutomatic authentication failed.');
        reporter.info('If you see your token in the browser, you can paste it below:\n');

        const manualToken = await promptForToken();

        if (manualToken && manualToken.startsWith('gg_')) {
          token = manualToken;
          reporter.info('Token received manually.');
        } else {
          throw pollError;
        }
      } else {
        throw pollError;
      }
    }

    config.setApiToken(token, 'temp@email.com');

    const profile = await apiClient.getProfile();

    config.setApiToken(token, profile.email);
    config.setUserProfile(profile.subscription, profile.preferences);

    reporter.success(`\nSuccessfully logged in as ${profile.email}`);
    reporter.info(`Subscription: ${profile.subscription}`);
    reporter.info(`Daily scans remaining: ${profile.limits.scansRemaining}/${profile.limits.dailyScans}`);

    if (profile.subscription !== 'free') {
      reporter.info('\nDefault scan features:');
      if (profile.preferences.aiScanEnabled && (profile.subscription === 'pro' || profile.subscription === 'premier')) {
        reporter.info('  ✓ AI-powered analysis enabled');
      }
      if (profile.preferences.dependencyScanEnabled && profile.subscription === 'premier') {
        reporter.info('  ✓ Dependency scanning enabled');
      }
      if (profile.preferences.secretScanEnabled && profile.subscription === 'premier') {
        reporter.info('  ✓ Secret detection enabled');
      }
      reporter.info('\nUse --no-ai, --no-dependencies, or --no-secrets to disable specific features.');
    }
  } catch (error: any) {
    if (error.message === 'Authentication timeout') {
      reporter.error('Authentication timed out. Please try again.');
    } else if (error.message === 'Authentication expired') {
      reporter.error('Authentication request expired. Please try again.');
    } else if (error.response?.data?.message) {
      reporter.error(error.response.data.message);
    } else {
      reporter.error('Login failed. Please try again.');
      if (error.message) {
        reporter.error(`Error: ${error.message}`);
      }
    }
    process.exit(1);
  }
}

async function pollForToken(
  apiClient: APIClient,
  requestCode: string,
  reporter: Reporter
): Promise<string> {
  const startTime = Date.now();
  let attempts = 0;

  while (Date.now() - startTime < MAX_POLL_TIME) {
    try {
      const result = await apiClient.pollAuth(requestCode);

      if (result.status === 'completed' && result.token) {
        return result.token;
      }

      if (result.status === 'expired') {
        throw new Error('Authentication expired');
      }

      attempts++;
      if (attempts % 5 === 0) {
        reporter.info('Still waiting for authentication...');
      }

      await sleep(POLL_INTERVAL);
    } catch (error: any) {
      if (error.response?.status === 410) {
        throw new Error('Authentication expired');
      }
      throw error;
    }
  }

  throw new Error('Authentication timeout');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function promptForToken(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Paste your token: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
