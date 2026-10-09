const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("./executions-logic");
const H = require("./home-logic");

// 00h05 de São Paulo = 03h05 UTC. "Agora" padrão: 09/10 às 12h (São Paulo).
const NOW = new Date("2026-10-09T15:00:00Z");

const insc = (id, numero, extra = {}) => ({
  id, numero_inscricao: numero, ativo: true, criado_em: "2026-10-01T12:00:00Z", ...extra
});
const two = [insc("a", "20230"), insc("b", "20231")];

const run = (id, iso, extra = {}) => ({
  id, run_at: iso, finished_at: iso.replace(":05:", ":09:"), errors: 0, ...extra
});
const achado = (extra = {}) => ({
  id: 1, monitoring_id: "a", found: true, confidence: 0.97, confidence_level: "alta",
  publication_type: "convocacao", publication_title: "Edital 149/2026",
  publication_url: "https://exemplo.gov.br/x", publication_deadline: "2026-10-18",
  excerpt: "...", checked_at: "2026-10-09T03:06:00Z", ...extra
});
const timelineOf = (runs, matches = [], inscricoes = two) =>
  E.buildTimeline({ runs, matches, inscricoes, hasMore: true });

// ---------- horários ----------

test("formatRunTime usa o horário de São Paulo", () => {
  assert.equal(E.formatRunTime("2026-10-09T03:05:00Z"), "00h05");
  assert.equal(E.formatRunTime("2026-10-09T03:12:40Z"), "00h12");
  assert.equal(E.formatRunTime("2026-10-09T02:59:00Z"), "23h59");
});

test("describeMoment diz hoje, ontem, amanhã ou a data", () => {
  assert.equal(H.describeMoment("2026-10-09T03:05:00Z", NOW), "hoje às 00h05");
  assert.equal(H.describeMoment("2026-10-08T03:05:00Z", NOW), "ontem às 00h05");
  assert.equal(H.describeMoment("2026-10-10T03:05:00Z", NOW), "amanhã às 00h05");
  assert.equal(H.describeMoment("2026-10-06T03:05:00Z", NOW), "06/10 às 00h05");
});

test("describeMoment respeita a virada do dia em São Paulo, não em UTC", () => {
  // 22h de 09/10 em São Paulo já é 01h de 10/10 em UTC.
  const night = new Date("2026-10-10T01:00:00Z");
  assert.equal(H.describeMoment("2026-10-09T03:05:00Z", night), "hoje às 00h05");
  assert.equal(H.describeMoment("2026-10-10T03:05:00Z", night), "amanhã às 00h05");
});

// ---------- inscrições ----------

test("watchedInscricoes conta só as ativas", () => {
  const result = H.watchedInscricoes([insc("a", "20230"), insc("b", "20231", { ativo: false })]);
  assert.deepEqual(result, { total: 1, shown: ["20230"], extra: 0 });
});

test("watchedInscricoes mostra as 3 primeiras e o resto vira +N", () => {
  const items = [1, 2, 3, 4, 5].map(n => insc(`i${n}`, `2023${n}`, { criado_em: `2026-10-0${n}T12:00:00Z` }));
  const result = H.watchedInscricoes([...items].reverse());
  assert.deepEqual(result, { total: 5, shown: ["20231", "20232", "20233"], extra: 2 });
});

test("watchedInscricoes com exatamente 3 não mostra +N; sem nenhuma, tudo zerado", () => {
  assert.equal(H.watchedInscricoes([insc("a", "1"), insc("b", "2"), insc("c", "3")]).extra, 0);
  assert.deepEqual(H.watchedInscricoes([]), { total: 0, shown: [], extra: 0 });
  assert.deepEqual(H.watchedInscricoes(undefined), { total: 0, shown: [], extra: 0 });
});

test("inscricoesPhrase concorda no singular", () => {
  assert.equal(H.inscricoesPhrase(1), "1 inscrição");
  assert.equal(H.inscricoesPhrase(2), "2 inscrições");
});

// ---------- frase de status ----------

test("status: leitura de hoje sem achado", () => {
  const timeline = timelineOf([run(1, "2026-10-09T03:05:07Z")]);
  const status = H.buildHomeSummary({ inscricoes: two, timeline, now: NOW }).status;
  assert.equal(status.kind, "clear");
  assert.equal(status.text, "Vigiando 2 inscrições. Última leitura hoje às 00h05: nada novo.");
  assert.equal(status.link, null);
});

test("status: usa o horário real de run_at, não 00h05 fixo", () => {
  const timeline = timelineOf([run(1, "2026-10-09T03:12:40Z")]);
  const status = H.buildHomeSummary({ inscricoes: two, timeline, now: NOW }).status;
  assert.equal(status.text, "Vigiando 2 inscrições. Última leitura hoje às 00h12: nada novo.");
});

test("status: singular com uma inscrição e leitura de ontem", () => {
  const timeline = timelineOf([run(1, "2026-10-08T03:05:07Z")], [], [insc("a", "20230")]);
  const status = H.buildHomeSummary({ inscricoes: [insc("a", "20230")], timeline, now: NOW }).status;
  assert.equal(status.text, "Vigiando 1 inscrição. Última leitura ontem às 00h05: nada novo.");
});

test("status: achado vira destaque com link para Execuções", () => {
  const timeline = timelineOf([run(1, "2026-10-09T03:05:07Z")], [achado()]);
  const status = H.buildHomeSummary({ inscricoes: two, timeline, now: NOW }).status;
  assert.equal(status.kind, "found");
  assert.equal(status.text, "Você foi encontrado em uma publicação. Última leitura hoje às 00h05.");
  assert.equal(status.detail, "Convocação · inscrição 20230 · prazo 18/10/2026");
  assert.deepEqual(status.link, { hash: "#execucoes", label: "Ver em Execuções" });
});

test("status: vários achados no plural", () => {
  const matches = [achado(), achado({ id: 2, monitoring_id: "b" })];
  const timeline = timelineOf([run(1, "2026-10-09T03:05:07Z")], matches);
  const status = H.buildHomeSummary({ inscricoes: two, timeline, now: NOW }).status;
  assert.equal(status.text, "Você foi encontrado em 2 publicações. Última leitura hoje às 00h05.");
  assert.equal(status.detail, "Veja o que fazer e o prazo de cada uma.");
});

test("status: achado só conta se for da última leitura", () => {
  const old = achado({ checked_at: "2026-10-07T03:06:00Z" });
  const timeline = timelineOf([run(1, "2026-10-09T03:05:07Z")], [old]);
  assert.equal(H.buildHomeSummary({ inscricoes: two, timeline, now: NOW }).status.kind, "clear");
});

test("status: possível correspondência", () => {
  const possible = achado({ found: false, confidence_level: "media" });
  const timeline = timelineOf([run(1, "2026-10-09T03:05:07Z")], [possible]);
  const status = H.buildHomeSummary({ inscricoes: two, timeline, now: NOW }).status;
  assert.equal(status.kind, "possible");
  assert.match(status.text, /possível correspondência/);
  assert.equal(status.link.hash, "#execucoes");
});

test("status: falha parcial vira nota, sem esconder o resultado", () => {
  const timeline = timelineOf([run(1, "2026-10-09T03:05:07Z", { errors: 3 })]);
  const status = H.buildHomeSummary({ inscricoes: two, timeline, now: NOW }).status;
  assert.equal(status.kind, "clear");
  assert.match(status.note, /Parte do Diário não pôde ser lida/);
});

test("status: antes da primeira leitura, diz quando ela acontece", () => {
  const status = H.buildHomeSummary({ inscricoes: two, timeline: [], now: NOW }).status;
  assert.equal(status.kind, "waiting");
  assert.equal(status.text, "Vigiando 2 inscrições. A primeira leitura acontece amanhã às 00h05.");
  const early = H.buildHomeSummary({ inscricoes: two, timeline: [], now: new Date("2026-10-09T03:00:00Z") }).status;
  assert.match(early.text, /acontece hoje às 00h05\.$/);
});

test("status: sem inscrições ativas manda cadastrar", () => {
  const off = [insc("a", "20230", { ativo: false })];
  const status = H.buildHomeSummary({ inscricoes: off, timeline: [], now: NOW }).status;
  assert.equal(status.kind, "empty");
  assert.deepEqual(status.link, { hash: "#assinatura", label: "Cadastrar inscrição" });
});

// ---------- próxima leitura ----------

test("próxima leitura: amanhã durante o dia, hoje logo depois da meia-noite", () => {
  assert.equal(H.buildHomeSummary({ inscricoes: two, now: NOW }).nextReading, "amanhã às 00h05");
  const after = new Date("2026-10-09T03:00:00Z"); // 00h00 em São Paulo
  assert.equal(H.buildHomeSummary({ inscricoes: two, now: after }).nextReading, "hoje às 00h05");
});

// ---------- assinatura e fatura ----------

const assinatura = (expiraEm, extra = {}) => ({
  status: "ativa",
  expira_em: expiraEm,
  iniciada_em: "2026-10-04T12:00:00Z",
  pagamento_bandeira: "Visa",
  pagamento_final: "4242",
  planos: { nome: "vigiAI", preco: 4.99 },
  ...extra
});

test("billing: preço do plano, cartão e próxima cobrança", () => {
  const billing = H.buildBilling(assinatura("2026-11-09T15:00:00Z"), NOW);
  assert.equal(billing.price, "R$ 4,99");
  assert.equal(billing.card, "Visa final 4242");
  assert.equal(billing.nextCharge, "09/11");
  assert.equal(billing.notice, null);
});

test("billing: preço vem do join e aceita lista ou texto numérico", () => {
  assert.equal(H.buildBilling(assinatura("2026-11-09T15:00:00Z", { planos: [{ preco: "9.90" }] }), NOW).price, "R$ 9,90");
  assert.equal(H.buildBilling(assinatura("2026-11-09T15:00:00Z", { planos: null }), NOW).price, null);
});

test("billing: sem dados de pagamento não inventa nada", () => {
  const billing = H.buildBilling({ status: "ativa", expira_em: null }, NOW);
  assert.deepEqual(billing, { price: null, card: null, nextCharge: null, notice: null });
});

test("billing: avisa só com 5 dias ou menos", () => {
  const at = days => H.buildBilling(assinatura(new Date(NOW.getTime() + days * 86400000).toISOString()), NOW).notice;
  assert.equal(at(6), null);
  assert.equal(at(5).kind, "soon");
  assert.equal(at(5).text, "A próxima cobrança, de R$ 4,99, é em 5 dias (14/10).");
  assert.equal(at(2).text, "A próxima cobrança, de R$ 4,99, é em 2 dias (11/10).");
  assert.equal(at(1).text, "A próxima cobrança, de R$ 4,99, é amanhã (10/10).");
  assert.equal(at(0.1).text, "A próxima cobrança, de R$ 4,99, é hoje.");
});

test("billing: aviso sem preço conhecido continua legível", () => {
  const billing = H.buildBilling(assinatura("2026-10-11T15:00:00Z", { planos: null }), NOW);
  assert.equal(billing.notice.text, "A próxima cobrança é em 2 dias (11/10).");
});

test("billing: vencida avisa e pede para atualizar o pagamento", () => {
  const billing = H.buildBilling(assinatura("2026-10-08T15:00:00Z"), NOW);
  assert.equal(billing.notice.kind, "overdue");
  assert.match(billing.notice.text, /venceu em 08\/10/);
});

test("billing: 5 dias contam pelo calendário de São Paulo", () => {
  // 14/10 às 23h30 em São Paulo (02h30 UTC de 15/10) ainda é 5 dias depois de 09/10.
  const billing = H.buildBilling(assinatura("2026-10-15T02:30:00Z"), NOW);
  assert.equal(billing.notice.kind, "soon");
  assert.equal(billing.nextCharge, "14/10");
});
