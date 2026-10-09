# ARCHITECTURE.md — Arquitetura do vigiAI TypeScript

## Visão Geral

vigiAI é um **monorepo TypeScript** estruturado em 3 camadas distintas:

```
┌─────────────────────────────────────────────────┐
│ Frontend (React + TypeScript + Vite)            │
│ - Autenticação Supabase                         │
│ - Dashboard de Monitoramentos                   │
│ - Gerenciamento de Preferências                 │
└──────────────────┬──────────────────────────────┘
                   │ HTTP API
┌──────────────────▼──────────────────────────────┐
│ Agent Backend (Express + TypeScript)            │
│ - API REST (CRUD Monitoramentos)                │
│ - Scheduler (Cron Jobs)                         │
│ - Processamento LLM                             │
│ - Notificações (WhatsApp, Telegram)             │
└──────────────────┬──────────────────────────────┘
                   │ SQL Queries
┌──────────────────▼──────────────────────────────┐
│ Database (Supabase PostgreSQL)                  │
│ - Auth (nativa Supabase)                        │
│ - RLS Policies (Row Level Security)             │
│ - Tabelas de Negócio                            │
│ - Tabelas de Leitura (Agent)                    │
└─────────────────────────────────────────────────┘
```

## Stack Tecnológico

| Camada | Framework | Runtime | Versão |
|--------|-----------|---------|--------|
| **Frontend** | React 18 + Vite | Browser | 18.3.1 |
| **Backend** | Express.js | Node.js | 4.18.2 |
| **Database** | Supabase (PostgreSQL) | Cloud | 2.45.4 |
| **Shared** | TypeScript | Both | 5.3.3 |
| **Linguagem** | TypeScript | Both | 5.3.3 |

## Estrutura de Diretórios

### **Root `/`**
```
.env.example            ← Template públic (commitado)
.env                    ← Secretos (gitignored)
.gitignore              ← Padrões ignorados
package.json            ← Root workspace
turbo.json              ← Orquestração Turbo
ARCHITECTURE.md         ← Este arquivo
```

### **Agent `/agent`**

Backend Node.js TypeScript responsável por monitoramento automatizado.

```
src/
├── index.ts                         ← Express app
├── config.ts                        ← Config centralizado (dotenv)
├── db/
│   ├── client.ts                    ← Singleton Supabase
│   ├── index.ts                     ← Re-exports
│   └── repositories/
│       ├── base.ts                  ← BaseRepository com error handling
│       ├── monitoringRepository.ts  ← Queries de monitoramentos
│       ├── eventsRepository.ts      ← Queries de eventos/matches
│       └── snapshotsRepository.ts   ← Snapshots para dashboard
├── services/
│   ├── monitoringService.ts         ← Orquestração de negócio
│   ├── llmService.ts                ← OpenRouter integration
│   └── notificationService.ts       ← WhatsApp/Telegram/Instagram
├── routes/
│   └── monitoring.ts                ← REST endpoints
├── middleware/
│   └── index.ts                     ← Error handler, logger
└── scheduler/
    └── cron.ts                      ← node-cron jobs

tests/
├── integration/
│   ├── monitoringRepository.integration.test.ts
│   └── fixtures.ts                  ← Test data
└── unit/
    └── llmService.test.ts
```

### **Frontend `/frontend`**

React SPA TypeScript responsável pela UX.

```
src/
├── main.tsx                         ← Vite entry point
├── App.tsx                          ← Router + Auth provider
├── config/
│   └── env.ts                       ← Variáveis públicas
├── services/
│   ├── supabaseClient.ts            ← Wrapper DAL + auth
│   └── ...
├── contexts/
│   ├── AuthContext.tsx              ← Global auth state
│   └── UserContext.tsx              ← User profile
├── hooks/
│   ├── useAuth.ts
│   └── useMonitorings.ts
├── pages/
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   └── ...
├── components/
│   ├── Navigation.tsx
│   ├── MonitoringForm.tsx
│   └── EventsList.tsx
└── styles/
    └── globals.css

public/
└── index.html                       ← HTML template

tests/
├── integration/
│   └── authFlow.integration.test.tsx
└── unit/
    └── hooks/useAuth.test.ts
```

### **Shared `/shared`**

Código reutilizável entre frontend e backend.

```
src/
├── types/
│   ├── database.ts                  ← Tipos Supabase Database
│   ├── api.ts                       ← Tipos de API (request/response)
│   └── services.ts                  ← Tipos de serviços
├── constants/
│   ├── plans.ts                     ← Planos de subscrição
│   ├── notificationTypes.ts         ← Tipos de notificação
│   └── status.ts                    ← Status enums
└── utils/
    ├── validation.ts                ← CPF, Email, etc
    ├── normalize.ts                 ← Normalização de texto
    └── dateHelpers.ts               ← Date utilities
```

### **Backend `/backend`**

Infraestrutura de dados (não é módulo npm).

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql       ← Tabelas principais
│   ├── 002_agent_tables.sql         ← Tabelas de leitura
│   └── 003_rls_policies.sql         ← Segurança
├── seeds/
│   └── 001_seed_plans.sql           ← Dados iniciais
└── README.md                        ← Como rodar migrations

docs/
├── DATABASE.md                      ← Schema documentado
└── MIGRATIONS.md                    ← Guia de versionamento
```

## Fluxo de Dados

### **1. Autenticação (Frontend → Supabase)**

```
User Form → Supabase Auth.signUp/signIn → Session Token
                                         ↓
                              AuthContext (global)
                                         ↓
                              ProtectedRoute checks
```

### **2. Criar Monitoramento (Frontend → Backend → Supabase)**

```
Dashboard.createMonitoring()
  ↓
POST /api/monitoramentos
  ↓
MonitoringService.createMonitoring()
  ↓
MonitoringRepository.createMonitoring()
  ↓
Supabase INSERT monitoramentos
```

### **3. Processamento Agentizado (Agent → Supabase → Frontend)**

```
Cron Job (19:00 daily)
  ↓
listActiveMonitorings() → Fetch PDFs → Extract text
  ↓
Matching (determinístico) + LLM arbitration
  ↓
recordMatchResult() → Insert agent_match_results
  ↓
upsertSnapshot() → Update agent_monitoring_snapshots
  ↓
Frontend polls → Dashboard updates in real-time
```

## Padrões Arquiteturais

### **Data Access Layer (DAL)**

Todos os acessos ao Supabase são centralizados em **repositories**:

```typescript
// ❌ NÃO fazer:
async function getMonitoring(id) {
  return supabase.from("monitoramentos").select().eq("id", id);
}

// ✅ FAZER:
class MonitoringRepository extends BaseRepository {
  async getMonitoring(id) {
    // + error handling
    // + logging
    // + type safety
    return this.client.from("monitoramentos").select().eq("id", id);
  }
}
```

### **Error Handling**

```typescript
try {
  await repository.insert(data);
} catch (error) {
  // BaseRepository.handleError() já faz:
  // 1. console.error com contexto
  // 2. Retorna RepositoryError estruturado
  // 3. Nunca deixa erro vazar para o usuário
  throw this.handleError(error, "methodName");
}
```

### **Type Safety**

```typescript
// Types gerados do schema Supabase
import type { Database } from "@shared/types/database";

// Fully typed queries
const { data } = await client
  .from("monitoramentos")
  .select("*")
  .eq("usuario_id", userId);
  // ✅ data é { id: string; usuario_id: string; ... }[]
```

## Segurança

### **Credentials**

- ✅ `.env` (gitignored) — produção + desenvolvimento
- ✅ `.env.example` — template públic
- ✅ Vercel env vars — via Vercel Dashboard (não em arquivo)
- ❌ Nunca commitar secrets

### **Supabase Keys**

| Chave | Local | Riscos |
|-------|-------|--------|
| **service_role** | Backend (agent) | Acesso total — NUNCA no frontend |
| **anon** | Frontend | RLS protege — ok em client |
| **JWT secret** | Vercel CI/CD | Manter privado |

### **RLS (Row Level Security)**

Frontend queries são **automáticamente filtradas** por `usuario_id`:

```sql
-- Política automática
WHERE usuario_id = auth.uid()
```

Agent usa `service_role` e bypass RLS (OK — é backend confiável).

## Dependências Cruzadas

```
Frontend ← (imports)
├── shared/types/database
├── shared/types/api
└── shared/constants/*

Agent ← (imports)
├── shared/types/database
├── shared/types/api
└── shared/utils/*

Shared ← (imports)
└── nenhuma (zero dependências externas)
```

## Como Estender

### **Adicionar Nova Tabela**

1. **Migration** → `backend/supabase/migrations/00X_*.sql`
2. **Types** → Atualizar `shared/types/database.ts`
3. **Repository** → Criar em `agent/src/db/repositories/`
4. **Service** → Usar repo em `agent/src/services/`
5. **API** → Expor via `agent/src/routes/`

### **Adicionar Novo Serviço Externo (Ex: Telegram)**

1. **Config** → Adicionar variáveis em `agent/src/config.ts`
2. **Service** → Estender `NotificationService`
3. **API** → Criar rota dedicada se necessário
4. **Tests** → Adicionar testes integration

## Performance

- ✅ **Vite** — bundle <100KB (Frontend)
- ✅ **Express** — lightweight (Agent)
- ✅ **Lazy loading** — rotas React
- ✅ **Connection pooling** — Supabase gerencia
- ✅ **Caching** — Frontend context + localStorage

## Monitoramento

- Logs centralizados em BaseRepository
- Supabase Logs (dashboard próprio)
- Vercel deployment logs
- Agent logs em `agent_daily_runs` tabela
