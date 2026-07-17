import { execSync, spawn } from 'child_process';
import { platform } from 'os';
import { Vulnerability } from '../types';

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.rb': 'ruby',
  '.php': 'php',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cs': 'csharp',
  '.scala': 'scala',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.json': 'json',
  '.tf': 'hcl',
  '.dockerfile': 'dockerfile',
};

export function getLanguageFromExtension(filePath: string): string {
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return EXTENSION_LANGUAGE_MAP[ext] || 'text';
}

function commandExists(cmd: string): boolean {
  try {
    const check = platform() === 'win32' ? 'where' : 'which';
    execSync(`${check} ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function detectEditor(): string | null {
  const envEditor = process.env.GITGUARD_EDITOR;
  if (envEditor) {
    const normalized = envEditor.toLowerCase().trim();
    if (normalized === 'cursor' || normalized === 'code') {
      return normalized;
    }
  }

  if (commandExists('cursor')) return 'cursor';
  if (commandExists('code')) return 'code';

  return null;
}

export function openFileInEditor(editor: string, filePath: string, line: number): void {
  try {
    const child = spawn(editor, ['--goto', `${filePath}:${line}`], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  } catch {
    // Silently fail - editor opening is best-effort
  }
}

export function copyToClipboard(text: string): boolean {
  try {
    const os = platform();
    if (os === 'darwin') {
      execSync('pbcopy', { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
    } else if (os === 'win32') {
      execSync('clip', { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
    } else {
      try {
        execSync('xclip -selection clipboard', { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
      } catch {
        execSync('xsel --clipboard --input', { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function generateFixPrompt(vuln: Vulnerability): string {
  const lang = getLanguageFromExtension(vuln.file);
  const severity = vuln.severity.toUpperCase();

  let prompt = `Fix the following ${severity} security vulnerability in my codebase:\n\n`;
  prompt += `Type: ${vuln.type}\n`;
  prompt += `File: ${vuln.file}\n`;
  prompt += `Line: ${vuln.line}\n`;

  prompt += `\nDescription:\n${vuln.description}\n`;

  if (vuln.code) {
    prompt += `\nVulnerable code:\n\`\`\`${lang}\n${vuln.code}\n\`\`\`\n`;
  }

  if (vuln.remediation) {
    prompt += `\nRecommended fix:\n${vuln.remediation}\n`;
  }

  if (vuln.aiRemediation) {
    prompt += `\nAI-suggested approach:\n${vuln.aiRemediation}\n`;
  }

  prompt += '\nPlease apply the minimum change needed to fix this vulnerability. Preserve the existing code style and only modify what is necessary for the security fix.';

  return prompt;
}
