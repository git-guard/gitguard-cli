import * as fs from 'fs';
import * as path from 'path';

export class RepoDetector {
  static detectRepositoryName(dir: string): string {
    // Try to get name from .git/config
    const gitConfigName = this.getFromGitConfig(dir);
    if (gitConfigName) {
      return gitConfigName;
    }

    // Try to get name from package.json
    const packageJsonName = this.getFromPackageJson(dir);
    if (packageJsonName) {
      return packageJsonName;
    }

    // Fallback to directory name
    return path.basename(dir);
  }

  private static getFromGitConfig(dir: string): string | null {
    try {
      const gitConfigPath = path.join(dir, '.git', 'config');

      if (!fs.existsSync(gitConfigPath)) {
        return null;
      }

      const gitConfig = fs.readFileSync(gitConfigPath, 'utf-8');

      // Look for remote origin URL
      // Example: url = git@github.com:username/repo.git
      // or: url = https://github.com/username/repo.git
      const match = gitConfig.match(/\[remote "origin"\][\s\S]*?url\s*=\s*(.+)/i);

      if (match && match[1]) {
        const url = match[1].trim();

        // Extract repo name from git URL
        // git@github.com:username/repo.git -> repo
        // https://github.com/username/repo.git -> repo
        const repoMatch = url.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);

        if (repoMatch && repoMatch[1]) {
          return repoMatch[1]; // Returns "username/repo"
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private static getFromPackageJson(dir: string): string | null {
    try {
      const packageJsonPath = path.join(dir, 'package.json');

      if (!fs.existsSync(packageJsonPath)) {
        return null;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      // Prefer repository field if it exists
      if (packageJson.repository) {
        if (typeof packageJson.repository === 'string') {
          // Extract repo name from URL
          const match = packageJson.repository.match(/github\.com[:/](.+?)(?:\.git)?$/);
          if (match && match[1]) {
            return match[1];
          }
        } else if (packageJson.repository.url) {
          const match = packageJson.repository.url.match(/github\.com[:/](.+?)(?:\.git)?$/);
          if (match && match[1]) {
            return match[1];
          }
        }
      }

      // Otherwise use package name
      if (packageJson.name) {
        return packageJson.name;
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}
