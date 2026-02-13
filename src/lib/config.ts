import fs from 'fs';
import path from 'path';
import os from 'os';
import { Config } from '../types';

const CONFIG_DIR = path.join(os.homedir(), '.gitguard');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: Config = {
  apiUrl: process.env.GITGUARD_API_URL || 'https://www.gitguard.net',
};

export class ConfigManager {
  private config: Config;

  constructor() {
    this.ensureConfigDir();
    this.config = this.loadConfig();
  }

  private ensureConfigDir(): void {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }
  }

  private loadConfig(): Config {
    let config = DEFAULT_CONFIG;
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
        config = { ...DEFAULT_CONFIG, ...JSON.parse(content) };
      } catch (error) {
        console.warn('Warning: Failed to parse config file, using defaults');
      }
    }
    // Environment variable always takes precedence over saved config
    if (process.env.GITGUARD_API_URL) {
      config.apiUrl = process.env.GITGUARD_API_URL;
    }
    return config;
  }

  public get(): Config {
    return this.config;
  }

  public set(updates: Partial<Config>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  public getApiToken(): string | undefined {
    return this.config.apiToken;
  }

  public setApiToken(token: string, email: string): void {
    this.set({ apiToken: token, email });
  }

  public setUserProfile(subscription: string, preferences: any): void {
    this.set({
      subscription: subscription as 'free' | 'pro' | 'premier',
      preferences: {
        aiScanEnabled: preferences.aiScanEnabled || false,
        dependencyScanEnabled: preferences.dependencyScanEnabled || false,
        secretScanEnabled: preferences.secretScanEnabled || false,
        cvssEnabled: preferences.cvssEnabled || false,
        apiSecurityEnabled: preferences.apiSecurityEnabled || false,
        validationEnabled: preferences.validationEnabled || false,
      },
    });
  }

  public getSubscription(): string | undefined {
    return this.config.subscription;
  }

  public getPreferences(): any {
    return this.config.preferences || {
      aiScanEnabled: false,
      dependencyScanEnabled: false,
      secretScanEnabled: false,
      cvssEnabled: false,
      apiSecurityEnabled: false,
      validationEnabled: false,
    };
  }

  public clearAuth(): void {
    this.set({
      apiToken: undefined,
      email: undefined,
      subscription: undefined,
      preferences: undefined,
    });
  }

  public isAuthenticated(): boolean {
    return !!this.config.apiToken;
  }

  private saveConfig(): void {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), {
      mode: 0o600,
    });
  }

  public getConfigPath(): string {
    return CONFIG_FILE;
  }
}
