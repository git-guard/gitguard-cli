import { FileScanner } from '../file-scanner';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('ignore');

describe('FileScanner', () => {
  let scanner: FileScanner;

  beforeEach(() => {
    scanner = new FileScanner();
    jest.clearAllMocks();
  });

  describe('collectFiles', () => {
    it('should collect TypeScript files', async () => {
      const mockDir = '/test/project';

      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'index.ts', isDirectory: () => false, isFile: () => true },
        { name: 'app.tsx', isDirectory: () => false, isFile: () => true },
      ]);
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('index.ts')) return 'console.log("index")';
        if (filePath.endsWith('app.tsx')) return 'export const App = () => {}';
        return '';
      });

      const files = await scanner.collectFiles(mockDir);

      expect(Object.keys(files)).toContain('index.ts');
      expect(Object.keys(files)).toContain('app.tsx');
      expect(files['index.ts']).toContain('console.log');
    });

    it('should collect JavaScript files', async () => {
      const mockDir = '/test/project';

      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'index.js', isDirectory: () => false, isFile: () => true },
        { name: 'utils.mjs', isDirectory: () => false, isFile: () => true },
        { name: 'config.cjs', isDirectory: () => false, isFile: () => true },
      ]);
      (fs.readFileSync as jest.Mock).mockReturnValue('const test = true;');

      const files = await scanner.collectFiles(mockDir);

      expect(Object.keys(files).length).toBe(3);
      expect(Object.keys(files)).toContain('index.js');
      expect(Object.keys(files)).toContain('utils.mjs');
      expect(Object.keys(files)).toContain('config.cjs');
    });

    it('should collect Python files', async () => {
      const mockDir = '/test/project';

      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'main.py', isDirectory: () => false, isFile: () => true },
      ]);
      (fs.readFileSync as jest.Mock).mockReturnValue('print("hello")');

      const files = await scanner.collectFiles(mockDir);

      expect(Object.keys(files)).toContain('main.py');
    });

    it('should exclude node_modules directory', async () => {
      const mockDir = '/test/project';

      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readdirSync as jest.Mock).mockImplementation((dir: string) => {
        if (dir === mockDir) {
          return [
            { name: 'index.js', isDirectory: () => false, isFile: () => true },
            { name: 'node_modules', isDirectory: () => true, isFile: () => false },
          ];
        }
        return [];
      });
      (fs.readFileSync as jest.Mock).mockReturnValue('const test = true;');

      const files = await scanner.collectFiles(mockDir);

      expect(Object.keys(files)).toContain('index.js');
      expect(Object.keys(files).some(f => f.includes('node_modules'))).toBe(false);
    });

    it('should exclude build directories', async () => {
      const mockDir = '/test/project';

      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readdirSync as jest.Mock).mockImplementation((dir: string) => {
        if (dir === mockDir) {
          return [
            { name: 'src.ts', isDirectory: () => false, isFile: () => true },
            { name: 'dist', isDirectory: () => true, isFile: () => false },
            { name: 'build', isDirectory: () => true, isFile: () => false },
            { name: '.next', isDirectory: () => true, isFile: () => false },
          ];
        }
        return [];
      });
      (fs.readFileSync as jest.Mock).mockReturnValue('const test = true;');

      const files = await scanner.collectFiles(mockDir);

      expect(Object.keys(files)).toContain('src.ts');
      expect(Object.keys(files).some(f => f.includes('/dist/'))).toBe(false);
      expect(Object.keys(files).some(f => f.includes('/build/'))).toBe(false);
      expect(Object.keys(files).some(f => f.includes('/.next/'))).toBe(false);
    });

    it('should exclude hidden directories', async () => {
      const mockDir = '/test/project';

      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readdirSync as jest.Mock).mockImplementation((dir: string) => {
        if (dir === mockDir) {
          return [
            { name: 'index.ts', isDirectory: () => false, isFile: () => true },
            { name: '.hidden', isDirectory: () => true, isFile: () => false },
          ];
        }
        return [];
      });
      (fs.readFileSync as jest.Mock).mockReturnValue('const test = true;');

      const files = await scanner.collectFiles(mockDir);

      expect(Object.keys(files)).toContain('index.ts');
      expect(Object.keys(files).some(f => f.includes('.hidden'))).toBe(false);
    });

    it('should respect maxFiles limit', async () => {
      const mockDir = '/test/project';

      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'file1.ts', isDirectory: () => false, isFile: () => true },
        { name: 'file2.ts', isDirectory: () => false, isFile: () => true },
        { name: 'file3.ts', isDirectory: () => false, isFile: () => true },
      ]);
      (fs.readFileSync as jest.Mock).mockReturnValue('const test = true;');

      const files = await scanner.collectFiles(mockDir, 2);

      expect(Object.keys(files).length).toBe(2);
    });

    it('should ignore unsupported file types', async () => {
      const mockDir = '/test/project';

      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'index.ts', isDirectory: () => false, isFile: () => true },
        { name: 'image.png', isDirectory: () => false, isFile: () => true },
        { name: 'doc.pdf', isDirectory: () => false, isFile: () => true },
        { name: 'README.md', isDirectory: () => false, isFile: () => true },
      ]);
      (fs.readFileSync as jest.Mock).mockReturnValue('const test = true;');

      const files = await scanner.collectFiles(mockDir);

      expect(Object.keys(files).length).toBe(1);
      expect(Object.keys(files)).toContain('index.ts');
    });

    it('should skip files that cannot be read', async () => {
      const mockDir = '/test/project';

      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'readable.ts', isDirectory: () => false, isFile: () => true },
        { name: 'unreadable.ts', isDirectory: () => false, isFile: () => true },
      ]);
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('readable.ts')) return 'const test = true;';
        throw new Error('Permission denied');
      });

      const files = await scanner.collectFiles(mockDir);

      expect(Object.keys(files).length).toBe(1);
      expect(Object.keys(files)).toContain('readable.ts');
    });

    it('should walk nested directories', async () => {
      const mockDir = '/test/project';

      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readdirSync as jest.Mock).mockImplementation((dir: string) => {
        if (dir === mockDir) {
          return [
            { name: 'index.ts', isDirectory: () => false, isFile: () => true },
            { name: 'src', isDirectory: () => true, isFile: () => false },
          ];
        }
        if (dir.endsWith('src')) {
          return [
            { name: 'app.ts', isDirectory: () => false, isFile: () => true },
          ];
        }
        return [];
      });
      (fs.readFileSync as jest.Mock).mockReturnValue('const test = true;');

      const files = await scanner.collectFiles(mockDir);

      expect(Object.keys(files).length).toBe(2);
      expect(Object.keys(files)).toContain('index.ts');
      expect(Object.keys(files).some(f => f.includes('app.ts'))).toBe(true);
    });

    it('should collect various programming language files', async () => {
      const mockDir = '/test/project';

      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'App.java', isDirectory: () => false, isFile: () => true },
        { name: 'main.go', isDirectory: () => false, isFile: () => true },
        { name: 'lib.rs', isDirectory: () => false, isFile: () => true },
        { name: 'index.php', isDirectory: () => false, isFile: () => true },
        { name: 'controller.rb', isDirectory: () => false, isFile: () => true },
        { name: 'App.swift', isDirectory: () => false, isFile: () => true },
        { name: 'Main.kt', isDirectory: () => false, isFile: () => true },
      ]);
      (fs.readFileSync as jest.Mock).mockReturnValue('code content');

      const files = await scanner.collectFiles(mockDir);

      expect(Object.keys(files).length).toBe(7);
      expect(Object.keys(files)).toContain('App.java');
      expect(Object.keys(files)).toContain('main.go');
      expect(Object.keys(files)).toContain('lib.rs');
      expect(Object.keys(files)).toContain('index.php');
      expect(Object.keys(files)).toContain('controller.rb');
      expect(Object.keys(files)).toContain('App.swift');
      expect(Object.keys(files)).toContain('Main.kt');
    });
  });

  describe('scanSingleFile', () => {
    it('should scan a single TypeScript file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });
      (fs.readFileSync as jest.Mock).mockReturnValue('const test = true;');

      const files = await scanner.scanSingleFile('/test/file.ts');

      expect(Object.keys(files)).toContain('file.ts');
      expect(files['file.ts']).toBe('const test = true;');
    });

    it('should throw error for non-existent file', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(scanner.scanSingleFile('/test/missing.ts')).rejects.toThrow(
        'File not found: /test/missing.ts'
      );
    });

    it('should throw error for directory path', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => false });

      await expect(scanner.scanSingleFile('/test/directory')).rejects.toThrow(
        'Path is not a file'
      );
    });

    it('should throw error for unsupported file type', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });

      await expect(scanner.scanSingleFile('/test/image.png')).rejects.toThrow(
        'Unsupported file type: .png'
      );
    });

    it('should throw error when file cannot be read', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await expect(scanner.scanSingleFile('/test/file.ts')).rejects.toThrow(
        'Failed to read file: Permission denied'
      );
    });

    it('should handle files with various extensions', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ isFile: () => true });
      (fs.readFileSync as jest.Mock).mockReturnValue('code');

      const files1 = await scanner.scanSingleFile('/test/app.py');
      expect(Object.keys(files1)).toContain('app.py');

      const files2 = await scanner.scanSingleFile('/test/main.go');
      expect(Object.keys(files2)).toContain('main.go');

      const files3 = await scanner.scanSingleFile('/test/lib.rs');
      expect(Object.keys(files3)).toContain('lib.rs');
    });
  });
});
