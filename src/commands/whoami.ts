import { ConfigManager } from '../lib/config';
import { APIClient } from '../lib/api-client';
import { Reporter } from '../lib/reporter';

export async function whoamiCommand(): Promise<void> {
  const config = new ConfigManager();
  const reporter = new Reporter(config);
  const apiClient = new APIClient(config);

  if (!config.isAuthenticated()) {
    reporter.warning('Not logged in');
    reporter.info('Run "gitguard login" to authenticate');
    return;
  }

  try {
    const profile = await apiClient.getProfile();

    console.log(`Email: ${profile.email}`);
    console.log(`Subscription: ${profile.subscription}`);
    console.log(`\nDaily Scans:`);
    console.log(`  Limit: ${profile.limits.dailyScans}`);
    console.log(`  Remaining: ${profile.limits.scansRemaining}`);
    console.log(`  Resets: ${new Date(profile.limits.resetsAt).toLocaleString()}`);
  } catch (error: any) {
    if (error.response?.status === 401) {
      reporter.error('Authentication expired. Please login again.');
      config.clearAuth();
    } else {
      reporter.error('Failed to fetch profile');
    }
    process.exit(1);
  }
}
