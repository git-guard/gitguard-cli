# Release Process & Branching Strategy

## Branching Model

We use a **Git Flow** inspired branching strategy:

### Branches

- **`main`**: Production-ready code. Every merge triggers an npm publish.
- **`develop`**: Integration branch for features and fixes. All development happens here.
- **`feature/*`**: Short-lived branches for specific features
- **`fix/*`**: Short-lived branches for bug fixes

### Workflow

```
feature/add-tests
       ↓
    develop  ←------ (PR with tests)
       ↓
     main    ←------ (Auto-publish to npm)
```

## Development Workflow

### 1. Create a Feature Branch

```bash
# Start from develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Changes and Commit

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
# Feature (triggers minor version bump)
git commit -m "feat: add new scan filtering option"

# Bug fix (triggers patch version bump)
git commit -m "fix: resolve file path encoding issue"

# Breaking change (triggers major version bump)
git commit -m "feat!: change API response format

BREAKING CHANGE: Response structure changed from flat to nested"

# Other types (no version bump, but good practice)
git commit -m "docs: update installation guide"
git commit -m "test: add config management tests"
git commit -m "chore: update dependencies"
```

### 3. Push and Create Pull Request

```bash
# Push to GitHub
git push origin feature/your-feature-name

# Create PR targeting 'develop' branch
```

### 4. Merge to Develop

Once PR is approved and CI passes:
- Squash and merge to `develop`
- Delete feature branch

### 5. Release to Production

When ready to publish a new version:

```bash
# Create PR from develop to main
git checkout develop
git pull origin develop
gh pr create --base main --head develop --title "Release v1.2.0"

# Once merged, GitHub Actions automatically:
# 1. Runs all tests
# 2. Bumps version based on commit messages
# 3. Creates git tag
# 4. Publishes to npm
# 5. Creates GitHub release
```

## Automated Publishing

### How It Works

The `.github/workflows/test-and-publish.yml` workflow:

1. **On Pull Request**: Runs tests and coverage
2. **On Push to Main**: Automatically publishes to npm

### Version Bumping

Version is automatically determined from commit messages:

| Commit Prefix | Version Bump | Example |
|---------------|--------------|---------|
| `feat:` or `feature:` | **Minor** (1.1.0 → 1.2.0) | New features |
| `fix:` or `bugfix:` | **Patch** (1.1.0 → 1.1.1) | Bug fixes |
| `BREAKING CHANGE:` | **Major** (1.1.0 → 2.0.0) | Breaking changes |
| Other | **Patch** (1.1.0 → 1.1.1) | Default |

### npm Token Setup (One-Time)

1. **Generate npm token**:
   - Go to https://www.npmjs.com/settings/your-username/tokens
   - Click "Generate New Token" → Choose "Automation"
   - Copy the token

2. **Add to GitHub Secrets**:
   - Go to https://github.com/git-guard/gitguard-cli/settings/secrets/actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste the npm token
   - Click "Add secret"

3. **Done!** GitHub Actions will use this token to publish.

## Manual Publishing (Emergency Only)

If automated publishing fails, you can publish manually:

```bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Bump version
yarn version --new-version patch  # or minor, major

# Build
yarn build

# Publish
yarn publish --access public

# Push version bump
git push origin main --tags
```

## Testing Before Release

Always test locally before creating PR to main:

```bash
# Run tests
yarn test

# Run coverage
yarn test:coverage

# Build package
yarn build

# Link locally for testing
yarn link

# Test in another project
cd /path/to/test-project
yarn link @gitguard/cli
gitguard scan --dir .

# Unlink when done
cd /path/to/gitguard-cli
yarn unlink
```

## Hotfix Process

For critical bugs in production:

```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b fix/critical-bug

# Make fix
git add .
git commit -m "fix: resolve critical authentication bug"

# Push and create PR to main
git push origin fix/critical-bug
gh pr create --base main --head fix/critical-bug --title "Hotfix: Critical Auth Bug"

# After merge, also merge back to develop
git checkout develop
git pull origin develop
git merge main
git push origin develop
```

## Pre-Release (Beta) Versions

For testing new features before official release:

```bash
# Create pre-release tag
yarn version --new-version 1.2.0-beta.1 --no-git-tag-version

# Publish with beta tag
yarn publish --tag beta --access public

# Users can install with:
# npm install @gitguard/cli@beta
```

## Rollback Process

If a release has critical issues:

1. **Deprecate the broken version** (doesn't unpublish):
   ```bash
   npm deprecate @gitguard/cli@1.2.3 "Critical bug, use 1.2.2 instead"
   ```

2. **Create hotfix** following the hotfix process above

3. **Unpublish** (only within 72 hours, use sparingly):
   ```bash
   npm unpublish @gitguard/cli@1.2.3
   ```

## Monitoring Releases

- **npm Downloads**: https://www.npmjs.com/package/@gitguard/cli
- **GitHub Releases**: https://github.com/git-guard/gitguard-cli/releases
- **GitHub Actions**: https://github.com/git-guard/gitguard-cli/actions

## Checklist Before Merging to Main

- [ ] All tests pass locally (`yarn test`)
- [ ] Coverage meets threshold (70%+)
- [ ] Build succeeds (`yarn build`)
- [ ] README is updated (if needed)
- [ ] CHANGELOG is updated (if needed)
- [ ] Breaking changes are documented
- [ ] Version bump type is appropriate for changes

## Questions or Issues?

- Check [GitHub Discussions](https://github.com/git-guard/gitguard-cli/discussions)
- Review [Open Issues](https://github.com/git-guard/gitguard-cli/issues)
- Contact maintainers

---

**Last Updated**: November 14, 2025
**Current Version**: 1.1.2
**Next Planned Release**: 1.2.0 (with comprehensive test suite)
