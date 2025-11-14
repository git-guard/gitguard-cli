# Contributing to GitGuard CLI

Thank you for your interest in contributing to GitGuard CLI! This document provides guidelines and instructions for contributing.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and professional in all interactions.

## Getting Started

### Prerequisites

- Node.js 16.x or later
- Yarn package manager (npm is not used in this project)
- Git
- A GitGuard account for testing (sign up at [gitguard.net](https://www.gitguard.net))

### Development Setup

1. Fork the repository on GitHub

2. Clone your fork:
```bash
git clone https://github.com/YOUR_USERNAME/gitguard-cli.git
cd gitguard-cli
```

3. Install dependencies:
```bash
yarn install
```

4. Build the project:
```bash
yarn build
```

5. Link the CLI globally for local testing:
```bash
yarn link
```

6. Test the CLI:
```bash
gitguard --help
```

### Development Workflow

**Run in development mode** (without building):
```bash
yarn dev
```

**Build the project**:
```bash
yarn build
```

**Test the CLI locally** (after linking):
```bash
gitguard scan --dir ./test-directory
```

**Unlink when done**:
```bash
yarn unlink
```

## Project Structure

```
gitguard-cli/
├── src/
│   ├── commands/       # CLI command implementations
│   │   ├── login.ts    # Authentication command
│   │   ├── logout.ts   # Logout command
│   │   ├── scan.ts     # Scan command
│   │   └── whoami.ts   # User info command
│   ├── lib/            # Shared utilities
│   │   ├── api-client.ts      # API communication
│   │   ├── config.ts          # Configuration management
│   │   ├── file-scanner.ts    # File collection
│   │   ├── repo-detector.ts   # Repository name detection
│   │   └── reporter.ts        # Output formatting
│   ├── types/          # TypeScript type definitions
│   └── index.ts        # Entry point
├── dist/               # Compiled JavaScript (generated)
├── package.json        # Package configuration
└── tsconfig.json       # TypeScript configuration
```

## Code Style Guidelines

### General Rules

- **Use TypeScript** for all code
- **Use Yarn**, never npm commands
- **No comments** unless absolutely necessary for clarity
- **Follow existing patterns** in the codebase
- **Keep functions small** and focused on a single responsibility

### TypeScript Conventions

- Use explicit types for function parameters and return values
- Prefer interfaces over types for object shapes
- Use `async/await` instead of promises with `.then()`
- Use meaningful variable names (avoid abbreviations)

### Commit Messages

Follow the **Conventional Commits** specification:

**Format:**
```
<type>: <description>

[optional body]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring (no functional changes)
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks (dependencies, build config)
- `style:` - Code formatting (no functional changes)

**Examples:**
```
feat: add support for scanning single files
fix: resolve authentication token expiration issue
docs: update README with new scan options
refactor: extract file filtering logic into separate module
```

**Rules:**
- **No emojis or icons** in commit messages
- **No "Co-Authored-By" tags** or AI attribution
- Keep the subject line under 72 characters
- Use imperative mood ("add feature" not "added feature")
- Be concise and descriptive

## Making Changes

### Creating a Branch

Create a feature branch from `main`:
```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/bug-description
```

### Making Commits

1. Make your changes
2. Build and test:
```bash
yarn build
gitguard scan --dir ./test-repo
```
3. Stage your changes:
```bash
git add .
```
4. Commit with a conventional commit message:
```bash
git commit -m "feat: add new scan option for license detection"
```

### Testing Your Changes

**Manual Testing:**
1. Link the CLI globally: `yarn link`
2. Test all affected commands:
   - `gitguard login`
   - `gitguard scan --dir ./test-directory`
   - `gitguard whoami`
   - `gitguard logout`
3. Verify output formatting and error handling
4. Test with different file types and directory structures

**Test Edge Cases:**
- Empty directories
- Directories with no code files
- Very large codebases
- Invalid authentication
- Network errors

## Submitting Changes

### Pull Request Process

1. **Push your branch** to your fork:
```bash
git push origin feat/your-feature-name
```

2. **Create a Pull Request** on GitHub:
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template

3. **PR Title**: Use conventional commit format
   ```
   feat: add support for custom ignore patterns
   ```

4. **PR Description**: Include:
   - What changed and why
   - How to test the changes
   - Any breaking changes
   - Screenshots (if applicable)

5. **Link related issues**: Use "Closes #123" or "Fixes #456"

### PR Review

- Maintainers will review your PR
- Address any feedback or requested changes
- Once approved, your PR will be merged

## Areas for Contribution

### Good First Issues

- Documentation improvements
- Adding support for new file types
- Improving error messages
- Adding tests

### Feature Ideas

- Enhanced output formatting options
- Configuration file support (.gitguardrc)
- Custom exclusion patterns
- Integration with other CI/CD platforms
- Performance optimizations

### Bug Fixes

- Check the [Issues](https://github.com/git-guard/gitguard-cli/issues) page for open bugs
- Reproduce the bug locally
- Fix and test thoroughly
- Submit a PR with the fix

## API Integration

If you're working on features that interact with the GitGuard API:

### API Endpoints

All API calls go through `/src/lib/api-client.ts`:

- `POST /api/v1/cli/auth/request` - Request authentication
- `POST /api/v1/cli/auth/verify` - Verify auth code
- `POST /api/v1/cli/auth/revoke` - Revoke token
- `GET /api/user` - Get user info
- `POST /api/v1/cli/scan` - Submit scan

### Authentication

- Tokens are stored in `~/.gitguard/config.json`
- Token file has `chmod 600` permissions
- Tokens expire after 90 days
- Use Bearer token in `Authorization` header

## Release Process

Maintainers handle releases:

1. Update version: `npm version [major|minor|patch]`
2. Build: `yarn build`
3. Publish: `npm publish --access public`
4. Push commits and tags: `git push && git push --tags`

## Getting Help

- **Questions**: Open a [Discussion](https://github.com/git-guard/gitguard-cli/discussions)
- **Bugs**: Open an [Issue](https://github.com/git-guard/gitguard-cli/issues)
- **Email**: support@gitguard.net

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to GitGuard CLI! 🛡️
