# vigiAI — contexto para o Claude Code

> Este arquivo é lido automaticamente pelo Claude Code. Ele resume as decisões já
> tomadas com o Vilela. Antes de propor algo diferente, confira se não contradiz
> uma decisão daqui.

## 1. O que estamos construindo

**Hackathon Unisanta 2026 — Desafio T2S** ("De devs a builders"). Equipe: Vilela, Julia,
Rian e Clara. O objetivo é ganhar.

O que a banca avalia, em ordem de peso (o regulamento diz que isso vale mais que pitch
bonito ou quantidade de tecnologia):

1. Relevância do problema
2. Comprovação da demanda (entrevistas/testes com usuários reais)
3. **Funcionamento do produto** — "apenas telas ou slides não bastam"

Entregas obrigatórias: código no GitHub (se privado, dar acesso a `@larguesa` e
`@rodrigolopessalgado`) e **URL publicada acessível para avaliação** (Vercel).
Diferencial opcional: afinidade com o DYNApp Hub (Relpz, Scale Press etc.).

**Produto:** o candidato de concurso cadastra os números de inscrição dele; um agente lê
o Diário Oficial de Santos toda noite e avisa se ele foi encontrado (convocação, prova,
resultado, nomeação) — com o que fazer e o prazo.

**Slogan da landing:** "Ctrl+F em edital? Chega disso. Automatize agora com vigiAI."

## 2. Divisão de responsabilidades

- **Agente** (`agent/`): feito pela Clara. NÃO é escopo deste trabalho. Ele já baixa
  publicações, faz o matching nome + inscrição e envia WhatsApp/e-mail.
- **Plataforma** (`frontend/landing-page/` + banco): é o nosso foco.

## 3. Regras de stack (decididas — não mudar)

- **Manter HTML + CSS + JS puro** em `frontend/landing-page/`. **Não migrar para
  Next.js/React agora.** Quando precisar de algo do Sistema de Presença, portar a
  lógica para JS puro.
- Supabase JS v2 via CDN (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`).
- No navegador, apenas URL + chave **publicável**. Nunca `service_role` no front.
- A URL e a chave ficam em `supabase-env.js`; `supabase-config.js` só cria o client. **Toda
  página nova que usa o Supabase deve carregar os scripts nesta ordem**: supabase-js (CDN),
  `supabase-env.js`, `supabase-config.js` e só depois os scripts da página. Fora dessa
  ordem o client vem `null`.
- Tabelas e colunas em **português, sem acento** (`inscricoes`, `usuario_id`, `criado_em`).
- Senha nunca vai para tabela pública: só `supabase.auth.signUp / signInWithPassword /
  updateUser`.
- Vercel serve `frontend/landing-page` como raiz (ver `frontend/landing-page/vercel.json`).
- Testes: `node --test frontend/landing-page/*.test.js`.

## 4. Supabase

- Projeto: `vigiAI`, ref `hrrgfecztjgpyekncfcs`, região sa-east-1.
- URL: `https://hrrgfecztjgpyekncfcs.supabase.co`
- Chave publicável: `sb_publishable_DpF8c6vimcz4lQsQZrDuVg_HJzo3ty3`
- O banco tem o schema inicial (`perfis`, `planos`, `assinaturas`, `perfis_candidatos`,
  `monitoramentos`, `canais_notificacao`, ...) mais a migration do portal (abaixo) e a de
  permissões, ambas **já aplicadas**.
- **GRANT explícito em toda tabela nova.** O projeto foi criado sem os GRANTs padrão para
  `anon`/`authenticated`/`service_role`: sem GRANT a consulta falha com "permission denied"
  antes de o RLS ser avaliado. Toda migration que cria tabela deve trazer, além do RLS, o
  `grant` para `authenticated` (só o necessário) e para `service_role`. Base:
  `backend/supabase/migrations/20261009073000_permissoes_api.sql`.
- **Migration do portal, já aplicada:**
  `backend/supabase/migrations/20261009030000_plataforma_portal.sql`. É aditiva (não
  apaga nada). Ela cria:
  - `perfis.consentimento_aceito_em` / `consentimento_versao`
  - plano único `vigiai` a **R$ 4,99/mês** (os antigos ficam `ativo = false`)
  - `assinaturas.pagamento_bandeira / pagamento_final / pagamento_titular` (exibição
    do pagamento simulado; só os 4 últimos dígitos) + índice único por usuário
  - `inscricoes` (uma linha por número de inscrição do usuário, RLS do dono)
  - `preferencias_envio` (periodicidade pré-definida + canais e-mail/WhatsApp, RLS)
  - `agent_daily_runs`, `agent_monitoring_snapshots`, `agent_match_results` (mesmo
    formato de `agent/supabase/schema.sql`) **com RLS**: execuções gerais legíveis por
    logados; snapshots/resultados só das inscrições do próprio usuário
  - view `agente_inscricoes` (o que o agente precisa ler, via service_role)
  - RPC `excluir_minha_conta()` (apaga o usuário do Auth; cascata leva o resto)

### Contrato com o agente da Clara

- `monitoring_id` do agente = `inscricoes.id::text`.
- O agente grava em `agent_*` com a service_role; o portal só lê.
- Hoje o agente guarda os monitoramentos em arquivo local (`agent/data/monitorings.json`)
  e recebe via `POST /monitoramentos`. Sugestão para a Clara: ler direto da view
  `agente_inscricoes` no início de cada execução.
- Atenção: o cron do agente está em `0 19 * * *` (19h). A plataforma comunica leitura
  à **00h05**. Alinhar com a Clara (`CRON_DAILY_CHECK="5 0 * * *"`).

## 5. Telas da plataforma (especificação do Vilela)

### Landing (`index.html`) — sem login

- "Cara" do projeto: logo bonita, **sem cara de IA** (redesign virá depois).
- Headline: "Ctrl+F em edital? Chega disso. Automatize agora com vigiAI."
- Informações da assinatura (R$ 4,99/mês, plano único), explicação da personalização,
  convite real para usar.
- Botões **Entrar** e **Criar conta** no canto superior direito.

### Login / Cadastro (`account.html`)

- Cadastro: **Nome completo, E-mail, Senha, Confirmação de senha**. Sem CPF, sem data
  de nascimento.
- Regras de senha iguais ao Sistema de Presença (`leonavasconi/SistemaPresencaUnisanta`,
  `components/ui/PasswordFields.tsx` e `lib/auth/errors.ts`): 8+ caracteres, 1 número,
  1 caractere especial; checklist ao vivo que só aparece quando falta algo; aviso
  "as senhas coincidem / não coincidem"; botão desabilitado até tudo valer.
- Pode usar um pouco do layout do cadastro da presença como modelo — **nada da
  identidade visual da Unisanta**.
- Traduzir erros do Supabase para português (ver `TRADUCOES` em `lib/auth/errors.ts`).

### Consentimento (`consentimento.html`) — logo após criar a conta

- Mesmo mecanismo do Sistema de Presença (`app/cadastro/CadastroWizard.tsx`): texto em
  caixa com rolagem; o checkbox e o botão só habilitam quando a rolagem chega ao fim
  (`scrollHeight - scrollTop - clientHeight < 10`).
- Texto focado em: dados pessoais (nome, e-mail), números de inscrição, leitura de
  publicações públicas do Diário Oficial, envio de avisos pelos canais escolhidos,
  dados de pagamento (nesta versão a tela é simulada e o número do cartão não é
  armazenado), retenção e exclusão da conta, direitos LGPD.
- **Sem** câmera, biometria ou geolocalização.
- Ao aceitar: grava `perfis.consentimento_aceito_em` e `consentimento_versao`.

### Portal (`portal.html`) — destino após login

- Centro visual da aplicação, mas simples. Sugestão aprovada: **menu lateral à
  esquerda** no desktop, abas no topo no celular.
- Guardas de rota: sem sessão → `account.html`; sem consentimento →
  `consentimento.html`; sem assinatura ativa → assinatura obrigatória.
- Abas:
  1. **Início** — avisos sobre a fatura (próxima cobrança de R$ 4,99, cartão final
     XXXX), quantas inscrições vigiadas, última leitura e resultado, próxima leitura.
  2. **Execuções** — linha do tempo, uma entrada por noite: data/hora em que o agente
     rodou e um resumo ("09/10 00h05 — Diário lido, 2 inscrições verificadas, não foi
     dessa vez"). Quando encontra: card de destaque com tipo da publicação, trecho,
     link e prazo. Fonte: `agent_daily_runs` + `agent_match_results`. Mostrar só
     execuções a partir do início da assinatura. Estado vazio caprichado.
  3. **Assinatura** — muito importante (ver abaixo).
  4. **Meu perfil** — nome e e-mail; botão excluir conta com modal de confirmação
     (como `app/meus-dados/DeleteDataButton.tsx` da presença): tudo vai junto
     (inscrições, histórico, assinatura). Usa `rpc('excluir_minha_conta')`, depois
     `signOut` e volta para a landing.
- Botão de sair.

### Assinatura — primeiro acesso "obriga" a assinar (R$ 4,99/mês)

Fluxo em etapas (stepper):

1. **Plano**: aceitar o plano único de R$ 4,99/mês.
2. **Inscrições**: grade/tabela onde o usuário digita números de inscrição
   (ex.: `20230`), adiciona outro, remove. Descrição opcional por linha (ex.:
   "Professor Adjunto I"). O agente olha TODAS as inscrições ativas do banco.
3. **Envio**: periodicidade num **dropdown com opções pré-definidas** (o usuário não
   digita horário):
   - `diario_08h` — Todo dia às 8h
   - `diario_20h` — Todo dia às 20h
   - `seg_qua_sex_08h` — Segunda, quarta e sexta às 8h
   - `ter_sex_22h` — Terça e sexta às 22h
   - `semanal_seg_08h` — Toda segunda às 8h
   Canais: e-mail e WhatsApp (o agente faz o envio). WhatsApp pede telefone, salvo
   como `55` + DDD + número.
4. **Pagamento**: **apenas tela, bonita** — número do cartão com máscara e detecção
   de bandeira, titular, validade, CVV, validação de Luhn. **Não integrar gateway e
   não salvar o cartão**; grava só bandeira, 4 últimos dígitos e titular. Ao confirmar,
   cria `assinaturas` com `status = 'ativa'` e `expira_em = +1 mês`.
Depois do primeiro acesso, a aba Assinatura mostra as mesmas seções para gerenciar
(plano/pagamento, inscrições, envio) e permite cancelar.

Sem teste grátis por enquanto (talvez depois). O link da Vercel fica só com o time e a
banca.

## 6. O Diário Oficial de Santos (fonte real)

- Site: https://diariooficial.santos.sp.gov.br/ — edição nova toda dia ~00h.
- PDF por data: `https://diariooficial.santos.sp.gov.br/edicoes/inicio/download/AAAA-MM-DD`
- Leitura: `/edicoes/leitura/mobile/AAAA-MM-DD/{pagina}`
- Edição analisada: **09/10/2026, nº 9221, 733 páginas**. O texto inteiro sai com
  `pdftotext -layout` em ~4 s.
  - Págs. 16–25: texto do Edital 149/2026 (instruções). Págs. 26–660: lista de
    candidatos (635 páginas).
  - **Edital nº 149/2026-SEPLA-RH**, convocação para as provas
    objetivas do concurso do **Edital nº 74/2026-SEPLA-RH**, provas em
    **18/10/2026**, banca IBAM. Lista em ordem alfabética com inscrição, nome, local
    e sala: **15.289 candidatos**, 23 locais. **2.496 fazem prova na Unisanta,
    Bloco M, manhã** (o prédio do hackathon) — gancho forte para o pitch.
  - Inscrições desse concurso vão de 50001 a 77951. **O número de inscrição é por
    concurso/cargo, não por pessoa.** Na lista, 99 nomes aparecem mais de uma vez:
    mesma pessoa em dois cargos (ex.: inscrições seguidas, turnos diferentes) e
    homônimos (ex.: "ANA PAULA DA SILVA" com 72076 e 68176). Por isso o matching é
    **nome + inscrição na mesma linha**, nunca só um dos dois.
  - ~13 páginas vêm com a fonte embaralhada na extração (aparece `6(&5(7$5,$` no
    lugar de `SECRETARIA`: deslocamento de ±29 no código do caractere). Precisa de
    fallback (inverter o deslocamento ou ler a imagem da página).
  - Outras seções da edição: convocações de servidores, licitações, pregões,
    extratos de contrato → base para expansão B2B (ex.: avisar empresas sobre
    mudanças de tabela de frete mínimo).

## 7. Pitch — argumentos já levantados

- "15 mil pessoas precisam achar o próprio nome em 635 páginas de PDF. 2.500 delas
  fazem prova neste prédio daqui a nove dias."
- Concorrentes avisam "saiu publicação"; nós dizemos "você foi encontrado, faça X até Y".
- Custo baixo: busca determinística no texto; LLM só para classificar o trecho e
  escrever a mensagem.
- Replicável: mesmo motor, outras cidades/seções do Diário, B2B2C com cursinhos.
- Homônimos na lista real justificam pedir a inscrição.
- Demo ao vivo precisa de uma pessoa real da lista que consinta (pendente).

## 8. Tarefas, em ordem

1. [x] **Revisar e aplicar a migration** `20261009030000_plataforma_portal.sql` no
   Supabase (combinar com o time; ela é aditiva).
2. [x] **Configuração do Supabase no front**: `supabase-env.js` (URL + chave publicável) e
   `supabase-config.js` (client), já na main. Conferir que todas as páginas carregam os
   scripts na ordem da seção 3.
3. [x] **Cadastro/Login** (`account.html`, `account.js`, `account-auth.js`): remover
   CPF/data de nascimento/checkboxes antigos; nome, e-mail, senha, confirmação com as
   regras da presença; após cadastro → `consentimento.html`; após login → roteamento
   (consentimento pendente? → consentimento; senão → `portal.html`). Atualizar
   `account-auth.test.js`.
4. [x] **Consentimento** (`consentimento.html` + `.js`): texto rolável, aceite só no fim.
5. [x] **Portal** (`portal.html`, `portal.js`, CSS): layout com menu lateral, guardas de
   rota, sair.
6. [x] **Assinatura**: wizard obrigatório no 1º acesso (plano → inscrições →
   envio → pagamento simulado) e modo de gerenciamento depois.
7. [x] **Execuções**: linha do tempo lendo `agent_daily_runs` e `agent_match_results`.
8. [ ] **Início**: resumo (fatura, inscrições, última/próxima leitura).
9. [ ] **Meu perfil**: dados + excluir conta via RPC.
10. [ ] **Landing**: headline nova, plano de R$ 4,99, Entrar/Criar conta no topo
    direito. Remover menções a CPF e aos planos antigos.
11. [ ] Substituir `dashboard.html`/`dashboard.js` (hoje 100% mock) pelo portal.
12. [ ] Testar o fluxo inteiro contra o Supabase real (criar conta → consentir →
    assinar → cadastrar inscrição → ver execuções → excluir conta) no desktop e no
    celular; rodar os advisors de segurança do Supabase.

## 9. Pontos em aberto

- Confirmação de e-mail no Supabase Auth: se estiver ligada, o cadastro não devolve
  sessão e o fluxo para em "verifique seu e-mail". Para a demo, considerar desligar.
- Configurar `reset-password.html` como Redirect URL no Supabase Auth.
- Horário do agente (19h no código × 00h05 na comunicação).
- **O agente mudou na main** (`agent/agent-v2.cjs`; os módulos antigos `agent/src/db/`,
  `monitoring/`, `matching/` e `agent/supabase/schema.sql` foram apagados). Em 09/10/2026
  o v2 **não grava no Supabase**: só imprime "Dados prontos para Supabase". Sem isso as
  abas Execuções e Início ficam sempre vazias. Combinar com a Clara que ele passe a ler
  `agente_inscricoes` e gravar `agent_daily_runs` e `agent_match_results` (contrato da
  seção 4). Antes, o agente antigo nunca gravava `found = false`; confirmar o que o v2 fará.
- Pessoa real para a demo.
- O `README.md` da raiz descreve um frontend React/Vite que não existe; a plataforma
  é o site estático em `frontend/landing-page/`.
