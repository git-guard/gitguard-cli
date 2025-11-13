import { ConfigManager } from '../lib/config';
import { APIClient } from '../lib/api-client';
import { Reporter } from '../lib/reporter';

export async function logoutCommand(): Promise<void> {
  const config = new ConfigManager();
  const reporter = new Reporter(config);
  const apiClient = new APIClient(config);

  if (!config.isAuthenticated()) {
    reporter.warning('Not logged in');
    return;
  }

  const email = config.get().email;

  try {
    await apiClient.revokeToken();
    reporter.info('Token revoked on server');
  } catch (error) {
    reporter.warning('Could not revoke token on server (continuing with local logout)');
  }

  config.clearAuth();

  reporter.success(`Logged out ${email || ''}`);
}
