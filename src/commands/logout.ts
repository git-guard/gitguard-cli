import { ConfigManager } from '../lib/config';
import { Reporter } from '../lib/reporter';

export async function logoutCommand(): Promise<void> {
  const config = new ConfigManager();
  const reporter = new Reporter(config);

  if (!config.isAuthenticated()) {
    reporter.warning('Not logged in');
    return;
  }

  const email = config.get().email;
  config.clearAuth();

  reporter.success(`Logged out ${email || ''}`);
}
