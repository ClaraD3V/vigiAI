# vigiAI v2.0 — Monitoramento Inteligente de Publicações

**Refatorado em TypeScript com Monorepo, Express Backend, React Frontend, e Testes Integrados.**

## 🚀 Quick Start

### Pré-requisitos
- Node.js 18+
- Conta Supabase (grátis em https://supabase.com)

### Setup

```bash
# 1. Clone e instale
git clone https://github.com/ClaraD3V/vigiAI.git
cd vigiAI
npm install

# 2. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais Supabase

# 3. Rode migrations do banco
cd backend/supabase
npx supabase migration up

# 4. Desenvolva (3 terminais)
# Terminal 1: Backend agent
cd agent && npm run dev

# Terminal 2: Frontend React
cd frontend && npm run dev

# Terminal 3: Type checking
npm run type-check

# Acesse http://localhost:5173
```

## 📁 Estrutura

```
vigiAI/
├── agent/              ← Backend Node.js (Express + TypeScript)
├── frontend/           ← Frontend React (Vite + TypeScript)
├── shared/             ← Tipos compartilhados
├── backend/            ← Migrations SQL + Seeds
├── ARCHITECTURE.md     ← Documentação técnica (LEIA ISTO!)
├── DEVELOPMENT.md      ← Setup detalhado
└── .env.example        ← Template de config
```

## 🔐 Segurança

**IMPORTANTE**: Credenciais foram expostas. Você PRECISA:

1. **Supabase**: Regenere `service_role` key
   - https://app.supabase.com → Project Settings → API Keys

2. **OpenRouter**: Regenere API key
   - https://openrouter.ai/keys

3. Isso garante que apenas novas chaves funcionam

## 🏗️ Arquitetura

- **3 camadas independentes**: Frontend (React), Backend (Express), Database (Supabase)
- **TypeScript strict mode**: Type-safe em 100%
- **DAL (Data Access Layer)**: Repositórios centralizados
- **RLS (Row Level Security)**: Dados protegidos por usuário
- **Testes Integration**: Agent ↔ Supabase

## 📚 Documentação

| Arquivo | Descrição |
|---------|-----------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Design técnico, estrutura, padrões |
| **[DEVELOPMENT.md](./DEVELOPMENT.md)** | Setup dev, troubleshooting, env vars |
| **[backend/supabase/README.md](./backend/supabase/README.md)** | Migrations, schema SQL |

## 🛠️ Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite + Supabase JS |
| Backend | Express.js + TypeScript + Node.js |
| Database | Supabase (PostgreSQL) + RLS Policies |
| Auth | Supabase Auth nativa |
| Shared | TypeScript types (zero dependências) |
| CI/CD | GitHub Actions + Vercel |

## 🧪 Testes

```bash
# Rodar testes
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## 📝 Scripts Principais

```bash
# Monorepo (root)
npm run dev           # Inicia tudo em paralelo
npm run build         # Build agent + frontend
npm run type-check    # Verifica erros TypeScript
npm run test          # Roda testes

# Agent específico
cd agent
npm run dev           # Inicia na porta 3001
npm run build         # Compila TypeScript

# Frontend específico
cd frontend
npm run dev           # Inicia na porta 5173
npm run build         # Build para produção
```

## 🚢 Deploy

### Frontend (Vercel)
```bash
# Vercel auto-detecta vite.config.ts
# Rodar: npm run build
```

### Backend (Railway / Fly.io)
```bash
# Dockerfile ou buildpacks
# npm run build && npm start
```

### Database (Supabase)
```bash
# Migrations rodam automático em deploy
# Ou manualmente:
npx supabase migration up --project-id YOUR_ID
```

## 🔗 Links Úteis

- **Código**: https://github.com/ClaraD3V/vigiAI
- **Supabase Console**: https://app.supabase.com
- **OpenRouter**: https://openrouter.ai
- **Vercel**: https://vercel.com

## 🤝 Contribuindo

1. Crie branch: `git checkout -b feature/sua-feature`
2. Commit: `git commit -m "feat: descrição"`
3. Push: `git push origin feature/sua-feature`
4. PR para `main`

## ⚠️ Checklist Pós-Refatoração

Antes de rodar em produção:

- [ ] `.env` rotacionado (Você)
- [ ] `.gitignore` expandido (✅ done)
- [ ] TypeScript compila sem erros (`npm run type-check`)
- [ ] Testes passam (`npm run test`)
- [ ] Frontend acessa API (`VITE_API_URL`)
- [ ] Agent conecta ao Supabase
- [ ] Migrations rodaram no banco
- [ ] `vercel.json` configurado com env vars
- [ ] Documentação atualizada

## 📞 Suporte

Dúvidas? Veja [DEVELOPMENT.md](./DEVELOPMENT.md) ou abra issue no GitHub.

---

**Refatorado com TypeScript, Monorepo, e Boas Práticas de Mercado ✨**

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
