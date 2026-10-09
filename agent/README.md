# vigiAI Agent — Busca Inteligente em Editais IBAMSP

> Agente automatizado que busca usuários em editais de concursos públicos do IBAMSP, extrai PDFs e envia notificação por email.

---

## ⚡ Quickstart (3 minutos)

```bash
# 1. Instalar dependências
npm install
npx playwright install chromium

# 2. Configurar email
cp .env.example .env
# Edite .env com suas credenciais Gmail

# 3. Executar
node agent-v2.cjs
```

---

## 🎯 O Que Faz

Busca automaticamente usuários em editais de concursos públicos:

1. **Navega** IBAMSP com Playwright
2. **Identifica** documentos de "Classificação Final" (com LLM opcional)
3. **Extrai** texto de PDFs com pdfjs-dist
4. **Encontra** o usuário no documento
5. **Notifica** por email quando encontrado

---

## 💰 Custos

| Tecnologia | Custo |
|-----------|-------|
| Playwright | 🆓 Grátis |
| pdfjs-dist | 🆓 Grátis |
| OpenRouter LLM | 🆓 Gratuito (opcional) |
| Gmail | 🆓 Grátis |

**Total: R$0** 💚

---

## 🚀 Como Usar

### 1. Instalar
```bash
npm install
npx playwright install chromium
```

### 2. Configurar Email (Obrigatório)

Crie um arquivo `.env`:
```bash
cp .env.example .env
```

Edite `.env` com suas credenciais:
```
EMAIL_USER=seu-email@gmail.com
EMAIL_PASSWORD=sua-app-password-16-caracteres
```

**Como gerar App Password do Gmail:**
1. Acesse: https://myaccount.google.com/apppasswords
2. Ative 2FA (se não tiver)
3. Selecione: **Mail** + **Windows Computer**
4. Copie a senha gerada (16 caracteres)
5. Cole no `.env`

### 3. Executar
```bash
node agent-v2.cjs
```

O agente vai:
- Buscar editais de Santos
- Encontrar documentos de classificação final
- Extrair PDFs
- Buscar o usuário configurado
- Enviar email quando encontrar ✅

---

## 📁 Arquivos

```
agent/
├── agent-v2.cjs              ← Executável principal
├── .env.example              ← Template de configuração
├── .env                       ← Suas credenciais (git-ignored)
├── README.md                 ← Este arquivo
├── package.json
└── src/
    ├── llm/
    │   ├── tesseractOcr.cjs  ← Extração de PDF
    │   └── client.cjs        ← Integração OpenRouter
    └── notifications/
        └── email.cjs         ← Envio de email
```

---

## ⚙️ Variáveis de Ambiente

### Obrigatório
- `EMAIL_USER` - Email Gmail
- `EMAIL_PASSWORD` - App Password (16 caracteres)

### Opcional
- `OPENROUTER_API_KEY` - Para melhor identificação com LLM

---

## 🔧 Configuração Avançada

### Alterar Usuário/Cidade

Edite `agent-v2.cjs` linha ~18:
```javascript
const config = {
  searchCity: "Santos",           // Mudar cidade
  searchNumber: "11659",           // Número inscrição
  searchName: "JOSUEL DE JESUS MIRANDA", // Nome
  baseUrl: "https://www.ibamsp-concursos.org.br",
};
```

### Usar LLM para Melhor Identificação

Adicione ao `.env`:
```
OPENROUTER_API_KEY=seu-token-aqui
```

Obter em: https://openrouter.ai/

---

## 🐛 Troubleshooting

**"Playwright not found"**
```bash
npx playwright install chromium
```

**"Module not found"**
```bash
npm install
```

**"Email não enviou"**
- Verificar App Password está correto
- Verificar 2FA ativado no Gmail
- Verificar .env tem EMAIL_USER e EMAIL_PASSWORD

**"Não encontra usuário"**
- PDF pode ter qualidade baixa
- Verificar se o número de inscrição está correto
- Tentar com outro edital

---

## 📊 Como Funciona

### Fase 1: Navegação
- Acessa IBAMSP
- Busca editais da cidade
- Extrai lista de documentos

### Fase 2: Identificação (Opcional com LLM)
- Procura por "Classificação Final" nos nomes
- Se LLM configurado: usa inteligência artificial
- Se LLM não configurado: usa palavras-chave

### Fase 3: Extração
- Baixa PDF
- Extrai texto com pdfjs-dist
- Procura pelo usuário

### Fase 4: Notificação
- Se encontrar: envia email
- Se não encontrar: continua próximo edital

---

## 📞 Próximas Ações

1. ✅ Instalar: `npm install && npx playwright install chromium`
2. ✅ Configurar: `cp .env.example .env` (adicione credenciais)
3. ✅ Executar: `node agent-v2.cjs`
4. ✅ Verificar email de notificação
5. (Opcional) Agendar com cron job

---

## 🔗 Links Úteis

- IBAMSP Concursos: https://www.ibamsp-concursos.org.br
- Gmail App Passwords: https://myaccount.google.com/apppasswords
- OpenRouter (LLM): https://openrouter.ai/
- Playwright Docs: https://playwright.dev/

---

**Status**: ✅ Pronto | **Versão**: 2.0 | **Custo**: 🆓 R$0
