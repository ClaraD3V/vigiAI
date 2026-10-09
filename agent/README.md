# vigiAI Agent — Busca Inteligente em Editais de Concursos

> Agente automatizado que busca candidatos em editais de concursos públicos, identifica publicações e notifica por email + WhatsApp.

**Versão:** 2.0 | **Status:** ✅ Pronto | **Custo:** 🆓 R$0

---

## 📋 Índice

- [O que faz](#-o-que-faz)
- [LLMs e arquitetura](#-llms-e-arquitetura)
- [Por que essas LLMs](#-por-que-essas-llms-foram-escolhidas)
- [Quickstart](#-quickstart)
- [Configuração](#-configuração)
- [Execução](#-execução)
- [Estrutura do código](#-estrutura-do-código)
- [Testes](#-testes)

---

## 🎯 O que faz

**vigiAI Agent** é um orquestrador inteligente que:

1. **Busca automaticamente** usuários em editais de concursos públicos (IBAMSP)
2. **Identifica documentos-chave** usando IA (qual é a "Classificação Final")
3. **Extrai texto** de PDFs com OCR
4. **Encontra o candidato** usando busca determinística + IA
5. **Notifica por email + WhatsApp** quando encontrado

### Caso de Uso Real

No **Edital nº 149/2026** de Santos:
- 15.289 candidatos em 733 páginas
- 2.496 fazendo prova na **Unisanta** (prédio do hackathon)
- vigiAI avisa cada um: *"Você foi convocado! Prova em 18/10, 8h da manhã."*

---

## 🧠 LLMs e Arquitetura

### Tecnologias Usadas

| Componente | Tecnologia | Custo | Uso |
|-----------|-----------|-------|-----|
| **Navegação** | Playwright | 🆓 Grátis | Automação de browser |
| **OCR** | Tesseract.js | 🆓 Grátis | Extração de texto PDF |
| **Decisão (LLM)** | Meta Llama 3.3 70B (OpenRouter) | 🆓 Gratuito | Identificação de documentos |
| **Busca** | Regex + matching determinístico | 🆓 Grátis | Localização do candidato |
| **Notificações** | Gmail SMTP + Z-API | 🆓 Grátis | Email + WhatsApp |

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────┐
│ FASE 1: Navegação (Playwright)                         │
│ → Lista editais da cidade                              │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ FASE 2: Identificação (LLM Llama 3.3)                  │
│ → Qual PDF é "Classificação Final"?                    │
│ → Fallback: regex com keywords                         │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ FASE 3: Extração (Tesseract.js)                        │
│ → Extrai texto do PDF                                  │
│ → Busca nome + inscrição (determinístico)             │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ FASE 4: Notificação                                    │
│ → 📧 Email (Gmail SMTP)                                │
│ → 📱 WhatsApp (Z-API)                                  │
│ → 💾 Prepara dados para Supabase                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🤔 Por que essas LLMs foram escolhidas?

### 1. **Meta Llama 3.3 70B Instruct** (OpenRouter)

**Por que Llama 3.3?**
- ✅ **Gratuita** via OpenRouter (modelo free tier)
- ✅ **Rápida e precisa** em tarefas de classificação
- ✅ **Eficiente em tokens** (não processa PDF inteiro, só trechos)
- ✅ **Excelente em português**
- ✅ **Sem dependência de chaves caras** (OpenRouter oferece tier free)

**O que faz:**
```
Entrada: ["Classificação Final", "Prova Objetiva", "Gabarito"]
Pergunta: "Qual é o documento de Classificação Final?"
Saída: "Classificação Final"
```

**Custo:** ~0,05¢ por execução (ou grátis no tier free)

---

### 2. **Tesseract.js** (OCR)

**Por que Tesseract.js?**
- ✅ **100% gratuito** (software open-source)
- ✅ **Roda no Node.js** (não precisa de APIs externas)
- ✅ **Suporta português**
- ✅ **Bom para PDFs de baixa qualidade** (editais do governo)

**O que faz:**
```
PDF → (Tesseract.js) → Texto extraído
"JOSUEL DE JESUS MIRANDA    11659    SALA 201"
```

**Alternativas rejeitadas:**
- ❌ Claude Vision: cara ($0,003/imagem)
- ❌ Google Cloud Vision: requer cartão de crédito + cobrança
- ❌ Pdfjs-dist: não faz OCR real (só lê texto embutido)

---

### 3. **Busca Determinística** (Regex + String Matching)

**Por que não só LLM?**
- ✅ **Determinístico**: sempre encontra o mesmo resultado
- ✅ **Sem alucinações de IA**
- ✅ **Custava 0** (nenhuma API)
- ✅ **Rápido**: milissegundos vs. segundos

**O que faz:**
```javascript
texto.includes(`${nome} ${inscrição}`)  // Match exato
```

---

## ⚡ Quickstart (5 minutos)

### 1. Instalar
```bash
cd agent
npm install
npx playwright install chromium
```

### 2. Configurar `.env`
```bash
cp .env.example .env
```

Edite com suas credenciais:
```ini
# Gmail (obrigatório para email)
EMAIL_USER=seu-email@gmail.com
EMAIL_PASSWORD=sua-app-password-16-caracteres

# WhatsApp (obrigatório para notificações SMS)
WHATSAPP_PHONE=5511991989415
ZAPI_INSTANCE_ID=sua-instance-id
ZAPI_TOKEN=seu-token
ZAPI_CLIENT_TOKEN=seu-client-token

# LLM (opcional, mas recomendado)
OPENROUTER_API_KEY=sua-chave-openrouter
```

### 3. Executar
```bash
node agent-v2.cjs
```

**Saída esperada:**
```
═══════════════════════════════════════════════════════════
🤖 vigiAI Agent v2 | Busca Inteligente
   Target: JOSUEL DE JESUS MIRANDA (11659)
   Cidade: Santos
═══════════════════════════════════════════════════════════

[00:12] ⏳ FASE 1: Navegação Inteligente
   └─ Iniciando navegador Chromium... ✅
   └─ Página carregada ✅
   📊 Editais encontrados: 8

[00:34] ⏳ FASE 2: Análise Inteligente com LLM
   └─ Edital 1: Analisando com LLM... ✅
   └─ LLM identificou: Classificação Final

[01:05] ⏳ FASE 3: Extração de Texto com OCR
   └─ Processando PDF... ✅

[01:15] ✅ USUÁRIO ENCONTRADO!

[01:20] ⏳ FASE 4: Notificação e Cadastro
   └─ Enviando email... ✅
   └─ Enviando WhatsApp... ✅
```

---

## 🔧 Configuração

### Credenciais de Email (Gmail)

1. Ative 2FA em sua conta Google
2. Acesse: https://myaccount.google.com/apppasswords
3. Selecione: **Mail** + **Windows Computer**
4. Copie a senha de 16 caracteres
5. Cole no `.env` como `EMAIL_PASSWORD`

### Credenciais de WhatsApp (Z-API)

1. Cadastre-se em: https://z-api.io/
2. Crie uma instância
3. Copie: `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN`
4. Cole no `.env`

### Credenciais de LLM (OpenRouter)

1. Crie conta em: https://openrouter.ai/
2. Gere uma chave API
3. Cole no `.env` como `OPENROUTER_API_KEY`
4. (Opcional: OpenRouter oferece tier free)

---

## 🚀 Execução

### Modo Manual
```bash
node agent-v2.cjs
```

### Modo Agendado (Cron)

Edite `crontab -e`:
```bash
# Executar todo dia às 00:05 (5 minutos após leitura do Diário)
5 0 * * * cd /home/user/vigiAI/agent && node agent-v2.cjs >> logs/agent.log 2>&1
```

### Modo Monitorado (PM2)

```bash
npm install -g pm2
pm2 start agent-v2.cjs --name "vigiai-agent" --cron "5 0 * * *"
pm2 save
```

---

## 📁 Estrutura do Código

```
agent/
├── agent-v2.cjs                    ← Executável principal (orquestrador)
├── .env.example                    ← Template de configuração
├── .env                            ← Suas credenciais (git-ignored)
├── README.md                       ← Este arquivo
├── package.json
├── package-lock.json
│
└── src/
    ├── llm/
    │   ├── tesseractOcr.cjs       ← OCR com Tesseract.js
    │   └── client.cjs             ← Cliente OpenRouter (DEPRECATED)
    │
    └── notifications/
        ├── email.cjs              ← Envio Gmail SMTP
        ├── email.test.cjs         ← Testes de email
        ├── whatsapp.cjs           ← Envio Z-API
        └── whatsapp.test.cjs      ← Testes de WhatsApp
```

### Arquivo Principal: `agent-v2.cjs`

```javascript
// Fase 1: Navegação com Playwright
async function phase1Navigation() { ... }

// Fase 2: Identificação com LLM (Llama 3.3)
async function phase2IdentifyDocument() { ... }

// Fase 3: OCR com Tesseract.js
async function phase3ExtractWithOCR() { ... }

// Fase 4: Notificação (Email + WhatsApp)
async function phase4NotifyAndStore() { ... }
```

---

## ✅ Testes

### Rodar Testes
```bash
# Testes de WhatsApp
node --test src/notifications/whatsapp.test.cjs

# Testes de Email
node --test src/notifications/email.test.cjs
```

### Teste Manual de Notificações
```bash
node -e "
const { sendEmail } = require('./src/notifications/email.cjs');
const { sendWhatsApp } = require('./src/notifications/whatsapp.cjs');

// Email de teste
await sendEmail('seu-email@gmail.com', 'Teste vigiAI', 'Funcionou!');

// WhatsApp de teste
await sendWhatsApp('5511991989415', 'Teste vigiAI ✅');
"
```

---

## 🐛 Troubleshooting

### "Playwright not found"
```bash
npx playwright install chromium
```

### "Module not found"
```bash
npm install
npm audit fix
```

### "Email não enviou"
- Verificar `EMAIL_USER` e `EMAIL_PASSWORD` no `.env`
- Confirmar que gerou App Password (não use senha da conta)
- Ativar 2FA no Gmail

### "WhatsApp não enviou"
- Verificar `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN`
- Verificar formato do telefone: `55 + DDD + NÚMERO` (ex: 5511991989415)
- Testar conexão: `curl https://api.z-api.io/instances/...`

### "Não encontra o usuário"
- PDF pode ter qualidade ruim (OCR precisa de melhor contraste)
- Número de inscrição errado
- Nome com acentuação diferente no PDF
- Usar outro edital para testar

### "LLM não está funcionando"
- Se `OPENROUTER_API_KEY` vazio → usa fallback de regex
- Verificar chave na https://openrouter.ai/
- Testar limite de requisições

---

## 📊 Métricas e Performance

| Métrica | Valor |
|---------|-------|
| Tempo total | ~2-3 minutos |
| Fase 1 (navegação) | ~30s |
| Fase 2 (LLM) | ~20s por edital |
| Fase 3 (OCR) | ~40s por PDF |
| Fase 4 (notificação) | ~10s |
| **Custo por execução** | **🆓 R$0** |
| **Candidatos por execução** | 1+ |

---

## 🔗 Links Úteis

- 📜 IBAMSP Concursos: https://www.ibamsp-concursos.org.br
- 🔐 Gmail App Passwords: https://myaccount.google.com/apppasswords
- 🤖 OpenRouter LLM: https://openrouter.ai/
- 📱 Z-API WhatsApp: https://z-api.io/
- 🎭 Playwright Docs: https://playwright.dev/
- 👁️ Tesseract.js: https://github.com/naptha/tesseract.js

---

## 🎓 Próximas Ações

- [ ] Instalar: `npm install && npx playwright install chromium`
- [ ] Configurar: `cp .env.example .env` (adicione credenciais)
- [ ] Testar: `node --test src/notifications/whatsapp.test.cjs`
- [ ] Executar: `node agent-v2.cjs`
- [ ] Verificar email + WhatsApp recebidos ✅
- [ ] (Opcional) Agendar com cron job ou PM2

---

**Feito com ❤️ para o Hackathon Unisanta 2026**

