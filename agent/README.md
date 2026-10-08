# Agente vigiAI — monitoramento de concursos públicos (IBAM)

Agente responsável por **descobrir se um edital de resultado/homologação de
concurso público se refere a um candidato monitorado** (nome completo +
número de inscrição) e notificar via WhatsApp quando houver match (candidato
aprovado/convocado/nomeado). O andamento do monitoramento durante o mês —
inclusive para quem ainda não teve match — é acompanhado pelo usuário no
dashboard do front, alimentado pelo agente via Supabase (veja "Dashboard
(Supabase)" abaixo).

A fonte de dados é o [IBAM Concursos](https://www.ibamsp-concursos.org.br/),
filtrado por cidade via o parâmetro `busca=` da própria URL de busca do site
— o mesmo mecanismo serve qualquer município, não só Santos (veja
"Escalando para outras cidades" abaixo).

## Por que é barato em tokens

O agente **não manda nenhum PDF inteiro para nenhum LLM**. O fluxo é:

```
lista concursos da cidade (busca=cidade, paginado)
        ↓
por concurso: só baixa/cacheia os PDFs cujo rótulo indica resultado
(homologação, classificação final, convocação — allowlist, não todos os
documentos do concurso)
        ↓
busca determinística por nome + inscrição no texto (sem LLM)
        ↓
match de confiança média (só nome OU só inscrição): LLM (opcional) arbitra
se é o mesmo candidato — sem LLM, fica só registrado, sem notificar
        ↓
só em caso de match confirmado: LLM (opcional) classifica o pequeno trecho
encontrado e, opcionalmente, gera a mensagem de WhatsApp
        ↓
WhatsApp
```

Cada documento é baixado e processado **uma única vez** (cache em disco por
URL) e registrado num índice próprio por cidade (`data/ibam/documentos-{cidade}.json`),
independente de quantos monitoramentos existam — permitindo inclusive que um
monitoramento criado depois de um resultado já publicado seja checado contra
o histórico, sem reprocessar nada.

Sem `OPENROUTER_API_KEY` configurada, o agente continua funcionando
normalmente: a classificação do tipo de publicação e do prazo cai para um
classificador por palavras-chave/regex (`src/llm/classifyPublication.js`).

## Como rodar

```bash
cd agent
npm install
cp .env.example .env   # ajuste as variáveis conforme necessário
npm start               # sobe a API em http://localhost:3001 e o agendador
```

```bash
npm test                 # suíte determinística (sem rede, sem LLM, sem WhatsApp)
```

## API

- `POST /monitoramentos` — registra um monitoramento. Aceita o mesmo payload
  que `landing-page/agent-contract.js` já monta:

  ```json
  {
    "monitoramento_id": "mon_01JXYZ",
    "candidato": {
      "nome_completo": "JOÃO DA SILVA",
      "numero_inscricao": "123456",
      "telefone_whatsapp": "5513999990000",
      "cidade": "Santos"
    }
  }
  ```

  `candidato.telefone_whatsapp` é opcional e não faz parte do "contrato do
  agente" propriamente dito — é usado só para entrega da notificação (mesma
  separação que já existe entre `buildAgentPayload`/`buildDatabaseRecord` no
  front-end).

  `candidato.cidade` também é opcional (padrão: `Santos`, configurável via
  `IBAM_CIDADE_PADRAO`). É esse campo que viabiliza monitorar outras cidades
  sem nenhuma mudança estrutural — veja "Escalando para outras cidades".

- `GET /monitoramentos/:id` — status do monitoramento + histórico de resultados.
- `POST /monitoramentos/:id/executar` — dispara uma checagem manual: sincroniza
  a cidade do monitoramento com o IBAM e roda o matching contra os documentos
  ainda não checados. Útil para demo, sem esperar o cron.

## Monitoramento contínuo

- `src/monitoring/scheduler.js` roda `runDailyCheck` uma vez por dia, às
  19:00 (cron em `CRON_DAILY_CHECK`). Não há mais relatório mensal — o
  andamento é visto pelo usuário no dashboard do front (veja abaixo).
- `runDailyCheck` sincroniza cada cidade distinta entre os monitoramentos
  ativos (`syncCity`, 1x por cidade) e depois checa cada monitoramento contra
  os documentos da sua cidade ainda não vistos por ele (`checkedDocuments`),
  nunca reprocessando um PDF já conhecido.
- Regras de confiança (`src/matching/identity.js`): inscrição + nome = alta
  confiança (notifica direto); só um dos dois = média (por padrão fica só
  registrado; se `OPENROUTER_API_KEY` estiver configurada, o LLM arbitra se é
  o mesmo candidato antes de notificar — `src/llm/arbitrateMatch.js`); nada
  bate = não notifica.

## Dashboard (Supabase)

A cada execução diária, o agente grava no Supabase (best-effort — se o
Supabase não estiver configurado ou falhar, o monitoramento continua
normalmente, só não atualiza o dashboard):

- `agent_daily_runs` — um registro por execução (`runDailyCheck`), com
  contagens agregadas (cidades sincronizadas, monitoramentos checados,
  matches encontrados, erros).
- `agent_monitoring_snapshots` — upsert por monitoramento a cada checagem,
  refletindo status atual, quantos documentos já foram vistos, etc.
- `agent_match_results` — um registro por match confirmado, incluindo se foi
  confirmado por arbitragem do LLM (`llm_arbitrated`).

Rode `agent/supabase/schema.sql` uma vez no SQL Editor do seu projeto
Supabase para criar essas tabelas, e configure `SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY` no `.env` (a service role key é secreta — só uso
server-side, nunca exposta no front).

## Escalando para outras cidades

O filtro de cidade do IBAM é só um parâmetro de URL
(`index/todos/?busca={cidade}`), sem nenhuma mudança estrutural por
município. Monitorar uma nova cidade é:

1. O candidato informar `candidato.cidade` no cadastro (ou configurar
   `IBAM_CIDADE_PADRAO` para mudar o padrão do agente inteiro).
2. Nada mais — `syncCity`/`checkMonitoringAgainstCity` já operam por cidade,
   e o índice de documentos conhecidos é isolado por cidade.

## WhatsApp

`src/notifications/whatsapp.js` usa a API oficial da Meta (Graph API). Sem
`WHATSAPP_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID` configurados, a mensagem é
logada no console em vez de enviada — o agente continua demonstrável sem
credenciais prontas. Importante: fora da janela de 24h de sessão, o WhatsApp
exige o envio por **template aprovado** no Meta Business Manager
(`sendTemplate`), não mensagem de texto livre (`sendText`).

## Limitação atual (MVP do hackathon)

Fonte única: `ibamsp-concursos.org.br`. Alguns editais mais antigos (ex.:
concursos de 2024 e anteriores) são PDFs escaneados sem camada de texto —
`pdf-parse` não consegue extrair nomes desses documentos. O agente detecta
esse caso (texto extraído abaixo de um tamanho mínimo esperado) e registra um
aviso no console em vez de falhar silenciosamente; não há OCR implementado.
Concursos mais recentes (2025/2026) têm texto extraível normalmente.
