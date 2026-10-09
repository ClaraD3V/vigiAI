# vigiAI — Monitoramento Inteligente de Publicações

> Acompanhe automaticamente publicações e diários oficiais, receba notificações e análises em tempo real com IA.

## 📖 O Que É vigiAI?

**vigiAI** é uma plataforma inteligente que monitora publicações em diários oficiais, jornais e sites. Quando algo relevante é encontrado, o sistema:

- 🔍 **Busca e extrai** informações de PDFs e páginas web
- 🤖 **Analisa com IA** para identificar publicações importantes
- 📱 **Notifica via WhatsApp, Telegram** e outros canais
- 📊 **Centraliza tudo** em um dashboard moderno e intuitivo

**Use cases:**
- Licitações e contratos públicos
- Notificações de órgãos reguladores
- Acompanhamento de empresas concorrentes
- Monitoramento de regulamentações do seu setor
- Diários oficiais do seu estado/município

## 🎯 Como Funciona

```
1. Você configura monitoramentos → "Quero avisos sobre licititas em SP"
                                        ↓
2. Sistema busca automaticamente → PDFs, sites, diários oficiais
                                        ↓
3. IA analisa o conteúdo → Extrai e classifica informações
                                        ↓
4. Se encontrar algo → WhatsApp/Telegram/Email com resumo
                                        ↓
5. Você acessa o dashboard → Histórico completo e análises
```

---

## 🚀 Começar Rápido

### Pré-requisitos

- **Node.js** 18+
- **Conta Supabase** (gratuita em https://supabase.com)
- **Yarn** 1.22+ (ou npm)

### 1️⃣ Clone e Instale

```bash
git clone https://github.com/ClaraD3V/vigiAI.git
cd vigiAI
yarn install
```

### 2️⃣ Configure Variáveis de Ambiente

```bash
# Copie o template
cp .env.example .env

# Edite .env com suas credenciais:
# - SUPABASE_URL (de https://app.supabase.com)
# - SUPABASE_SERVICE_ROLE_KEY (Admin API key)
# - OPENROUTER_API_KEY (de https://openrouter.ai)
# - URLs de notificação (WhatsApp, Telegram, etc)
```

### 3️⃣ Execute Migrations do Banco

```bash
cd backend/supabase
npx supabase migration up
cd ../..
```

### 4️⃣ Inicie em Desenvolvimento

Abra **3 terminais** na raiz do projeto:

**Terminal 1 — Backend (Agent)**
```bash
cd agent
yarn dev
# Será iniciado em http://localhost:3001
```

**Terminal 2 — Frontend (Interface)**
```bash
cd frontend
yarn dev
# Será iniciado em http://localhost:5173
```

**Terminal 3 — Type Checking (Opcional, recomendado)**
```bash
yarn type-check --watch
```

### 5️⃣ Acesse

Abra o navegador: **http://localhost:5173**

Faça login ou crie uma conta → Comece a monitorar!

---

## 📁 Estrutura do Projeto

```
vigiAI/
├── agent/                      ← Backend em Express + TypeScript
│   ├── src/
│   │   ├── index.ts           ← API REST
│   │   ├── scheduler/         ← Jobs automáticos (cron)
│   │   ├── services/          ← Lógica de negócio
│   │   ├── db/                ← Acesso ao Supabase
│   │   └── routes/            ← Endpoints da API
│   └── package.json
│
├── frontend/                   ← Interface em React + TypeScript
│   ├── src/
│   │   ├── pages/             ← Telas da aplicação
│   │   ├── components/        ← Componentes reutilizáveis
│   │   ├── services/          ← API client, auth
│   │   ├── hooks/             ← React hooks customizados
│   │   └── contexts/          ← Estado global
│   └── package.json
│
├── shared/                     ← Tipos e utilitários compartilhados
│   ├── src/
│   │   ├── types/             ← TypeScript types (banco, API)
│   │   ├── constants/         ← Enums, configurações
│   │   └── utils/             ← Funções helper
│   └── package.json
│
├── backend/                    ← Infraestrutura de dados
│   └── supabase/
│       ├── migrations/        ← Versionamento do banco
│       ├── seeds/             ← Dados iniciais
│       └── README.md
│
├── ARCHITECTURE.md            ← Design técnico detalhado
├── DEVELOPMENT.md             ← Guia de desenvolvimento
├── .env.example               ← Template de configuração
└── package.json               ← Root workspace (Yarn)
```

---

## 🛠️ Guia Técnico

### Tech Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Frontend** | React 18 + TypeScript + Vite + Supabase JS | 18.3 |
| **Backend** | Express.js + Node.js + TypeScript | 4.18 |
| **Database** | Supabase (PostgreSQL) + RLS | 2.45 |
| **Build** | Turbo, TypeScript 5.3 | 5.3 |
| **Deploy** | Vercel (Frontend) + Railway (Backend) | — |

### Scripts Principais

#### Root (Monorepo)
```bash
yarn dev                # ⚡ Inicia todos os serviços em paralelo
yarn build              # 🔨 Build de produção
yarn type-check         # ✅ Verifica erros TypeScript
yarn test               # 🧪 Roda todos os testes
yarn lint               # 🔍 Linter (se configurado)
yarn clean              # 🗑️ Remove builds e node_modules
```

#### Agent (Backend)
```bash
cd agent

yarn dev                # Inicia com ts-node (porta 3001)
yarn build              # Compila TypeScript → dist/
yarn start              # Inicia build compilado
yarn test               # Roda testes Jest
yarn type-check         # Verifica tipos sem compilar
```

#### Frontend
```bash
cd frontend

yarn dev                # Dev server Vite (porta 5173)
yarn build              # Build de produção
yarn test               # Roda testes
yarn preview            # Preview do build
```

### Variáveis de Ambiente Essenciais

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxx...

# API Externa
OPENROUTER_API_KEY=sk-or-xxxxx

# Frontend (publicas)
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxx...

# Notificações (opcional)
WHATSAPP_API_URL=https://...
TELEGRAM_BOT_TOKEN=123456:ABCxxx
```

Veja [DEVELOPMENT.md](./DEVELOPMENT.md) para lista completa.

### Estrutura de Banco de Dados

As principais tabelas:

- **`usuarios`** — Contas e perfis
- **`monitoramentos`** — Alertas configurados pelo usuário
- **`agent_match_results`** — Publicações encontradas
- **`agent_monitoring_snapshots`** — Cache para dashboard
- **`agent_daily_runs`** — Log de execuções automáticas

Veja [backend/supabase/README.md](./backend/supabase/README.md) para schema completo.

---

## 🧪 Testes

```bash
# Rodar todos os testes (root)
yarn test

# Rodar testes em watch mode
yarn test:watch

# Cobertura de testes
yarn test:coverage

# Apenas um pacote
cd agent && yarn test
cd frontend && yarn test
```

---

## 🚢 Deploy

### Frontend (Vercel)

1. Conecte seu repo no [Vercel Dashboard](https://vercel.com)
2. Configure:
   - **Root Directory:** `frontend`
   - **Build Command:** `yarn build` (ou deixar automático)
3. Adicione env vars no Vercel:
   - `VITE_API_URL`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Backend (Railway / Fly.io)

1. Faça deploy para Railway ou Fly.io
2. Comando build: `yarn build`
3. Comando start: `yarn start`
4. Variáveis de ambiente (igual `.env`):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENROUTER_API_KEY`
   - etc.

### Database (Supabase)

Migrations são automáticas. Ou execute manualmente:

```bash
npx supabase migration up --project-id YOUR_PROJECT_ID
```

---

## 🔐 Segurança

### ⚠️ Importante: Credenciais Expostas

Se você clonou este repo antes, as credenciais foram expostas publicamente no Git:

1. **Regenere no Supabase**
   - https://app.supabase.com → Project Settings → API Keys
   - Regenere `service_role` key

2. **Regenere no OpenRouter**
   - https://openrouter.ai/keys
   - Crie nova API key

3. **Atualize seu `.env`** com as novas credenciais

### Boas Práticas

- ✅ `.env` (gitignored) — nunca commitar secrets
- ✅ `.env.example` — template publico com placeholders
- ✅ Variáveis de env no Vercel/Railway — via dashboard
- ✅ Supabase RLS ativa — dados protegidos por usuário
- ❌ Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend

---

## 📚 Documentação

| Arquivo | Para Quem |
|---------|-----------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Arquitetos, leads — Design e padrões |
| **[DEVELOPMENT.md](./DEVELOPMENT.md)** | Desenvolvedores — Setup, troubleshooting |
| **[backend/supabase/README.md](./backend/supabase/README.md)** | DBAs, backend — Schema, migrations |

---

## 🤝 Contribuindo

1. Crie uma branch: `git checkout -b feature/sua-feature`
2. Commit com mensagem clara: `git commit -m "feat: descrição"`
3. Push: `git push origin feature/sua-feature`
4. Abra um Pull Request para `main`

**Dica:** Rode `yarn type-check` e `yarn test` antes de fazer commit!

---

## 🔗 Links Úteis

- **Repositório:** https://github.com/ClaraD3V/vigiAI
- **Supabase Console:** https://app.supabase.com
- **OpenRouter API:** https://openrouter.ai
- **Deploy Frontend:** https://vercel.com
- **Deploy Backend:** https://railway.app ou https://fly.io

---

## 📞 Suporte & Troubleshooting

**Problema:** Erro ao conectar ao Supabase
→ Verifique `.env`, rode `yarn type-check`

**Problema:** Frontend não consegue chamar API
→ Verifique `VITE_API_URL`, acesso CORS no backend

**Problema:** Migrations falhando
→ Veja [backend/supabase/README.md](./backend/supabase/README.md)

Mais dúvidas? Veja [DEVELOPMENT.md](./DEVELOPMENT.md)

---

**vigiAI v2.0** — Construído com TypeScript, Monorepo e Boas Práticas de Mercado ✨

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
