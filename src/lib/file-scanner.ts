import fs from 'fs';
import path from 'path';
import ignore from 'ignore';

const CODE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.rb',
  '.java',
  '.go',
  '.rs',
  '.php',
  '.c',
  '.cpp',
  '.cs',
  '.swift',
  '.kt',
  '.scala',
];

const EXCLUDE_DIRS = [
  'node_modules',
  'dist',
  'build',
  '.next',
  '.git',
  'coverage',
  '__pycache__',
  'vendor',
];

export class FileScanner {
  private loadGitignore(dir: string): ReturnType<typeof ignore> | null {
    const gitignorePath = path.join(dir, '.gitignore');

    if (!fs.existsSync(gitignorePath)) {
      return null;
    }

    try {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
      const ig = ignore();
      ig.add(gitignoreContent);

      // Always ignore .git directory
      ig.add('.git');

      return ig;
    } catch (error) {
      // If we can't read .gitignore, return null and fall back to EXCLUDE_DIRS
      return null;
    }
  }

  async collectFiles(dir: string, maxFiles: number = 1000): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    let count = 0;

    // Load .gitignore from the root directory being scanned
    const ig = this.loadGitignore(dir);

    const walk = (currentDir: string): void => {
      if (count >= maxFiles) return;

      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (count >= maxFiles) break;

        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(dir, fullPath);

        // Check .gitignore rules if available
        if (ig && ig.ignores(relativePath)) {
          continue;
        }

        if (entry.isDirectory()) {
          // Fallback to EXCLUDE_DIRS if no .gitignore
          if (!ig && EXCLUDE_DIRS.includes(entry.name)) {
            continue;
          }

          // Skip hidden directories (unless .gitignore says otherwise)
          if (!ig && entry.name.startsWith('.')) {
            continue;
          }

          walk(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (CODE_EXTENSIONS.includes(ext)) {
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              files[relativePath] = content;
              count++;
            } catch (error) {
              // Skip files that can't be read
            }
          }
        }
      }
    };

    walk(dir);
    return files;
  }

  async scanSingleFile(filePath: string): Promise<Record<string, string>> {
    const files: Record<string, string> = {};

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    if (!CODE_EXTENSIONS.includes(ext)) {
      throw new Error(`Unsupported file type: ${ext}. Supported: ${CODE_EXTENSIONS.join(', ')}`);
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      files[fileName] = content;
    } catch (error: any) {
      throw new Error(`Failed to read file: ${error.message}`);
    }

    return files;
  }
}
