import fs from 'fs';
import path from 'path';

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
  async collectFiles(dir: string, maxFiles: number = 100): Promise<Record<string, string>> {
    const files: Record<string, string> = {};
    let count = 0;

    const walk = (currentDir: string): void => {
      if (count >= maxFiles) return;

      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (count >= maxFiles) break;

        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          if (!EXCLUDE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (CODE_EXTENSIONS.includes(ext)) {
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const relativePath = path.relative(dir, fullPath);
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
}
