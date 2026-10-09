# DEVELOPMENT.md — Setup de Desenvolvimento

## Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta Supabase (free tier ok)
- Editor: VS Code recomendado

## Setup Inicial

### 1. Clone e Dependências

```bash
git clone https://github.com/ClaraD3V/vigiAI.git
cd vigiAI
npm install  # Instala root + workspaces (agent, frontend, shared)
```

### 2. Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

```bash
cp .env.example .env
```

**`.env` deve ter:**
```bash
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_...

# Frontend (público)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# OpenRouter LLM
OPENROUTER_API_KEY=sk-or-v1-...

# WhatsApp (opcional)
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
```

### 3. Supabase Setup

```bash
# (1) Criar projeto em https://app.supabase.com
# (2) Copiar URL e keys

# (3) Rodar migrations
cd backend/supabase
npx supabase migration up

# (4) Seed de dados (planos, etc)
npx supabase db seed
```

### 4. Desenvolvimento Local

```bash
# Terminal 1 — Backend agent
cd agent
npm run dev
# Roda em http://localhost:3001

# Terminal 2 — Frontend
cd frontend
npm run dev
# Roda em http://localhost:5173

# Terminal 3 — (Opcional) Monitorar tipos
npm run type-check --watch
```

Acesse http://localhost:5173 → Login → Dashboard

## Comandos Úteis

### Build & Type Check

```bash
# Build tudo
npm run build

# Type checking (detita erros TS sem compilar)
npm run type-check

# Lint (quando implementado)
npm run lint
```

### Testes

```bash
# Rodar todos os testes
npm run test

# Testes em watch mode
npm run test:watch

# Com coverage
npm run test:coverage
```

### Debugging

**Backend (Node.js):**
```bash
node --inspect-brk dist/index.js
# Abrir chrome://inspect
```

**Frontend (Vite):**
- DevTools do navegador (F12)
- Breakpoints no VS Code com debugger

## Estrutura de Branches

```
main/
  └── sempre production-ready
  
feature/
  ├── feature/refactor-types
  ├── feature/add-telegram-notifications
  └── ...

bugfix/
  ├── bugfix/cron-schedule-issue
  └── ...
```

## Code Style

- **Prettier** (automático com VS Code)
- **TypeScript strict mode** (tsconfig.json)
- **No console logs em produção** — usar logger
- **Async/await** (não promises aninhadas)

## Troubleshooting

### "Cannot find module '@shared/types'"

Verifique que `tsconfig.json` tem:
```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@shared/*": ["../../../shared/src/*"]
    }
  }
}
```

### Supabase não conecta

```bash
# (1) Verificar .env
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# (2) Testar conectividade
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  $SUPABASE_URL/rest/v1/monitoramentos?limit=1
```

### Porta 3001/5173 já em uso

```bash
# Kill process na porta
lsof -i :3001
kill -9 <PID>

# Ou usar porta diferente
PORT=3002 npm run dev
```

## Environment Variables Completo

```bash
# === Database ===
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_...

# === Frontend (Public) ===
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:3001

# === LLM ===
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free

# === Notifications ===
WHATSAPP_TOKEN=wab_...
WHATSAPP_PHONE_NUMBER_ID=1234567890

# === Env ===
NODE_ENV=development
PORT=3001
```

## Próximos Passos

1. Implementar Signup form completo
2. Adicionar MonitoringForm (criar monitoramento via UI)
3. Implementar integração WhatsApp API
4. Adicionar LLM calls (OpenRouter)
5. Criar testes integration
6. Deploy em Vercel + Railway/Fly.io
