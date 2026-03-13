# GitHub Branch Protection Setup — AIOX-Ray

Este guia documenta como configurar branch protection rules via GitHub CLI e web interface.

## Via GitHub CLI (Recomendado)

### 1. Configurar Branch Protection para `master`

```bash
# Adicionar branch protection rule
gh api repos/Jcnok/aiox-ray/branches/master/protection \
  --input - << 'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["quality-gates", "docs-validation", "story-validation"]
  },
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "enforce_admins": false,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": false,
  "required_linear_history": false
}
EOF
```

### 2. Adicionar Secrets

```bash
# COLLECTOR_TOKEN
gh secret set COLLECTOR_TOKEN --body 'Bearer your-collector-token-here'

# DATABASE_URL
gh secret set DATABASE_URL --body 'postgresql://user:password@localhost/aiox_ray'
```

### 3. Verificar Configuração

```bash
# Verificar branch protection
gh api repos/Jcnok/aiox-ray/branches/master/protection

# Verificar secrets
gh secret list
```

---

## Via GitHub Web Interface

### 1. Branch Protection

**Path:** Repository Settings → Branches → Add rule

**Configure:**

1. **Branch name pattern:** `master` (or `main`)

2. **Require status checks to pass before merging**
   - ✓ Require branches to be up to date
   - Status checks: Select "quality-gates", "docs-validation", "story-validation"

3. **Require pull request reviews before merging**
   - ✓ Dismiss stale pull request approvals when new commits pushed
   - Required approving reviewers: 1
   - ✗ Require code owner reviews (skip for MVP)

4. **Require status checks to pass**
   - ✓ Require branches to be up to date before merging

5. **Restrict who can push to matching branches**
   - ✗ Skip for MVP (or configure later)

6. **Allow force pushes**
   - ○ Do not allow force pushes

7. **Allow deletions**
   - ✗ Unchecked (prevent branch deletion)

8. **Require conversation resolution**
   - ✗ Unchecked for MVP

9. **Require linear history**
   - ✗ Unchecked for MVP

### 2. Secrets & Variables

**Path:** Settings → Secrets and variables → Actions → New repository secret

| Secret | Value |
|--------|-------|
| `COLLECTOR_TOKEN` | `Bearer eyJhbGc...` (from Collector service) |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/aiox_ray` |

### 3. Actions Permissions

**Path:** Settings → Actions → General

**Configure:**
- ✓ Allow all actions and reusable workflows
- ✓ Artifact and log retention: 30 days (default)

---

## Verificação Pós-Setup

```bash
# 1. Verificar branch protection status
gh repo view --json branchProtectionRules

# 2. Criar branch de teste
git checkout -b test/branch-protection

# 3. Fazer commit de teste
echo "test" >> test.txt
git add test.txt
git commit -m "test: branch protection validation"
git push origin test/branch-protection

# 4. Criar PR de teste
gh pr create --title "Test: Branch Protection" --body "Testing branch protection rules"

# 5. Verificar que push direto para master é bloqueado
# git push origin test/branch-protection:master  # Should fail

# 6. Cleanup
gh pr close <pr_number> --delete-branch
git branch -d test/branch-protection
```

---

## Troubleshooting

### Status Checks Not Appearing in PR

**Solução:**
1. Workflows devem completar pelo menos uma vez
2. Verifique **Actions** → workflow runs
3. Verifique sintaxe em `.github/workflows/*.yml`

```bash
# Validar sintaxe YAML
gh workflow list
gh run list --limit 1
```

### Cannot Push Because of Branch Protection

**Esperado:**
- Push direto para `master` deve ser bloqueado
- Deve usar Pull Request

**Workaround (somente admin):**
```bash
# Force push (use with extreme caution)
git push --force-with-lease origin branch-name
```

### CI Workflow Not Triggering

**Verificar:**
```bash
# Verificar branch name
git branch -a

# Verificar que push chegou ao remote
git log origin/master --oneline -3

# Verificar workflow configuration
gh workflow view ci.yml
```

---

## Next Steps

1. **Executar setup inicial:**
   ```bash
   # Via CLI (automated)
   ./scripts/setup-branch-protection.sh

   # Via Web (manual)
   # Seguir instruções acima
   ```

2. **Testar branch protection:**
   - Criar feature branch
   - Fazer commit
   - Push para remote
   - Tentar push direto para master (deve falhar)
   - Criar PR (deve passar)
   - Merge via PR

3. **Configurar CODEOWNERS (futuro):**
   ```
   # .github/CODEOWNERS
   * @Jcnok
   /docs/architecture.md @Jcnok
   /docs/stories/ @Jcnok
   ```

4. **Habilitar Rulesets (GitHub Enterprise):**
   - Rulesets oferecem mais controle que branch protection
   - Recomendado para projetos maiores

---

*Last Updated: 2026-03-13*
*AIOX-Ray DevOps Configuration*
