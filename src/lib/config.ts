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

  /**
   * Merge saved preferences with tier-appropriate defaults so flags are never "stuck off"
   * because the local file omitted `preferences` or only partially synced.
   */
  public getPreferences(): {
    aiScanEnabled: boolean;
    dependencyScanEnabled: boolean;
    secretScanEnabled: boolean;
    cvssEnabled: boolean;
    apiSecurityEnabled: boolean;
    validationEnabled: boolean;
  } {
    const tier = this.config.subscription ?? 'free';
    const isPremierLike = tier === 'premier' || (tier as string) === 'enterprise';
    const base =
      isPremierLike
        ? {
            aiScanEnabled: true,
            dependencyScanEnabled: true,
            secretScanEnabled: true,
            cvssEnabled: true,
            apiSecurityEnabled: true,
            validationEnabled: true,
          }
        : tier === 'pro'
          ? {
              aiScanEnabled: true,
              dependencyScanEnabled: false,
              secretScanEnabled: false,
              cvssEnabled: true,
              apiSecurityEnabled: false,
              validationEnabled: true,
            }
          : {
              aiScanEnabled: false,
              dependencyScanEnabled: false,
              secretScanEnabled: false,
              cvssEnabled: false,
              apiSecurityEnabled: false,
              validationEnabled: false,
            };
    return { ...base, ...(this.config.preferences ?? {}) };
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
