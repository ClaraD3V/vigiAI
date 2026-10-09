const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/portal/executions-logic");

// 00h05 de São Paulo = 03h05 UTC.
const run = (id, day, extra = {}) => ({
  id,
  run_at: `2026-10-${day}T03:05:07.000Z`,
  finished_at: `2026-10-${day}T03:08:07.000Z`,
  created_at: `2026-10-${day}T03:05:08.000Z`,
  cities_synced: 3,
  monitorings_checked: 2,
  matches_found: 1,
  errors: 0,
  ...extra
});

const inscricoes = [
  { id: "a", numero_inscricao: "20230", criado_em: "2026-10-01T12:00:00Z" },
  { id: "b", numero_inscricao: "20231", criado_em: "2026-10-01T12:00:00Z" }
];

const achado = (extra = {}) => ({
  id: 1,
  monitoring_id: "a",
  found: true,
  confidence: 0.97,
  confidence_level: "alta",
  publication_type: "convocacao",
  publication_title: "Convocação para prova objetiva",
  publication_url: "https://diariooficial.santos.sp.gov.br/edicoes/leitura/mobile/2026-10-09/26",
  publication_deadline: "18/10/2026",
  excerpt: "Prova em 18/10/2026",
  checked_at: "2026-10-09T03:06:00.000Z",
  ...extra
});

test("formata data e hora no fuso de São Paulo (00h05, não 03h05)", () => {
  assert.equal(E.formatRunDate("2026-10-09T03:05:07.000Z"), "09/10 às 00h05");
  assert.equal(E.formatRunDate("2026-10-09T23:30:00.000Z"), "09/10 às 20h30");
  assert.equal(E.formatDay("2026-10-09T02:59:00.000Z"), "08/10/2026"); // ainda é dia 08 em SP
  assert.equal(E.dayKey("2026-10-09T03:05:00.000Z"), "2026-10-09");
});

test("próxima leitura é a próxima 00h05 de São Paulo", () => {
  assert.equal(E.nextReadingAt(new Date("2026-10-09T14:00:00Z")).toISOString(), "2026-10-10T03:05:00.000Z");
  assert.equal(E.nextReadingAt(new Date("2026-10-09T02:00:00Z")).toISOString(), "2026-10-09T03:05:00.000Z");
  assert.equal(E.nextReadingAt(new Date("2026-10-09T03:05:00Z")).toISOString(), "2026-10-10T03:05:00.000Z");
});

test("rótulos de tipo de publicação", () => {
  assert.equal(E.publicationTypeLabel("convocacao"), "Convocação");
  assert.equal(E.publicationTypeLabel("NOMEACAO"), "Nomeação");
  assert.equal(E.publicationTypeLabel("homologacao"), "Homologação");
  assert.equal(E.publicationTypeLabel("resultado"), "Resultado");
  assert.equal(E.publicationTypeLabel("publicacao"), "Publicação");
  assert.equal(E.publicationTypeLabel(null), "Publicação");
});

test("prazo em DD/MM/AAAA, ISO ou texto livre", () => {
  assert.equal(E.formatDeadline("18/10/2026"), "18/10/2026");
  assert.equal(E.formatDeadline("2026-12-31"), "31/12/2026");
  assert.equal(E.formatDeadline("2026-12-31T00:00:00Z"), "31/12/2026");
  assert.equal(E.formatDeadline("em até 5 dias úteis"), "em até 5 dias úteis");
  assert.equal(E.formatDeadline(null), "");
  assert.equal(E.formatDeadline("  "), "");
});

test("só links http(s) são aceitos", () => {
  assert.equal(E.safeUrl("https://diariooficial.santos.sp.gov.br/a"), "https://diariooficial.santos.sp.gov.br/a");
  assert.equal(E.safeUrl("javascript:alert(1)"), null);
  assert.equal(E.safeUrl("data:text/html,x"), null);
  assert.equal(E.safeUrl("não é url"), null);
  assert.equal(E.safeUrl(null), null);
});

test("classifica achado, possível correspondência e descarte", () => {
  assert.equal(E.classifyMatch({ found: true, confidence_level: "alta" }), "found");
  assert.equal(E.classifyMatch({ found: true, confidence_level: "media" }), "found");
  assert.equal(E.classifyMatch({ found: false, confidence_level: "media" }), "possible");
  assert.equal(E.classifyMatch({ found: false, confidence_level: "MEDIA" }), "possible");
  assert.equal(E.classifyMatch({ found: false, confidence_level: "baixa" }), null);
  assert.equal(E.classifyMatch({ found: false, confidence_level: null }), null);
  assert.equal(E.classifyMatch(null), null);
});

test("conta só as inscrições que já existiam na leitura", () => {
  const lista = [...inscricoes, { id: "c", numero_inscricao: "999", criado_em: "2026-10-09T12:00:00Z" }];
  assert.equal(E.countCheckedInscricoes(lista, "2026-10-09T03:05:07Z"), 2);
  assert.equal(E.countCheckedInscricoes(lista, "2026-10-10T03:05:07Z"), 3);
  assert.equal(E.countCheckedInscricoes([], "2026-10-10T03:05:07Z"), 0);
});

test("resumo no ponto de vista do usuário", () => {
  assert.equal(E.summarizeRun({ checked: 3 }), "Diário lido. Suas 3 inscrições foram verificadas. Não foi dessa vez.");
  assert.equal(E.summarizeRun({ checked: 1 }), "Diário lido. Sua inscrição foi verificada. Não foi dessa vez.");
  assert.equal(E.summarizeRun({ checked: 0 }), "Diário lido.");
  assert.equal(E.summarizeRun({ checked: 2, foundCount: 1 }), "Diário lido. Você foi encontrado em uma publicação.");
  assert.equal(E.summarizeRun({ checked: 2, foundCount: 2 }), "Diário lido. Você foi encontrado em 2 publicações.");
  assert.equal(E.summarizeRun({ checked: 2, possibleCount: 1 }), "Diário lido. Há uma possível correspondência para você conferir.");
});

test("linha do tempo: mais recente primeiro, resumo e aviso de falha", () => {
  const timeline = E.buildTimeline({
    runs: [run(1, "07"), run(3, "09"), run(2, "08", { errors: 2 }), run(4, "06", { finished_at: null })],
    matches: [],
    inscricoes
  });
  assert.deepEqual(timeline.map(item => item.key), ["run-3", "run-1"]);
  assert.equal(timeline[0].dateLabel, "09/10 às 00h05");
  assert.equal(timeline[0].summary, "Diário lido. Suas 2 inscrições foram verificadas. Não foi dessa vez.");
  assert.deepEqual(timeline.map(item => item.hadErrors), [false, false]);
});

test("inclui métricas apenas dos logs finalizados com sucesso", () => {
  const timeline = E.buildTimeline({
    runs: [run(1, "09"), run(2, "08", { errors: 2 }), run(3, "07", { finished_at: null })]
  });

  assert.equal(timeline.length, 1);
  assert.equal(timeline[0].log.statusLabel, "Finalizada com sucesso");
  assert.deepEqual(timeline[0].log, {
    id: 1,
    statusCode: "complete",
    statusLabel: "Finalizada com sucesso",
    startedAt: "09/10 às 00h05",
    finishedAt: "09/10 às 00h08",
    createdAt: "09/10 às 00h05",
    citiesSynced: 3,
    monitoringsChecked: 2,
    matchesFound: 1,
    errors: 0
  });
  assert.equal(timeline[0].log.errors, 0);
});

test("achado entra na leitura certa, com número da inscrição e dados do card", () => {
  const timeline = E.buildTimeline({ runs: [run(1, "08"), run(2, "09")], matches: [achado()], inscricoes });
  assert.equal(timeline[1].found.length, 0);
  assert.equal(timeline[0].found.length, 1);
  const card = timeline[0].found[0];
  assert.equal(card.typeLabel, "Convocação");
  assert.equal(card.title, "Convocação para prova objetiva");
  assert.equal(card.inscricao, "20230");
  assert.equal(card.deadline, "18/10/2026");
  assert.equal(card.url, "https://diariooficial.santos.sp.gov.br/edicoes/leitura/mobile/2026-10-09/26");
  assert.equal(timeline[0].summary, "Diário lido. Você foi encontrado em uma publicação.");
});

test("possível correspondência fica separada do achado", () => {
  const timeline = E.buildTimeline({
    runs: [run(1, "09")],
    matches: [achado({ id: 2, found: false, confidence: 0.5, confidence_level: "media", monitoring_id: "b" })],
    inscricoes
  });
  assert.equal(timeline[0].found.length, 0);
  assert.equal(timeline[0].possible.length, 1);
  assert.equal(timeline[0].possible[0].inscricao, "20231");
  assert.equal(timeline[0].summary, "Diário lido. Há uma possível correspondência para você conferir.");
});

test("link inseguro vira card sem link", () => {
  const timeline = E.buildTimeline({
    runs: [run(1, "09")],
    matches: [achado({ publication_url: "javascript:alert(1)" })],
    inscricoes
  });
  assert.equal(timeline[0].found[0].url, null);
});

test("leitura sem finished_at usa o mesmo dia de São Paulo", () => {
  const timeline = E.buildTimeline({
    runs: [run(1, "09", { finished_at: null })],
    matches: [achado({ checked_at: "2026-10-09T03:20:00.000Z" })],
    inscricoes
  });
  assert.equal(timeline.length, 1);
  assert.equal(timeline[0].found.length, 1);
});

test("achado sem leitura registrada ganha entrada própria (nunca some)", () => {
  const timeline = E.buildTimeline({
    runs: [run(1, "08")],
    matches: [achado({ checked_at: "2026-10-09T03:06:00.000Z" })],
    inscricoes,
    hasMore: false
  });
  assert.equal(timeline.length, 2);
  assert.equal(timeline[0].kind, "orphan");
  assert.equal(timeline[0].found.length, 1);
  assert.equal(timeline[0].dateLabel, "09/10 às 00h06");
  assert.equal(timeline[1].key, "run-1");
});

test("resultado mais antigo que a página carregada espera a próxima página", () => {
  const timeline = E.buildTimeline({
    runs: [run(5, "09")],
    matches: [achado({ checked_at: "2026-10-01T03:06:00.000Z" })],
    inscricoes,
    hasMore: true
  });
  assert.equal(timeline.length, 1);
  assert.equal(timeline[0].found.length, 0);
});

test("sem leituras nem resultados a linha do tempo é vazia", () => {
  assert.deepEqual(E.buildTimeline({ runs: [], matches: [], inscricoes }), []);
  assert.deepEqual(E.buildTimeline(), []);
});

test("resultado de inscrição apagada não quebra (número vazio)", () => {
  const timeline = E.buildTimeline({ runs: [run(1, "09")], matches: [achado({ monitoring_id: "zzz" })], inscricoes });
  assert.equal(timeline[0].found[0].inscricao, "");
});
