#!/bin/bash
# setup-github-infrastructure.sh
# Configure GitHub Actions, branch protection, and secrets for AIOX-Ray

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO=${1:-"Jcnok/aiox-ray"}
BRANCH=${2:-"master"}

echo -e "${YELLOW}Setting up GitHub infrastructure for ${REPO}...${NC}\n"

# ============================================================================
# 1. Verify GitHub CLI authentication
# ============================================================================

echo -e "${YELLOW}Step 1: Verifying GitHub CLI authentication...${NC}"
if gh auth status > /dev/null 2>&1; then
  ACCOUNT=$(gh auth status | grep "Logged in to github.com" | head -1 | awk '{print $5}')
  echo -e "${GREEN}✓ Authenticated as: ${ACCOUNT}${NC}\n"
else
  echo -e "${RED}✗ Not authenticated. Run: gh auth login${NC}"
  exit 1
fi

# ============================================================================
# 2. Configure Branch Protection
# ============================================================================

echo -e "${YELLOW}Step 2: Configuring branch protection for '${BRANCH}'...${NC}"

# Check if branch protection already exists
if gh api "repos/${REPO}/branches/${BRANCH}/protection" > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠ Branch protection rule already exists. Updating...${NC}"
else
  echo -e "${YELLOW}Creating new branch protection rule...${NC}"
fi

# Apply branch protection
gh api "repos/${REPO}/branches/${BRANCH}/protection" \
  -X PUT \
  -f required_status_checks='{"strict":true,"contexts":["quality-gates","docs-validation"]}' \
  -f required_pull_request_reviews='{"dismiss_stale_reviews":true,"require_code_owner_reviews":false,"required_approving_review_count":1}' \
  -f enforce_admins=false \
  -f allow_force_pushes=false \
  -f allow_deletions=false \
  -f required_conversation_resolution=false \
  -f required_linear_history=false > /dev/null 2>&1

echo -e "${GREEN}✓ Branch protection configured${NC}\n"

# ============================================================================
# 3. Add GitHub Secrets
# ============================================================================

echo -e "${YELLOW}Step 3: Configuring GitHub Secrets...${NC}"

# Check if secrets exist
COLLECTOR_TOKEN=$(gh secret list | grep COLLECTOR_TOKEN || echo "")
DATABASE_URL=$(gh secret list | grep DATABASE_URL || echo "")

if [ -z "$COLLECTOR_TOKEN" ]; then
  echo -e "${YELLOW}Setting COLLECTOR_TOKEN...${NC}"
  # For MVP, use placeholder
  gh secret set COLLECTOR_TOKEN --body "Bearer aiox-ray-collector-token-placeholder"
  echo -e "${GREEN}✓ COLLECTOR_TOKEN set (placeholder - update in GitHub Settings)${NC}"
else
  echo -e "${YELLOW}⚠ COLLECTOR_TOKEN already exists${NC}"
fi

if [ -z "$DATABASE_URL" ]; then
  echo -e "${YELLOW}Setting DATABASE_URL...${NC}"
  gh secret set DATABASE_URL --body "postgresql://aiox:password@localhost:5432/aiox_ray"
  echo -e "${GREEN}✓ DATABASE_URL set (placeholder - update in GitHub Settings)${NC}"
else
  echo -e "${YELLOW}⚠ DATABASE_URL already exists${NC}"
fi

echo ""

# ============================================================================
# 4. Verify Workflows
# ============================================================================

echo -e "${YELLOW}Step 4: Verifying GitHub Actions workflows...${NC}"

WORKFLOWS=$(gh workflow list --repo "${REPO}" 2>/dev/null || echo "")

if [ -n "$WORKFLOWS" ]; then
  echo -e "${GREEN}✓ Workflows detected:${NC}"
  echo "$WORKFLOWS" | head -10
else
  echo -e "${YELLOW}⚠ No workflows found (workflows will be available after push)${NC}"
fi

echo ""

# ============================================================================
# 5. Display Configuration Summary
# ============================================================================

echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}GitHub Infrastructure Setup Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}\n"

echo "Summary:"
echo "  Repository: ${REPO}"
echo "  Protected Branch: ${BRANCH}"
echo "  Status Checks: quality-gates, docs-validation"
echo "  Required Reviews: 1"
echo "  Secrets:"
echo "    - COLLECTOR_TOKEN (placeholder, update in Settings)"
echo "    - DATABASE_URL (placeholder, update in Settings)"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Update secrets in GitHub:"
echo "     → Settings → Secrets and variables → Actions"
echo "     → Edit COLLECTOR_TOKEN and DATABASE_URL with actual values"
echo ""
echo "  2. Verify branch protection:"
echo "     → Settings → Branches → Branch protection rules"
echo "     → Confirm '${BRANCH}' is protected"
echo ""
echo "  3. Test branch protection:"
echo "     → Create a feature branch"
echo "     → Make a commit"
echo "     → Try to push directly to ${BRANCH} (should fail)"
echo "     → Create a PR instead (should succeed)"
echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
