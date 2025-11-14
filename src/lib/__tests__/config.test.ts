import { ConfigManager } from '../config';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

jest.mock('fs');
jest.mock('os');

describe('ConfigManager', () => {
  const mockHomeDir = '/mock/home';
  const mockConfigDir = path.join(mockHomeDir, '.gitguard');
  const mockConfigFile = path.join(mockConfigDir, 'config.json');

  beforeEach(() => {
    jest.clearAllMocks();
    (os.homedir as jest.Mock).mockReturnValue(mockHomeDir);
  });

  describe('Constructor and Initialization', () => {
    it('should create config directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

      new ConfigManager();

      expect(fs.mkdirSync).toHaveBeenCalledWith(mockConfigDir, {
        recursive: true,
        mode: 0o700,
      });
    });

    it('should not create config directory if it already exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ apiUrl: 'https://www.gitguard.net' }));

      new ConfigManager();

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should load existing config from file', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          apiUrl: 'https://www.gitguard.net',
          apiToken: 'test-token',
          email: 'test@example.com',
        })
      );

      const config = new ConfigManager();

      expect(config.get()).toEqual({
        apiUrl: 'https://www.gitguard.net',
        apiToken: 'test-token',
        email: 'test@example.com',
      });
    });

    it('should use default config if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const config = new ConfigManager();

      expect(config.get().apiUrl).toBe('https://www.gitguard.net');
    });

    it('should use default config if file is malformed', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json{');

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const config = new ConfigManager();

      expect(config.get().apiUrl).toBe('https://www.gitguard.net');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Warning: Failed to parse config file, using defaults'
      );

      consoleWarnSpy.mockRestore();
    });

    it('should respect GITGUARD_API_URL environment variable', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      process.env.GITGUARD_API_URL = 'http://localhost:3100';

      const config = new ConfigManager();

      expect(config.get().apiUrl).toBe('http://localhost:3100');

      delete process.env.GITGUARD_API_URL;
    });
  });

  describe('get()', () => {
    it('should return current config', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          apiUrl: 'https://www.gitguard.net',
          apiToken: 'my-token',
        })
      );

      const config = new ConfigManager();
      const currentConfig = config.get();

      expect(currentConfig.apiUrl).toBe('https://www.gitguard.net');
      expect(currentConfig.apiToken).toBe('my-token');
    });
  });

  describe('set()', () => {
    it('should update config and save to file', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const config = new ConfigManager();
      config.set({ apiToken: 'new-token', email: 'user@example.com' });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockConfigFile,
        expect.stringContaining('"apiToken": "new-token"'),
        { mode: 0o600 }
      );
    });

    it('should merge updates with existing config', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          apiUrl: 'https://www.gitguard.net',
          apiToken: 'old-token',
        })
      );
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const config = new ConfigManager();
      config.set({ email: 'test@example.com' });

      const updatedConfig = config.get();
      expect(updatedConfig.apiToken).toBe('old-token');
      expect(updatedConfig.email).toBe('test@example.com');
    });

    it('should save config with restricted permissions (0o600)', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const config = new ConfigManager();
      config.set({ apiToken: 'secure-token' });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockConfigFile,
        expect.any(String),
        { mode: 0o600 }
      );
    });
  });

  describe('getApiToken()', () => {
    it('should return API token if set', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          apiUrl: 'https://www.gitguard.net',
          apiToken: 'my-api-token',
        })
      );

      const config = new ConfigManager();
      expect(config.getApiToken()).toBe('my-api-token');
    });

    it('should return undefined if no API token', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const config = new ConfigManager();
      expect(config.getApiToken()).toBeUndefined();
    });
  });

  describe('setApiToken()', () => {
    it('should set API token and email', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const config = new ConfigManager();
      config.setApiToken('test-token-123', 'user@example.com');

      expect(config.getApiToken()).toBe('test-token-123');
      expect(config.get().email).toBe('user@example.com');
    });
  });

  describe('setUserProfile()', () => {
    it('should set subscription and preferences', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const config = new ConfigManager();
      config.setUserProfile('pro', {
        aiScanEnabled: true,
        dependencyScanEnabled: true,
        secretScanEnabled: false,
      });

      expect(config.getSubscription()).toBe('pro');
      expect(config.getPreferences().aiScanEnabled).toBe(true);
      expect(config.getPreferences().dependencyScanEnabled).toBe(true);
      expect(config.getPreferences().secretScanEnabled).toBe(false);
    });

    it('should handle missing preference fields', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const config = new ConfigManager();
      config.setUserProfile('premier', {});

      expect(config.getPreferences().aiScanEnabled).toBe(false);
      expect(config.getPreferences().dependencyScanEnabled).toBe(false);
      expect(config.getPreferences().secretScanEnabled).toBe(false);
    });
  });

  describe('getSubscription()', () => {
    it('should return subscription tier', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          apiUrl: 'https://www.gitguard.net',
          subscription: 'premier',
        })
      );

      const config = new ConfigManager();
      expect(config.getSubscription()).toBe('premier');
    });

    it('should return undefined if no subscription set', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const config = new ConfigManager();
      expect(config.getSubscription()).toBeUndefined();
    });
  });

  describe('getPreferences()', () => {
    it('should return user preferences', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          apiUrl: 'https://www.gitguard.net',
          preferences: {
            aiScanEnabled: true,
            dependencyScanEnabled: false,
            secretScanEnabled: true,
          },
        })
      );

      const config = new ConfigManager();
      const prefs = config.getPreferences();

      expect(prefs.aiScanEnabled).toBe(true);
      expect(prefs.dependencyScanEnabled).toBe(false);
      expect(prefs.secretScanEnabled).toBe(true);
    });

    it('should return default preferences if not set', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const config = new ConfigManager();
      const prefs = config.getPreferences();

      expect(prefs.aiScanEnabled).toBe(false);
      expect(prefs.dependencyScanEnabled).toBe(false);
      expect(prefs.secretScanEnabled).toBe(false);
    });
  });

  describe('clearAuth()', () => {
    it('should clear authentication data', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          apiUrl: 'https://www.gitguard.net',
          apiToken: 'my-token',
          email: 'user@example.com',
          subscription: 'pro',
          preferences: { aiScanEnabled: true },
        })
      );
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const config = new ConfigManager();
      config.clearAuth();

      expect(config.getApiToken()).toBeUndefined();
      expect(config.get().email).toBeUndefined();
      expect(config.getSubscription()).toBeUndefined();
      expect(config.get().preferences).toBeUndefined();
    });

    it('should preserve apiUrl when clearing auth', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          apiUrl: 'https://staging.gitguard.net',
          apiToken: 'my-token',
        })
      );
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const config = new ConfigManager();
      config.clearAuth();

      expect(config.get().apiUrl).toBe('https://staging.gitguard.net');
    });
  });

  describe('isAuthenticated()', () => {
    it('should return true if API token is set', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          apiUrl: 'https://www.gitguard.net',
          apiToken: 'my-token',
        })
      );

      const config = new ConfigManager();
      expect(config.isAuthenticated()).toBe(true);
    });

    it('should return false if no API token', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const config = new ConfigManager();
      expect(config.isAuthenticated()).toBe(false);
    });

    it('should return false after clearAuth', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          apiUrl: 'https://www.gitguard.net',
          apiToken: 'my-token',
        })
      );
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const config = new ConfigManager();
      expect(config.isAuthenticated()).toBe(true);

      config.clearAuth();
      expect(config.isAuthenticated()).toBe(false);
    });
  });

  describe('getConfigPath()', () => {
    it('should return config file path', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const config = new ConfigManager();
      const configPath = config.getConfigPath();

      expect(configPath).toBe(mockConfigFile);
      expect(configPath).toContain('.gitguard');
      expect(configPath).toContain('config.json');
    });
  });

  describe('Security', () => {
    it('should create config directory with restricted permissions (0o700)', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

      new ConfigManager();

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ mode: 0o700 })
      );
    });

    it('should save config file with restricted permissions (0o600)', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const config = new ConfigManager();
      config.set({ apiToken: 'secret-token' });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ mode: 0o600 })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty config updates', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const config = new ConfigManager();
      const originalConfig = config.get();

      config.set({});

      expect(config.get()).toEqual(originalConfig);
    });

    it('should handle config file read errors gracefully', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const config = new ConfigManager();

      expect(config.get().apiUrl).toBe('https://www.gitguard.net');
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle multiple config updates', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const config = new ConfigManager();

      config.set({ apiToken: 'token1' });
      config.set({ email: 'user@example.com' });
      config.set({ subscription: 'pro' });

      const finalConfig = config.get();
      expect(finalConfig.apiToken).toBe('token1');
      expect(finalConfig.email).toBe('user@example.com');
      expect(finalConfig.subscription).toBe('pro');
    });
  });
});
