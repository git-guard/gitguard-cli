import fs from 'fs';
import path from 'path';
import ignore from 'ignore';

const EXCLUDED_DIRECTORIES = [
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.git',
  'vendor',
  'bower_components',
  '.nuxt',
  '.vuepress',
  'out',
  'target',
  'bin',
  'obj',
  '__pycache__',
  '.pytest_cache',
  'venv',
  'env',
  '.env',
  'site-packages',
  '.composer',
];

const CODE_EXTENSIONS = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.py',
  '.pyw',
  '.java',
  '.kt',
  '.kts',
  '.scala',
  '.php',
  '.phtml',
  '.rb',
  '.erb',
  '.go',
  '.rs',
  '.c',
  '.cpp',
  '.cc',
  '.cxx',
  '.h',
  '.hpp',
  '.hxx',
  '.cs',
  '.swift',
  '.m',
  '.mm',
  '.sh',
  '.bash',
  '.zsh',
  '.ps1',
  '.psm1',
  '.sql',
  '.vue',
  '.svelte',
  '.html',
  '.htm',
  '.json',
  '.xml',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.conf',
  '.config',
  '.dart',
  '.r',
  '.pl',
  '.pm',
  '.lua',
  '.groovy',
  '.clj',
  '.cljs',
  '.tf',
  '.hcl',
  '.dockerfile',
];

const IAC_FILENAMES = [
  'dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'compose.yml',
  'compose.yaml',
];

function shouldIncludeFile(relativePath: string): boolean {
  const lowerPath = relativePath.toLowerCase();
  const pathSegments = lowerPath.split(/[/\\]/);
  if (pathSegments.some((seg) => EXCLUDED_DIRECTORIES.includes(seg))) {
    return false;
  }
  const ext = path.extname(relativePath).toLowerCase();
  if (CODE_EXTENSIONS.includes(ext)) return true;
  const filename = path.basename(lowerPath);
  if (IAC_FILENAMES.includes(filename)) return true;
  return false;
}

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
          if (EXCLUDED_DIRECTORIES.includes(entry.name)) {
            continue;
          }
          walk(fullPath);
        } else if (entry.isFile()) {
          if (shouldIncludeFile(relativePath)) {
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

    const relativePath = path.basename(filePath);
    if (!shouldIncludeFile(relativePath)) {
      throw new Error(
        `Unsupported file type. Supported extensions: ${CODE_EXTENSIONS.slice(0, 10).join(', ')}... and IaC files (Dockerfile, docker-compose.yml, etc.)`
      );
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
