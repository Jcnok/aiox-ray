# AIOX-Ray Dashboard

SPA React para observabilidade em tempo real das execuções de agentes AIOX, consumindo eventos via Server-Sent Events (SSE) do Collector.

## Objetivo

O dashboard consolida, na mesma tela, quatro perspectivas complementares da execução:

- **Visão geral de métricas** (execuções, duração média, taxa de erro e agentes ativos)
- **Linha do tempo de execuções** por agente
- **Grafo de fluxo** (relações entre agentes/skills)
- **Painel drill-down** para inspeção detalhada por `execution_id`

A aplicação foi implementada para operação em tempo real, com atualização contínua a partir do endpoint `/events/stream`.

## Funcionalidades implementadas

### 1) Ingestão em tempo real (SSE)
- Conexão automática ao montar a aplicação (`useEventStream`)
- Retry com backoff exponencial + jitter em falhas de conexão
- Alimentação contínua do `eventStore` (Zustand)
- Limpeza automática de conexão no unmount

### 2) Métricas e tendências
- Cards para:
  - Total de execuções
  - Duração média
  - Taxa de erro
  - Número de agentes ativos
- Recalculo periódico com base no stream de eventos
- Cálculo de tendência de 7 dias

### 3) Timeline
- Agrupamento por agente
- Posicionamento temporal das execuções em lanes
- Tooltip de detalhe por barra de execução
- Scroll para datasets maiores

### 4) Flow Graph (DAG)
- Nós para agentes/skills
- Arestas de relacionamento entre execuções
- Interação com pan/zoom/drag (React Flow)
- MiniMap, controles nativos e filtro por agente

### 5) Drill-down detail pane
- Abertura por seleção de execução
- Seções colapsáveis (metadata, I/O, CoT, erros, ADE, JSON bruto)
- Cópia de JSON completo para inspeção

## Arquitetura de alto nível

```text
Browser (React SPA)
  └─ useEventStream() -> EventSource('/events/stream')
       └─ SSEClient (retry/backoff)
            └─ eventStore (Zustand)
                 ├─ useMetrics()     -> MetricsCards
                 ├─ useTimeline()    -> TimelineView
                 ├─ useFlowGraph()   -> FlowGraph
                 └─ DrilldownPane    -> buildExecutionDetail()

Collector (Express)
  ├─ GET /health
  ├─ GET /events/stream
  ├─ GET /events/stream-health
  └─ static serving de /public (SPA)
```

## Stack técnico

- **Frontend:** React 18 + TypeScript + Vite
- **Estado:** Zustand
- **Visualização:** Recharts + @xyflow/react
- **Estilo:** Tailwind CSS
- **Testes:** Vitest + Testing Library + jsdom
- **Backend de stream:** Express (Collector) + PostgreSQL

## Estrutura principal

```text
squads/aiox-ray/dashboard/
├── src/
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── MetricsCards.tsx
│   │   ├── TimelineView.tsx
│   │   ├── FlowGraph.tsx
│   │   ├── DrilldownPane.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useEventStream.ts
│   │   ├── useMetrics.ts
│   │   ├── useTimeline.ts
│   │   └── useFlowGraph.ts
│   ├── services/
│   │   ├── sseClient.ts
│   │   ├── metricsCalculator.ts
│   │   ├── timelineCalculator.ts
│   │   ├── graphBuilder.ts
│   │   └── executionDetailBuilder.ts
│   ├── stores/
│   │   ├── eventStore.ts
│   │   ├── filterStore.ts
│   │   └── uiStore.ts
│   ├── App.tsx
│   └── index.tsx
├── tests/
│   ├── unit/
│   └── integration/
└── README.md
```

## Pré-requisitos

- Node.js 18+
- npm
- Collector configurado no projeto (`squads/aiox-ray/collector`)
- PostgreSQL acessível ao Collector

## Instalação

Na raiz do repositório:

```bash
npm --prefix squads/aiox-ray/dashboard install
npm --prefix squads/aiox-ray/collector install
```

## Execução em desenvolvimento

### Opção A — Dashboard isolado (Vite)

```bash
npm --prefix squads/aiox-ray/dashboard run dev
```

A SPA sobe em `http://localhost:5173`.

### Opção B — Fluxo integrado (recomendado para validação E2E)

1. Subir PostgreSQL local:

```bash
docker run --name aiox-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=aiox_ray -p 5432:5432 -d postgres
```

2. Definir ambiente do Collector:

```bash
export COLLECTOR_TOKEN=dev-token-local
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aiox_ray
# opcional para debug local do dashboard
export DISABLE_EVENTS_AUTH=true
```

3. Build da SPA:

```bash
npm --prefix squads/aiox-ray/dashboard run build
```

4. Publicar build no Collector:

```bash
cp -r squads/aiox-ray/dashboard/dist/* squads/aiox-ray/collector/public/
```

5. Subir o Collector:

```bash
npm --prefix squads/aiox-ray/collector run dev
```

6. Acessar:

- Dashboard: `http://localhost:3001`
- Health: `http://localhost:3001/health`
- SSE health: `http://localhost:3001/events/stream-health`

## Scripts (dashboard)

```bash
npm --prefix squads/aiox-ray/dashboard run dev
npm --prefix squads/aiox-ray/dashboard run build
npm --prefix squads/aiox-ray/dashboard run preview
npm --prefix squads/aiox-ray/dashboard run test
npm --prefix squads/aiox-ray/dashboard run test:ui
npm --prefix squads/aiox-ray/dashboard run type-check
npm --prefix squads/aiox-ray/dashboard run lint
```

## Testes e validação recomendada

Fluxo mínimo para validação local:

```bash
npm --prefix squads/aiox-ray/dashboard run test -- --run
npm --prefix squads/aiox-ray/dashboard run type-check
npm --prefix squads/aiox-ray/dashboard run build
```

Para o Collector:

```bash
npm --prefix squads/aiox-ray/collector run test
npm --prefix squads/aiox-ray/collector run build
```

## Checklist de validação E2E local

1. **Build do front-end** e cópia para `collector/public`.
2. **Collector com variáveis válidas** (`COLLECTOR_TOKEN`, `DATABASE_URL`).
3. **Injeção de evento mock** com UUID/timestamp válidos:

```bash
E_ID=$(node -e "console.log(require('crypto').randomUUID())")
TS=$(node -e "console.log(new Date().toISOString())")

curl -X POST "http://localhost:3001/events" \
  -H "Authorization: Bearer dev-token-local" \
  -H "Content-Type: application/json" \
  -d "{\"event_type\":\"agent.started\",\"agent_id\":\"dev\",\"execution_id\":\"$E_ID\",\"timestamp\":\"$TS\"}"
```

4. **Validação visual** no dashboard (`localhost:3001`) confirmando atualização em tempo real sem refresh.

## Como os dados são processados

1. Collector expõe `/events/stream` e faz polling do banco para novos eventos.
2. Frontend abre `EventSource` com reconexão automática (`SSEClient`).
3. Eventos entram no `eventStore`.
4. Hooks derivados (`useMetrics`, `useTimeline`, `useFlowGraph`) recalculam visões em intervalos distintos.
5. Seleção de execução abre o `DrilldownPane` via `uiStore.selectedExecutionId`.

## Decisões de implementação relevantes

- **SSE com retry no frontend:** robustez para instabilidade de rede.
- **Stores leves com Zustand:** baixo overhead e simplicidade.
- **Cálculo derivado em hooks:** evita store adicional para dados computados.
- **Serviço de transformação por domínio:** `metricsCalculator`, `timelineCalculator`, `graphBuilder`, `executionDetailBuilder`.
- **Compatibilidade UUID no stream:** primeiro ciclo por janela de tempo e ciclos seguintes por `event_id > $1` com UUID válido.

## Troubleshooting

### Dashboard não carrega em `:3001`

- Verifique se o Collector está em execução.
- Confirme que `collector/public` contém o build atualizado da SPA.
- Teste `GET /health`.

### Eventos não aparecem

- Verifique conexão SSE no DevTools (requisição `events/stream`).
- Teste `GET /events/stream-health`.
- Verifique se há eventos no banco do Collector.

### Erro de UUID no stream SSE

- Sintoma: `invalid input syntax for type uuid` no backend.
- Verifique se o stream não usa fallback textual (ex.: `'0'`) em comparação com `event_id`.
- A implementação atual evita isso com janela temporal inicial e cursor UUID depois do primeiro evento.

### 401 Unauthorized em testes locais

- Se necessário para debug local, habilite `DISABLE_EVENTS_AUTH=true`.
- Para produção, mantenha autenticação habilitada e ajuste estratégia de auth para stream conforme arquitetura de segurança.

### Conflito de dependências de teste (ERESOLVE)

- Garantir alinhamento de `vitest` e `@vitest/coverage-v8` em `^1.6.1`.

### Reconexões constantes

- Inspecione logs do Collector.
- Verifique conectividade com PostgreSQL.
- Revise erros de rede/proxy local.

### Lint falhando por configuração

- O backlog técnico registra ausência de configuração ESLint do dashboard (ver seção de débitos).

## Débitos técnicos conhecidos

Backlog consolidado em:

- `docs/tech-debt-backlog.md`

Prioridades atuais:

1. Configurar ESLint no dashboard
2. Avaliar virtualização da timeline para alto volume de eventos
3. Reduzir casts `as any` no Flow Graph
4. Remover bypass de auth local da trilha padrão e evoluir para mecanismo seguro de autenticação no stream

## Referências internas

- Arquitetura: `docs/architecture-dashboard.md`
- PRD: `docs/prd.md`
- Stories do Epic 2: `docs/stories/2.1.story.md` até `docs/stories/2.5.story.md`
- Backlog técnico: `docs/tech-debt-backlog.md`

## Status operacional de validação local

- **Collector:** operacional na porta `3001`
- **Dashboard:** conectado ao stream com `statusCode: 200`
- **Banco:** migrações aplicadas e recebendo eventos de agentes simulados

Sistema apto para integração com runtime AIOX real, apontando `COLLECTOR_URL` para o serviço estabilizado.
