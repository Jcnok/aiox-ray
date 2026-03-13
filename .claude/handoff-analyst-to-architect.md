---
name: AIOX-Ray Project Handoff to Architect
description: Technical requirements and design decisions ready for detailed architecture specification
type: handoff
created: 2026-03-13
from_agent: analyst
to_agent: architect
status: pending
---

# 🏗️ Handoff: AIOX-Ray → @architect (Aria)

## Current State

**Project Brief:** ✅ Consolidado em `project-brief-AIOX-Ray.md`

**Vision Estratégica:**
AIOX-Ray é um sistema de **meta-observabilidade** para o próprio framework AIOX. Instrumenta a CLI para coletar eventos de execução de agentes, armazena em PostgreSQL e expõe via Dashboard visual + Agente Auditor especializado para análise automática.

**Philosophy:** CLI First → Observabilidade Second → UI Third

---

## 🎯 Your Responsibility (@architect)

Você é a autoridade técnica responsável por:

1. **Design de Arquitetura Completo** para Marco 1 (Coleta de Dados)
2. **Especificação de Componentes** (instrumentação, coletor, storage)
3. **Decisões Técnicas Críticas** (banco, tecnologias, integrações)
4. **Plano de Integração com AIOX** (como hooks entram, onde se conectam)
5. **Escalabilidade & Roadmap** (visão para Marcos 2-4)

---

## 📋 Key Technical Requirements (Do Project Brief)

### Escopo MVP (Marco 1)
- **Agentes:** @dev, @qa, @architect, @orchestrator ⚠️ Verificar se existe
- **Eventos:** agent.started, agent.finished, error.occurred, recovery.attempt, skill.executed, chain_of_thought (marcos)
- **Storage:** PostgreSQL com JSONB
- **Retenção:** 30 dias brutos, indefinida para agregados
- **Performance:** <5% overhead (assíncrono, CoT amostrado)
- **Sanitização:** Na CLI (não chega ao Coletor)

### Arquitetura de Componentes
```
CLI (instrumentação) → Coletor/API (Node.js/Express) → PostgreSQL
                                           ↓
                        Dashboard (React) + Agente Auditor
```

### Stack Recomendado (Confirmar/Ajustar)
- **Backend:** Node.js + Express
- **Frontend:** React + TypeScript
- **Database:** PostgreSQL + JSONB
- **Real-time:** SSE (não WebSockets para MVP)
- **Deployment:** Docker

---

## ⚙️ Critical Design Questions (Responder)

**Estes itens devem ser resolvidos no seu Design Técnico:**

### 1️⃣ Instrumentação Strategy
- [ ] **Package Separado vs Core:** Criar `packages/aiox-instrumentation/` ou integrar ao core CLI?
  - **Impacto:** Histórias do Marco 1 (US-1, US-2, US-3)
  - **Trade-offs:** Pacote = flexibilidade, core = sempre presente

- [ ] **Hook Integration Points:** Onde na CLI (antes/depois de agent.execute, em handler de agentes, etc.)?
  - **Referência:** Documentação de hooks AIOX ou Agent Authority rules

- [ ] **Event Emission Mechanism:** Usar Event Emitter padrão, custom system, ou integração com MCP?
  - **Constraint:** Deve ser assíncrono, não-bloqueante

### 2️⃣ Coletor Design
- [ ] **Receptor Endpoint:** HTTP POST (simples) vs gRPC (escalável) vs ambos?
  - **Volume MVP:** ~2.500 eventos/dia (simples POST é suficiente)

- [ ] **Authentication:** CLI → Coletor? Chave compartilhada, JWT, mTLS, localhost-only (MVP)?
  - **Constraint:** Não deve adicionar overhead

- [ ] **Retry Logic:** Se Coletor indisponível, eventos são perdidos ou buffered na CLI?
  - **Recomendação:** Buffer local em arquivo + retry com jitter

### 3️⃣ Schema & Data Model
- [ ] **PostgreSQL Schema Detalhado:**
  ```
  Tables: events, agents, metrics, executions
  - Índices (agent_id, timestamp, event_type, execution_id)
  - JSONB columns para flexibilidade
  - Foreign keys para correlação
  ```

- [ ] **Event Envelope Completo:** Além de agente/timestamp, qual metadados?
  - Exemplo: correlation_id, parent_execution_id (para rastrear cadeia de agentes)

- [ ] **CoT Storage:** Texto simples em JSONB ou estrutura específica?
  - **Constraint:** Deve permitir busca por marcos ("Analisando o problema", etc.)

### 4️⃣ Escalabilidade (Future-Proofing)
- [ ] **Agregação & TTL:** Quando/como agregar dados brutos para métricas diárias?
  - **Cron job** ou **stream processing**?
  - **Ferramenta:** PG stored procedures, TimescaleDB hypertables, ou worker separado?

- [ ] **Sharding Strategy:** Se crescer para 100K+ eventos/dia, como fragmentar?
  - **MVP:** Deixar via JSONB; decidir em Marco 4

- [ ] **Full-Text Search:** Necessário para CoT/logs? Elasticsearch ou just JSONB query?
  - **MVP:** Provavelmente não; esperar por feedback de Dashboard

### 5️⃣ Integration with AIOX Ecosystem
- [ ] **ADE Recovery System:** Como capturar `recovery.attempt`? Precisa API/hook do ADE?
  - **Action:** Verificar com mantainer do ADE recovery system

- [ ] **@orchestrator Agent:** Existe? Se novo, qual é o escopo mínimo?
  - **Impacto:** Pode afetar architetura de hook global vs. por-agente

- [ ] **Constitution Compliance (Art IV):** Como garantir auditor não inventa sugestões?
  - **Controle:** Todas as sugestões devem traceback a dados de execução ou code analysis

- [ ] **Squad Ownership:** Instrumentação é `squads/aiox-ray/` ou fica em `packages/` para uso de múltiplos squads?
  - **Recomendação:** Core no squad; instrumentation como package reutilizável

---

## 📐 Deliverables Expected From You

**Timing:** Paralelo com @pm (Morgan) no PRD. Idealmente, primeira versão pronta em 3-4 dias.

### 1. **Design Technical Document** (`ARCHITECTURE-AIOX-Ray.md`)
- [ ] Diagrama detalhado de componentes (com fluxos de dados)
- [ ] PostgreSQL schema (DDL comentado)
- [ ] API REST spec (endpoints, formatos de request/response)
- [ ] Event schema completo (JSON examples para cada tipo)
- [ ] Decisões arquiteturais principais (com justificativas)
- [ ] Trade-offs explicitados

### 2. **Integration Plan** (`INTEGRATION-PLAN.md`)
- [ ] Exatamente onde/como hooks são registrados na CLI
- [ ] Pseudo-código de instrumentação para @dev (template para outros agentes)
- [ ] Como Coletor se integra (deploy local? remoto?)
- [ ] Como Dashboard/Auditor acessam dados (queries esperadas)

### 3. **Technology Stack Decision Document** (`TECH-STACK.md`)
- [ ] Confirmação de stack (Node.js/Express/PostgreSQL/React/SSE)
- [ ] Alternativas consideradas + por que rejeitadas
- [ ] Dependências específicas (versões, pacotes npm)
- [ ] Tooling (Docker, testing, etc.)

### 4. **Escalability & Future Roadmap** (`ROADMAP-TECHNICAL.md`)
- [ ] Limites do MVP (quando precisa refactor?)
- [ ] Estratégia para crescimento (Marcos 2-4)
- [ ] Pontos de extensão (para CoT, mais agentes, etc.)

---

## 🔗 Collaboration with @pm (Morgan)

**Morgan trabalha em paralelo em PRD + Histórias.**

**Handoff Points:**
- ✅ Morgan recebe este Project Brief para base do PRD
- ⏳ Você recebe PRD de Morgan → refina Design Técnico conforme necessário
- ⏳ **CRÍTICO:** Se Morgan criar histórias que conflitem com seu design, vocês sincronizam
  - Exemplo: Se @orchestrator não existe e você descobre que precisa criá-lo, Morgan ajusta escopo/timeline

**Sync Point:** Após sua primeira versão do Design, marque uma reunião rápida (1h) com Morgan para alinhar.

---

## 📋 Open Questions You Must Answer

Estas decisões **você** faz (são decisões arquiteturais, não de negócio):

1. **Instrumentação é um pacote npm separado ou integrada ao core?** (Impacta todas as histórias)
2. **PostgreSQL schema é centralizado (1 banco) ou distribuído por projeto?** (Impacta multi-tenancy)
3. **Coletor roda como worker separado ou integrado à CLI?** (Impacta deployment)
4. **CoT é armazenado em JSONB ou em tabela separada com índices especiais?** (Impacta queries)
5. **Como você planeja testar <5% overhead sem ter os agentes reais rodando?** (Test strategy)

---

## 📚 Artifacts Available

| Arquivo | Para Você | Status |
|---------|-----------|--------|
| `project-brief-AIOX-Ray.md` | Referência base | ✅ Pronto |
| `handoff-analyst-to-pm.md` | Contexto de @pm (coordenação) | ✅ Pronto |
| PRD de Morgan (futuro) | Validar contra seu design | ⏳ @pm criará |

---

## 🎯 Success Criteria for Your Work

Quando seu Design Técnico estiver pronto:

- ✅ @pm consegue quebrar histórias conforme seu design (sem ambiguidades)
- ✅ @dev consegue implementar US-1 (instrumentação @dev) seguindo seu pseudo-código
- ✅ Qualquer engenheiro consegue montar o Coletor sem perguntas
- ✅ PostgreSQL schema é auto-documentado e extensível
- ✅ Trade-offs são explícitos (não deixar @dev surpreso em implementação)

---

## 🚀 Next Action

**Aria, você deve:**

1. Ler `project-brief-AIOX-Ray.md` completamente
2. Validar/questionar as decisões pré-estabelecidas (stack, agents, etc.)
3. **Responder as 5 "Open Questions You Must Answer" acima**
4. Elaborar Design Técnico com os 4 deliverables listados
5. **Coordenar com @pm (Morgan)** quando ambas estiverem prontas
6. Passar Design final para @sm (River) para entrada em tasks

---

**Handoff finalizado por:** Atlas (Analyst)
**Data:** 2026-03-13
**Status:** Ready for Technical Architecture
