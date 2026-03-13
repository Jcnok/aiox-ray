# Project Brief: AIOX-Ray
## Sistema de Observabilidade e Auditoria para AIOX

**Data:** 2026-03-13
**Status:** Refinado via Elicitação (Pronto para PRD)
**Próximo Agente:** @pm (Morgan) → Criar PRD e priorizar histórias

---

## 📋 Executive Summary

**AIOX-Ray** é um sistema meta-observabilidade que instrumenta, coleta e analisa o comportamento dos agentes AIOX em execução, fornecendo inteligência para otimização contínua. O sistema segue a filosofia AIOX: **CLI First, Observabilidade Second, UI Third**.

**Valor Principal:**
- Visibilidade operacional do framework em tempo real
- Identificação automática de gargalos e padrões de erro
- Ciclo de autoaperfeiçoamento através do agente @auditor
- Suporte para debugging e análise post-mortem

**Escopo:** 4 componentes integrados (Instrumentação → Coletor → Dashboard → Agente Auditor)

---

## 🎯 Objetivo Estratégico

Criar uma camada de inteligência que permita aos desenvolvedores e mantenedores do AIOX:

1. **Observar** como os agentes se comportam em tempo real
2. **Analisar** padrões de performance, erros e cadeias de raciocínio
3. **Otimizar** continuamente através de sugestões do agente auditor
4. **Validar** que o framework está funcionando como esperado

---

## 📐 Escopo do MVP (Marco 1)

### Agentes Instrumentados
- `@dev` (Dex) — Implementação de código
- `@qa` (Quinn) — Testes e qualidade
- `@architect` (Aria) — Arquitetura e design
- `@orchestrator` — Orquestração de alto nível ⚠️ **Verificar:** Agente novo ou já existe? Confirmar com @architect

**Nota:** Expansão para outros agentes (@pm, @po, @sm, @analyst, @data-engineer) será guiada por demanda.

### Eventos Capturados (Fundamentais)
```
agent.started       → ID, input, timestamp
agent.finished      → ID, output, resultado, duração
error.occurred      → detalhes do erro, contexto
recovery.attempt    → ação de autocorreção (do ADE Recovery System)
skill.executed      → nome, parâmetros, duração, resultado
chain_of_thought    → marcos principais (não cada parágrafo)
```

**Exemplo de Schema JSON (agent.started):**
```json
{
  "event_type": "agent.started",
  "agent_id": "dev",
  "timestamp": "2026-03-13T10:30:45Z",
  "input": {
    "task": "implement feature X",
    "story_id": "1.1"
  },
  "execution_id": "exec-uuid-12345",
  "version": "1.0"
}
```

### Granularidade Chain of Thought
Capturar marcos principais do raciocínio (seções distintas). Exemplos:
- "Analisando o problema"
- "Explorando a base de código"
- "Decisão de implementação"
- "Elaborando resposta"

**Amostragem:** 10% das execuções para CoT (reduz overhead sem sacrificar insights).
⚠️ **Nota:** Essa taxa é recomendação baseada em análise teórica de overhead. Deve ser validada experimentalmente durante implementação do Marco 1. Se testes mostram overhead >2%, aumentar taxa de filtragem.

### Constraint de Performance
- **Overhead máximo:** <5% no tempo de execução do agente
- **Implementação:** Envio assíncrono de eventos (nunca bloqueante)
- **Priorização:** Eventos start/end e erros sempre; CoT amostrado

---

## 🗄️ Armazenamento e Retenção

### Banco de Dados
- **Tecnologia:** PostgreSQL com JSONB (flexibilidade + extensibilidade)
- **Abstração:** Camada de dados com interface genérica (permite troca futura para InfluxDB/TimescaleDB)

### Retenção
- **Dados brutos:** 30 dias
- **Dados agregados:** Métricas sumarizadas (ex: médias diárias) retenção indefinida

### Volume Estimado (Dia Típico)
```
5 devs × 50 execuções/dev/dia × ~10 eventos/execução = ~2.500 eventos/dia
Facilmente gerenciável por PostgreSQL.
```

### Sanitização de Dados
Mecanismo configurável na **instrumentação da CLI** (não no Coletor) para remover/mascarar antes de emitir evento:
- ❌ Chaves de API, tokens, senhas
- ❌ Código-fonte proprietário (fora projetos de exemplo)
- ❌ Informações pessoais identificáveis (PII)

**Abordagem:** Usar regex patterns configuráveis. Dados sensíveis são mascarados na CLI; nunca chegam ao Coletor/banco.

---

## 📊 Dashboard e Visualização

### Modo de Operação
- **Live Mode:** SSE/WebSockets para execuções em tempo real
- **Replay Mode:** Histórico selecionável por período

### Funcionalidades MVP
1. **Visão Geral:** Cards com métricas (total execuções, tempo médio, taxa de erro)
2. **Timeline (Gantt):** Linha do tempo de execuções, identificação de gargalos
3. **Gráfico de Fluxo:** Hierarquia e sequência de chamadas entre agentes
4. **Drill-Down:** Clicar em nó/barra para detalhes de execução (cadeia de pensamento, logs, steps do ADE)
5. **Filtros:** Por agente, período, tipo de erro, projeto

### Público-Alvo
- **Principal:** Desenvolvedores e arquitetos usando AIOX (debug e otimização)
- **Secundário:** Mantenedores do AIOX (entender uso e melhorias)
- **Fora do escopo MVP:** Usuários finais não-técnicos

### Interatividade (MVP)
- ✅ Visualização + drill-down
- ⏳ Ações (re-executar, criar issues) → Pós-MVP

---

## 🤖 Agente Auditor (@auditor)

### Frequência
- **Sob demanda:** `*analyze --period=24h` para insights imediatos
- **Batch diário:** Relatório automático com principais oportunidades

### Tipo de Output
Sugestões informativas em linguagem natural, exemplos:

> "O agente @dev apresentou alta taxa de falha na subtarefa X. Sugiro revisar o prompt do @pm para incluir exemplos concretos."

> "A skill analisar_requisitos está com tempo médio de 45s. A CoT mostra chamadas frequentes a API externa lenta. Considere implementar cache."

### Ações Automáticas
- ❌ Não criar issues/PRs automaticamente (MVP)
- ✅ Gerar "rascunhos" para revisão humana (futuro)

### Acesso a Código
- ✅ Ler prompts e lógica dos agentes (`.aiox-core/agents/`)
- ✅ Correlacionar com dados de execução para sugestões precisas
- ⏳ Acesso a código-fonte de skills → Pós-MVP se necessário

---

## 🏗️ Arquitetura de Componentes

```
┌─────────────────────────────────────────────────────┐
│             AIOX CLI                                 │
│  (com instrumentação de eventos integrada)          │
└────────────┬────────────────────────────────────────┘
             │ Events (JSON/OpenTelemetry)
             ↓
┌─────────────────────────────────────────────────────┐
│        Coletor + API (Node.js/Express)              │
│  (recebe, normaliza, armazena eventos)              │
└────────────┬────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────┐
│       PostgreSQL + JSONB Storage                     │
│  (eventos brutos, métricas, histórico)              │
└─────────────────────────────────────────────────────┘
             ↑
     ┌───────┴────────────┐
     ↓                    ↓
┌──────────────┐   ┌─────────────────┐
│   Dashboard  │   │ Agente Auditor  │
│  (React/Vue) │   │  (@auditor)      │
└──────────────┘   └─────────────────┘
```

### Localização
- **Implementação:** Squad separado (`squads/aiox-ray/`)
- **Instrumentação:** Pacote separado (`packages/aiox-instrumentation/`) ou integrada ao core
- **Agente:** Novo agente no AIOX (`.aiox-core/agents/auditor.md`)

---

## 📅 Sequência de Implementação (4 Marcos)

### Marco 1: Coleta de Dados (Foundation)
**Entregáveis:**
- Instrumentação em @dev, @qa, @architect, @orchestrator
- Coletor + API básica (CRUD de eventos)
- Armazenamento em PostgreSQL
- Scripts de sanitização

**Validação:** Consultas diretas ao banco (sem dashboard ainda) comprovam coleta funcionando.

**Duração estimada:** 2 semanas

---

### Marco 2: Dashboard Visual
**Entregáveis:**
- Interface web (React ou Vue)
- Visão geral (métricas, cards)
- Timeline (Gantt)
- Gráfico de fluxo interativo
- Filtros básicos
- Modo live + histórico

**Validação:** Dashboard exibe dados em tempo real conforme agentes executam.

**Duração estimada:** 2-3 semanas

---

### Marco 3: Agente Auditor
**Entregáveis:**
- Novo agente @auditor implementado
- Análise sob demanda (`*analyze --period=X`)
- Relatório diário automático (batch)
- Sugestões em linguagem natural

**Validação:** Auditor identifica padrões reais (ex: agent lento, erro recorrente) e sugere melhorias.

**Duração estimada:** 2 semanas

---

### Marco 4: Refinement e Expansão
**Atividades:**
- Feedback dos usuários em Marcos 1-3
- Expansão para mais agentes (@pm, @po, @sm, etc.)
- Otimizações de performance
- Documentação e guias de uso

**Duração estimada:** Contínuo pós-MVP

---

## 📋 Requisitos Técnicos Detalhados

### Instrumentação
- [ ] Hooks/middlewares em pontos-chave da CLI (antes/depois execução de agente)
- [ ] Formato de eventos padronizado (recomenda-se JSON estruturado)
- [ ] Envio assíncrono com retry logic
- [ ] Mecânica de sanitização (regex patterns para secrets)

### Coletor
- [ ] Receptor de eventos (HTTP POST ou SSE)
- [ ] Normalização e validação de eventos
- [ ] Persistência em PostgreSQL
- [ ] Exposição de API REST para queries (filtro por agente, tempo, tipo)

### Armazenamento
- [ ] Schema PostgreSQL com tabelas: `events`, `agents`, `metrics`
- [ ] Índices para performance (agent_id, timestamp, event_type)
- [ ] Procedure/cron para agregação e limpeza (retenção 30 dias)

### Dashboard
- [ ] Frontend SPA (React/Vue)
- [ ] Conectar com API do Coletor (REST ou GraphQL)
- [ ] Responsivo (desktop/tablet)
- [ ] Modo dark/light (opcional MVP)

### Agente Auditor
- [ ] Implementado como agente AIOX padrão
- [ ] Acesso a banco de dados (queries)
- [ ] Acesso a arquivos de configuração de agentes (prompts)
- [ ] Geração de relatórios estruturados

---

## ⚙️ Decisões Arquiteturais (para @architect)

1. **Banco de dados:** PostgreSQL (pronto para produção, suporta JSONB)
2. **Frontend:** React com TypeScript (familiar ao stack AIOX)
3. **Backend:** Node.js/Express (alinha com ferramental AIOX)
4. **Comunicação em tempo real:** SSE (mais simples que WebSockets para MVP)
5. **Deployment:** Containerizado (Docker) para facilitar integração com infraestrutura existente

---

## 🚨 Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Instrumentação adiciona overhead >5% | Implementar assíncrono; amostragem de CoT; testes de performance |
| Volume de dados cresce além do esperado | Agregação agressiva; implementar TTL no banco; planejar sharding |
| Auditor gera sugestões sem valor prático | Feedback contínuo dos usuários; ajustar algoritmos de análise |
| Segurança: vazar dados sensíveis | Sanitização configurável; testes de máscara de secrets |

---

## 📚 Referências e Dependências

- **ADE Recovery System:** Para capturar eventos `recovery.attempt` (se existente e expor eventos). Pode requerer integração manual com sistema de auto-recuperação do ADE.
- **AIOX Agent System:** Para estrutura de novo agente @auditor e integração de instrumentação hooks
- **AIOX Constitution:** Artigo IV (No Invention) — Auditor só sugere com base em dados/código
- **Docs/Squads Guide:** Para estrutura do squad aiox-ray
- **@orchestrator Agent:** Verificar se existe ou é novo para este projeto

---

## ✅ Próximos Passos

### Imediato (Próximas 24h)
1. **@pm (Morgan):** Criar PRD detalhado com histórias priorizadas (Marco 1)
2. **@architect (Aria):** Elaborar design técnico (stack, schemas, APIs)

### Curto prazo (Semana 1)
1. **@sm (River):** Quebrar histórias em tasks detalhadas
2. **@dev (Dex):** Iniciar implementação da instrumentação

### Validação Contínua
1. **@qa (Quinn):** Planejar teste strategy (coleta de dados, integridade)
2. **@devops (Gage):** Preparar infraestrutura (DB, hosting, CI/CD)

---

**Consolidado por:** Atlas (Analyst)
**Status:** Pronto para PRD e Arquitetura
**Próximo:** Morgan (@pm) inicia PRD
