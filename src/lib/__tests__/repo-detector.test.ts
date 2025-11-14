import { RepoDetector } from '../repo-detector';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');

describe('RepoDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectRepositoryName', () => {
    it('should detect repo name from git config with SSH URL', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('.git/config');
      });

      (fs.readFileSync as jest.Mock).mockReturnValue(`
        [core]
          repositoryformatversion = 0
        [remote "origin"]
          url = git@github.com:username/my-repo.git
          fetch = +refs/heads/*:refs/remotes/origin/*
      `);

      const name = RepoDetector.detectRepositoryName('/test/project');
      expect(name).toBe('username/my-repo');
    });

    it('should detect repo name from git config with HTTPS URL', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('.git/config');
      });

      (fs.readFileSync as jest.Mock).mockReturnValue(`
        [remote "origin"]
          url = https://github.com/org/awesome-project.git
      `);

      const name = RepoDetector.detectRepositoryName('/test/project');
      expect(name).toBe('org/awesome-project');
    });

    it('should detect repo name from git config without .git extension', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('.git/config');
      });

      (fs.readFileSync as jest.Mock).mockReturnValue(`
        [remote "origin"]
          url = https://github.com/user/repo
      `);

      const name = RepoDetector.detectRepositoryName('/test/project');
      expect(name).toBe('user/repo');
    });

    it('should detect repo name from package.json name field', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('.git/config')) return false;
        if (filePath.includes('package.json')) return true;
        return false;
      });

      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          name: '@scope/package-name',
          version: '1.0.0',
        })
      );

      const name = RepoDetector.detectRepositoryName('/test/project');
      expect(name).toBe('@scope/package-name');
    });

    it('should detect repo name from package.json repository field', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('.git/config')) return false;
        if (filePath.includes('package.json')) return true;
        return false;
      });

      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          name: 'local-name',
          repository: 'github:username/real-repo',
        })
      );

      const name = RepoDetector.detectRepositoryName('/test/project');
      expect(name).toBe('local-name');
    });

    it('should detect repo name from package.json repository.url field', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('.git/config')) return false;
        if (filePath.includes('package.json')) return true;
        return false;
      });

      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          name: 'local-name',
          repository: {
            type: 'git',
            url: 'https://github.com/org/real-repo.git',
          },
        })
      );

      const name = RepoDetector.detectRepositoryName('/test/project');
      expect(name).toBe('org/real-repo');
    });

    it('should fallback to directory name when no git or package.json', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const name = RepoDetector.detectRepositoryName('/test/my-awesome-project');
      expect(name).toBe('my-awesome-project');
    });

    it('should fallback to directory name when git config is malformed', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('.git/config');
      });

      (fs.readFileSync as jest.Mock).mockReturnValue(`
        [core]
          repositoryformatversion = 0
        [remote "origin"]
          # No URL specified
      `);

      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('package.json')) return false;
        return true;
      });

      const name = RepoDetector.detectRepositoryName('/test/fallback-project');
      expect(name).toBe('fallback-project');
    });

    it('should fallback to directory name when package.json is malformed', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('.git/config')) return false;
        if (filePath.includes('package.json')) return true;
        return false;
      });

      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const name = RepoDetector.detectRepositoryName('/test/fallback-project');
      expect(name).toBe('fallback-project');
    });

    it('should handle git config read errors gracefully', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('.git/config');
      });

      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const name = RepoDetector.detectRepositoryName('/test/error-project');
      expect(name).toBe('error-project');
    });

    it('should prefer git config over package.json', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      let callCount = 0;
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('.git/config')) {
          return `
            [remote "origin"]
              url = git@github.com:user/git-repo.git
          `;
        }
        if (filePath.includes('package.json')) {
          return JSON.stringify({
            name: 'package-name',
          });
        }
        return '';
      });

      const name = RepoDetector.detectRepositoryName('/test/project');
      expect(name).toBe('user/git-repo');
    });

    it('should handle SSH URLs with different formats', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('.git/config');
      });

      (fs.readFileSync as jest.Mock).mockReturnValue(`
        [remote "origin"]
          url = ssh://git@github.com/username/repo.git
      `);

      const name = RepoDetector.detectRepositoryName('/test/project');
      expect(name).toBe('username/repo');
    });

    it('should handle repository URLs without github.com', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('.git/config')) return false;
        if (filePath.includes('package.json')) return true;
        return false;
      });

      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          name: 'my-package',
          repository: {
            url: 'https://gitlab.com/user/repo.git',
          },
        })
      );

      const name = RepoDetector.detectRepositoryName('/test/project');
      expect(name).toBe('my-package');
    });

    it('should handle paths with special characters', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const name = RepoDetector.detectRepositoryName('/test/my-project-2.0');
      expect(name).toBe('my-project-2.0');
    });

    it('should handle root directory path', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const name = RepoDetector.detectRepositoryName('/');
      // path.basename('/') returns '' which is expected
      expect(name).toBe('');
    });

    it('should extract repo name without .git suffix', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.includes('.git/config');
      });

      (fs.readFileSync as jest.Mock).mockReturnValue(`
        [remote "origin"]
          url = https://github.com/user/repo-name.git
      `);

      const name = RepoDetector.detectRepositoryName('/test/project');
      expect(name).toBe('user/repo-name');
    });

    it('should handle package.json with only name field', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('.git/config')) return false;
        if (filePath.includes('package.json')) return true;
        return false;
      });

      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          name: 'simple-package',
        })
      );

      const name = RepoDetector.detectRepositoryName('/test/project');
      expect(name).toBe('simple-package');
    });

    it('should handle package.json with scoped package name', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('.git/config')) return false;
        if (filePath.includes('package.json')) return true;
        return false;
      });

      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          name: '@myorg/my-awesome-lib',
        })
      );

      const name = RepoDetector.detectRepositoryName('/test/project');
      expect(name).toBe('@myorg/my-awesome-lib');
    });
  });
});
