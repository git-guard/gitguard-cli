import readline from 'readline';
import { ConfigManager } from '../lib/config';
import { APIClient } from '../lib/api-client';
import { Reporter } from '../lib/reporter';

export async function loginCommand(options: { email?: string; password?: string }): Promise<void> {
  const config = new ConfigManager();
  const reporter = new Reporter(config);
  const apiClient = new APIClient(config);

  try {
    let email = options.email;
    let password = options.password;

    if (!email) {
      email = await prompt('Email: ');
    }

    if (!password) {
      password = await prompt('Password: ', true);
    }

    reporter.info('Logging in...');

    const response = await apiClient.login(email, password);

    config.setApiToken(response.token, response.user.email);

    reporter.success(`Logged in as ${response.user.email}`);
    reporter.info(`Subscription: ${response.user.subscription}`);
  } catch (error: any) {
    if (error.response?.status === 401) {
      reporter.error('Invalid email or password');
    } else if (error.response?.data?.message) {
      reporter.error(error.response.data.message);
    } else {
      reporter.error('Login failed. Please try again.');
    }
    process.exit(1);
  }
}

function prompt(question: string, hidden: boolean = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (hidden) {
      const stdin = process.stdin as any;
      stdin.setRawMode && stdin.setRawMode(true);

      rl.question(question, (answer) => {
        stdin.setRawMode && stdin.setRawMode(false);
        rl.close();
        console.log();
        resolve(answer);
      });

      (rl as any)._writeToOutput = () => {
        (rl as any).output.write('');
      };
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}
