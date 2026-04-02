# Dashboard Tech Debt Backlog (Epic 2)

**Escopo:** Consolidação de débitos técnicos identificados nas Stories 2.3, 2.4 e 2.5.
**Data de consolidação:** 2026-04-02
**Origem:** `docs/stories/2.3.story.md`, `docs/stories/2.4.story.md`, `docs/stories/2.5.story.md`, execução de validações locais.

---

## Itens de Backlog

### TB-001 — Virtualização da Timeline para >5000 eventos
- **Prioridade:** Média
- **Severidade:** Média (performance/scalability)
- **Origem:** Story 2.3 (`PERF-001`)
- **Contexto:** Renderização atual atende escala vigente (~1000 eventos), mas há risco de degradação perto de 5000.
- **Evidência:** Gate PASS com débito aceito em `docs/qa/gates/2.3-timeline-view.yml` e seção Tech Debt da story.
- **Ação sugerida:** Introduzir virtualização (ex.: react-window) na grade da timeline e medir impacto com dataset sintético de alta cardinalidade.
- **Critério de saída:** Timeline mantém fluidez com 5000+ eventos sem degradação perceptível de interação.

### TB-002 — Configuração de ESLint no dashboard
- **Prioridade:** Alta
- **Severidade:** Média (quality gate/tooling)
- **Origem:** Stories 2.4 e 2.5 (`DEBT-001`)
- **Contexto:** Script de lint existe em `squads/aiox-ray/dashboard/package.json`, porém não há configuração ESLint do projeto.
- **Evidência:** `npm --prefix squads/aiox-ray/dashboard run lint` falha com “ESLint couldn't find a configuration file”.
- **Ação sugerida:** Adicionar configuração ESLint do dashboard alinhada ao stack React + TS e ativar execução consistente em CI local do squad.
- **Critério de saída:** `npm --prefix squads/aiox-ray/dashboard run lint` executa sem erro de configuração.

### TB-003 — Remover/justificar `as any` em tipos do React Flow
- **Prioridade:** Baixa
- **Severidade:** Baixa (maintainability/type safety)
- **Origem:** Story 2.4 (`DEBT-002` / `QA-005`)
- **Contexto:** Casts `as any` usados para compatibilidade React Flow v12 em nodeTypes/edgeTypes.
- **Evidência:** Issue registrada em Story 2.4 seção QA/Tech Debt.
- **Ação sugerida:** Revisitar tipagem custom com utilitários/overloads compatíveis com v12 e remover casts onde possível.
- **Critério de saída:** Eliminar casts críticos sem regressão de build/testes.

### TB-004 — Definir animação `animate-slide-in` no Tailwind
- **Prioridade:** Baixa
- **Severidade:** Baixa (UX polish)
- **Origem:** Story 2.5 (`DEBT-002` / `QA-2.5-4`)
- **Contexto:** Classe é referenciada no DrilldownPane, mas sem definição no Tailwind config.
- **Evidência:** Issue registrada em gate e story 2.5.
- **Ação sugerida:** Definir keyframes/animation em `tailwind.config.js` ou remover referência para evitar drift de CSS.
- **Critério de saída:** Comportamento de animação explícito e consistente com configuração.

### TB-005 — Warnings de `act()` em testes de clipboard
- **Prioridade:** Baixa
- **Severidade:** Info/baixa (test hygiene)
- **Origem:** Story 2.5 (`QA-2.5-5`) e execução local de testes em 2026-04-02
- **Contexto:** Testes passam, mas emitem warnings de atualização assíncrona sem `act`.
- **Evidência:** saída de `npm --prefix squads/aiox-ray/dashboard run test -- --run`.
- **Ação sugerida:** Ajustar asserts assíncronos com `waitFor/act` nos testes de clipboard.
- **Critério de saída:** suíte permanece verde sem warnings de `act()` nesses casos.

### TB-006 — Revisar AC de múltiplos erros no DrilldownPane
- **Prioridade:** Baixa
- **Severidade:** Baixa (consistência de especificação)
- **Origem:** Story 2.5 (`QA-2.5-1`)
- **Contexto:** AC menciona “all error events”, enquanto modelo/implementação atual tratam erro singular.
- **Evidência:** divergência documentada no gate `docs/qa/gates/2.5-drilldown-pane.yml`.
- **Ação sugerida:** decidir entre (a) atualizar AC para erro singular ou (b) evoluir para `errors[]` no modelo e UI.
- **Critério de saída:** especificação e implementação alinhadas (sem ambiguidade).

---

## Resumo de Priorização

1. **TB-002** (ESLint config) — primeiro ajuste recomendado.
2. **TB-001** (virtualização timeline) — próximo item funcional de escala.
3. **TB-003/TB-004/TB-005/TB-006** — lote de manutenção e consistência.
