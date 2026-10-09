const test = require("node:test");
const assert = require("node:assert/strict");
const H = require("../js/portal/home-logic");

test("formata execução e vencimento no fuso de São Paulo", () => {
  assert.equal(H.formatDateTime("2026-10-09T03:05:00Z"), "09/10/2026 às 00:05");
  assert.equal(H.formatDate("2026-11-09T03:00:00Z"), "09/11/2026");
});

test("monta saudação, dados da conta, vencimento e última execução", () => {
  const summary = H.buildHomeSummary({
    session: { user: { email: "julia@example.com" } },
    perfil: { nome_completo: "Julia Silva" },
    assinatura: { expira_em: "2026-11-09T03:00:00Z" },
    lastRun: {
      run_at: "2026-10-09T03:05:00Z",
      finished_at: "2026-10-09T03:08:00Z",
      errors: 0
    }
  });

  assert.equal(summary.greeting, "Bem-vindo, Julia Silva!");
  assert.equal(summary.email, "julia@example.com");
  assert.equal(summary.dueDate, "09/11/2026");
  assert.equal(summary.lastRunAt, "09/10/2026 às 00:05");
  assert.equal(summary.lastRunStatus, "Execução finalizada com sucesso");
});

test("informa quando não há execução ou dados opcionais", () => {
  const summary = H.buildHomeSummary({ session: { user: {} }, perfil: null, assinatura: null });
  assert.equal(summary.greeting, "Bem-vindo!");
  assert.equal(summary.email, "—");
  assert.equal(summary.lastRunAt, "");
  assert.equal(summary.lastRunStatus, "Nenhuma execução finalizada com sucesso.");
  assert.equal(summary.dueDate, "Data não informada");
});

test("ignora execução com erro ou ainda em andamento", () => {
  const summary = H.buildHomeSummary({
    lastRun: { run_at: "2026-10-09T03:05:00Z", finished_at: "2026-10-09T03:08:00Z", errors: 2 }
  });
  assert.equal(summary.lastRunAt, "");
  assert.equal(summary.lastRunStatus, "Nenhuma execução finalizada com sucesso.");

  const pending = H.buildHomeSummary({ lastRun: { run_at: "2026-10-09T03:05:00Z", finished_at: null, errors: 0 } });
  assert.equal(pending.lastRunAt, "");
  assert.equal(pending.lastRunStatus, "Nenhuma execução finalizada com sucesso.");
});