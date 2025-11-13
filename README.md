# GitGuard CLI

🛡️ **Security scanning for developers** - Find vulnerabilities in your code before they reach production.

[![NPM Version](https://img.shields.io/npm/v/@gitguard/cli.svg)](https://www.npmjs.com/package/@gitguard/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔍 **Comprehensive Security Scanning** - Detect SQL injection, XSS, CSRF, and 50+ vulnerability patterns
- ⚡ **Fast & Easy** - Scan your code in seconds with a single command
- 🎯 **CI/CD Ready** - Perfect for pre-commit hooks and automated pipelines
- 🔐 **Privacy First** - Scans run securely through GitGuard's API with enterprise-grade security
- 📊 **Subscription Tiers** - Free tier for unlimited scans with unlimited AI analysis for Premier users

## Quick Start

```bash
# Install globally
npm install -g @gitguard/cli

# Login to GitGuard
gitguard login

# Scan your code
gitguard scan
```

## Installation

### NPM

```bash
npm install -g @gitguard/cli
```

### Yarn

```bash
yarn global add @gitguard/cli
```

## Usage

### Authentication

Before scanning, authenticate with your GitGuard account:

```bash
gitguard login
```

If you don't have an account, sign up at [gitguard.net](https://www.gitguard.net).

### Scanning Code

**The CLI automatically uses your web app preferences!** If you have AI scanning enabled in your GitGuard account, the CLI will use it by default.

Scan the current directory (uses your default settings):

```bash
gitguard scan
```

Scan a specific directory:

```bash
gitguard scan --dir ./src
```

Scan a single file:

```bash
gitguard scan --file ./src/api/auth.ts
```

**Override your default settings:**

Force enable AI analysis (even if disabled in your account):

```bash
gitguard scan --ai
```

Disable AI analysis (even if enabled in your account):

```bash
gitguard scan --no-ai
```

Enable/disable specific features:

```bash
gitguard scan --dependencies --no-ai  # Dependencies: yes, AI: no
gitguard scan --secrets --no-dependencies  # Secrets: yes, Dependencies: no
```

Output JSON for CI/CD:

```bash
gitguard scan --json
```

### Check Your Account

View your subscription and usage limits:

```bash
gitguard whoami
```

### Logout

```bash
gitguard logout
```

## Commands

| Command | Description |
|---------|-------------|
| `gitguard login` | Authenticate with GitGuard |
| `gitguard logout` | Log out of your account |
| `gitguard scan` | Scan code for vulnerabilities |
| `gitguard whoami` | Show current user and subscription info |
| `gitguard --help` | Show help |

## Scan Options

| Option | Description |
|--------|-------------|
| `-d, --dir <path>` | Directory to scan (default: current directory) |
| `-f, --file <path>` | Scan a specific file |
| `--ai` | Force enable AI-powered analysis |
| `--no-ai` | Disable AI-powered analysis |
| `--dependencies` | Force enable dependency scanning |
| `--no-dependencies` | Disable dependency scanning |
| `--secrets` | Force enable secret detection |
| `--no-secrets` | Disable secret detection |
| `--json` | Output results as JSON |

**Note:** By default, the CLI uses your web app preferences. Override flags (`--ai`, `--dependencies`, `--secrets`) force-enable features. Disable flags (`--no-ai`, `--no-dependencies`, `--no-secrets`) force-disable them.

## Subscription Tiers

### Free
- Unlimited scans per day
- Basic vulnerability detection (50+ patterns)
- JSON export for CI/CD
- Public repository scanning

### Pro
- Everything in Free
- **AI-powered vulnerability analysis** (enabled by default)
- Private repository scanning
- Priority support

### Premier
- Everything in Pro
- **All scan features enabled by default:**
  - AI-powered vulnerability analysis ✓
  - Dependency scanning ✓
  - Secret detection ✓
  - License compliance checking ✓
- Unlimited team members
- SLA guarantee

[View full pricing](https://www.gitguard.net/pricing)

## CI/CD Integration

### GitHub Actions

```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install GitGuard CLI
        run: npm install -g @gitguard/cli
      - name: Run security scan
        env:
          GITGUARD_API_TOKEN: ${{ secrets.GITGUARD_API_TOKEN }}
        run: |
          echo "$GITGUARD_API_TOKEN" | gitguard login --token
          gitguard scan --json > scan-results.json
      - name: Upload scan results
        uses: actions/upload-artifact@v3
        with:
          name: security-scan
          path: scan-results.json
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/sh

# Run GitGuard scan on staged files
gitguard scan --dir .

if [ $? -ne 0 ]; then
  echo "Security issues found! Fix them or use --no-verify to bypass."
  exit 1
fi
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

## Exit Codes

- `0` - No critical or high severity vulnerabilities found
- `1` - Critical or high severity vulnerabilities found, or scan error

Perfect for failing CI/CD pipelines on security issues!

## What Gets Scanned?

The CLI automatically scans these file types:

- **Web**: TypeScript, JavaScript (`.ts`, `.tsx`, `.js`, `.jsx`)
- **Backend**: Python (`.py`), Ruby (`.rb`), PHP (`.php`), Go (`.go`)
- **Mobile**: Swift (`.swift`), Kotlin (`.kt`)
- **Systems**: Rust (`.rs`), C/C++ (`.c`, `.cpp`), C# (`.cs`)
- **JVM**: Java (`.java`), Scala (`.scala`)

**Smart Exclusions:**
- Automatically respects your `.gitignore` file (if present)
- Falls back to excluding: `node_modules`, `dist`, `build`, `.git`, `.next`, `coverage`, `__pycache__`, `vendor`
- Skips hidden directories (unless explicitly included in your project)

## Detected Vulnerabilities

GitGuard detects 50+ vulnerability patterns including:

- **Injection Attacks**: SQL injection, Command injection, LDAP injection
- **XSS**: Reflected, Stored, DOM-based
- **Authentication**: Weak passwords, Insecure session management
- **Cryptography**: Weak algorithms, Hardcoded secrets
- **SSRF**: Server-side request forgery
- **Path Traversal**: Directory traversal attacks
- **CSRF**: Cross-site request forgery

... and many more!

## Examples

### Simple Scan

```bash
$ gitguard scan

✓ Collecting files...
ℹ Found 47 file(s), sending to GitGuard...

Scan Results
Files scanned: 47
Duration: 2.3s

Found 3 issue(s):
  HIGH: 2
  MEDIUM: 1

HIGH    SQL Injection
  src/api/users.ts:45
  Unsanitized user input in SQL query

HIGH    XSS Vulnerability
  components/Form.tsx:23
  Unescaped user input in HTML

MEDIUM  Weak Cryptography
  lib/crypto.ts:12
  Using MD5 for hashing (use bcrypt instead)
```

### CI/CD JSON Output

```bash
$ gitguard scan --json

{
  "scanId": "scan_abc123",
  "status": "completed",
  "filesScanned": 47,
  "duration": 2300,
  "summary": {
    "total": 3,
    "critical": 0,
    "high": 2,
    "medium": 1,
    "low": 0,
    "info": 0
  },
  "vulnerabilities": [...]
}
```

## Troubleshooting

### Authentication Failed

If you see "Authentication expired", log in again:

```bash
gitguard logout
gitguard login
```

### Rate Limit Exceeded

Free tier has generous limits. If you hit the limit:

1. Wait for the daily reset (shown in `gitguard whoami`)
2. Or upgrade to Pro/Premier for unlimited scans

### No Files Found

Make sure you're in a directory with code files. The CLI only scans supported file types (see "What Gets Scanned?" above).

## Privacy & Security

- Your code is transmitted securely over HTTPS
- Scans are processed server-side and deleted after completion
- No code is stored permanently
- API tokens are stored locally in `~/.gitguard/config.json` (chmod 600)
- View our [Privacy Policy](https://www.gitguard.net/privacy)

## Support

- 📖 [Documentation](https://github.com/git-guard)
- 🐛 [Report Issues](https://github.com/git-guard/gitguard-cli/issues)
- 📧 [Email Support](mailto:support@gitguard.net)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT © GitGuard

---

Made with ❤️ by the [Creative Lid LLC](https://www.creativelid.com) - [GitGuard](https://www.gitguard.net) team
