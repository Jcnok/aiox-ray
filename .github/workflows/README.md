# GitHub Actions Workflows — AIOX-Ray

This directory contains the CI/CD pipeline configuration for AIOX-Ray.

## Workflows

### 1. **CI — Quality Gates** (`.github/workflows/ci.yml`)

**Triggers:** Push to main/master/develop, Pull requests

**Steps:**
- ✓ Lint (npm run lint)
- ✓ Type checking (npm run typecheck)
- ✓ Unit tests (npm test)
- ✓ Build (npm run build)
- ✓ Documentation validation
- ✓ Branch protection validation

**Status:** Uses `continue-on-error: true` to collect all metrics (no blocking in MVP)

### 2. **Story Validation** (`.github/workflows/story-validation.yml`)

**Triggers:** Pull requests modifying `docs/stories/**/*.md` or `docs/prd.md`

**Validation:**
- ✓ YAML frontmatter present
- ✓ Story statement section
- ✓ Acceptance criteria
- ✓ Tasks / Subtasks
- ✓ Definition of Done
- ✓ Story count and status breakdown

### 3. **CodeRabbit Integration** (`.github/workflows/coderabbit-integration.yml`)

**Triggers:** Pull request open, synchronize, reopen (non-draft)

**Details:**
- CodeRabbit is executed manually via `@devops` agent
- Manual triggers: `*pre-push` or `wsl bash -c 'coderabbit --prompt-only --base main'`
- Gate rules documented in PR comment:
  - 🔴 CRITICAL: Block PR
  - 🟠 HIGH: Warn, recommend fix
  - 🟡 MEDIUM: Document + follow-up
  - 🟢 LOW: Optional improvements

---

## Configuration

### Required Secrets (Configure in GitHub)

Navigate to: **Settings → Secrets and variables → Actions**

| Secret | Purpose | Example |
|--------|---------|---------|
| `COLLECTOR_TOKEN` | Bearer token for event collector | `Bearer abc123...` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost/aiox_ray` |

### Branch Protection Rules (Configure in GitHub)

Navigate to: **Settings → Branches → Branch protection rules** → Add rule for `main` or `master`

**Required rules:**
- ✓ Require a pull request before merging
- ✓ Require status checks to pass before merging (once CI is stable)
- ✓ Require branches to be up to date before merging
- ✓ Restrict who can push to matching branches

### Recommended

- Require code reviews (1 approval minimum)
- Require CODEOWNERS review (once CODEOWNERS file is added)
- Automatically delete head branches after merge

---

## Local Testing

To test workflows locally before commit:

```bash
# Lint
npm run lint

# Type checking
npm run typecheck

# Tests
npm test

# Build
npm run build

# CodeRabbit (requires WSL + installation)
wsl bash -c 'cd /mnt/c/path && ~/.local/bin/coderabbit --prompt-only --base main'
```

---

## Troubleshooting

### Workflow Not Triggering
- Check branch name matches trigger conditions (main, master, develop)
- Verify files in PR match `on.paths` patterns
- Review workflow syntax: `gh workflow list`

### Status Checks Not Appearing in PR
- Workflow must complete at least once
- Check **Actions** tab for workflow runs
- Verify branch protection rule references correct workflow

### CodeRabbit Not Running
- CodeRabbit is manual-triggered only (via @devops agent)
- Does NOT auto-run in GitHub Actions (requires WSL + CLI)
- Use `*pre-push` from @devops for automated execution

---

## Next Steps

1. **Manual Configuration Required:**
   - Add `COLLECTOR_TOKEN` and `DATABASE_URL` secrets in GitHub Settings
   - Configure branch protection rules for `main`/`master`
   - Enable auto-delete head branches after merge

2. **Verify Workflows:**
   - Push initial commit and verify workflows run
   - Check **Actions** tab for status
   - Verify all quality gates complete

3. **Team Setup:**
   - Add CODEOWNERS file (when team is ready)
   - Configure required reviewers
   - Document review SLAs

---

*Last Updated: 2026-03-13*
*AIOX-Ray DevOps Configuration*
