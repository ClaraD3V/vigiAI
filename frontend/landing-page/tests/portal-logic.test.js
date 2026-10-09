const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseHash,
  hasActiveSubscription,
  resolveGuard,
  resolveTab,
  firstName
} = require("../js/portal/portal-logic");

const agora = new Date("2026-10-09T12:00:00Z");
const session = { user: { id: "u1" } };
const perfil = { consentimento_aceito_em: "2026-10-09T10:00:00Z" };
const ativa = { status: "ativa", expira_em: "2026-11-09T12:00:00Z" };

test("parseHash aceita as quatro abas, com ou sem #", () => {
  assert.equal(parseHash("#inicio"), "inicio");
  assert.equal(parseHash("#execucoes"), "execucoes");
  assert.equal(parseHash("assinatura"), "assinatura");
  assert.equal(parseHash("#PERFIL"), "perfil");
});

test("parseHash cai em início para hash vazio ou desconhecido", () => {
  assert.equal(parseHash(""), "inicio");
  assert.equal(parseHash("#"), "inicio");
  assert.equal(parseHash("#qualquer"), "inicio");
  assert.equal(parseHash(undefined), "inicio");
});

test("assinatura ativa ou em teste vale; cancelada, pausada e expirada não", () => {
  assert.equal(hasActiveSubscription(ativa, agora), true);
  assert.equal(hasActiveSubscription({ status: "teste", expira_em: null }, agora), true);
  assert.equal(hasActiveSubscription({ status: "cancelada", expira_em: null }, agora), false);
  assert.equal(hasActiveSubscription({ status: "pausada", expira_em: null }, agora), false);
  assert.equal(hasActiveSubscription({ status: "expirada", expira_em: null }, agora), false);
  assert.equal(hasActiveSubscription(null, agora), false);
});

test("status ativa com expira_em no passado não vale", () => {
  assert.equal(hasActiveSubscription({ status: "ativa", expira_em: "2026-10-09T11:59:59Z" }, agora), false);
});

test("guardas na ordem: sessão, consentimento, assinatura", () => {
  assert.deepEqual(resolveGuard({ session: null, perfil, assinatura: ativa, now: agora }), { redirect: "account.html" });
  assert.deepEqual(resolveGuard({ session, perfil: null, assinatura: ativa, now: agora }), { redirect: "consentimento.html" });
  assert.deepEqual(
    resolveGuard({ session, perfil: { consentimento_aceito_em: null }, assinatura: ativa, now: agora }),
    { redirect: "consentimento.html" }
  );
  assert.deepEqual(resolveGuard({ session, perfil, assinatura: null, now: agora }), { locked: true, allowed: ["assinatura"] });
});

test("sem sessão o redirecionamento vence mesmo com perfil e assinatura", () => {
  assert.equal(resolveGuard({ session: null, perfil: null, assinatura: null }).redirect, "account.html");
});

test("com tudo em ordem o portal fica liberado", () => {
  const guard = resolveGuard({ session, perfil, assinatura: ativa, now: agora });
  assert.equal(guard.locked, false);
  assert.deepEqual(guard.allowed, ["inicio", "execucoes", "assinatura", "perfil"]);
});

test("portal travado força a aba Assinatura; liberado respeita o pedido", () => {
  const travado = { locked: true, allowed: ["assinatura"] };
  const livre = { locked: false, allowed: ["inicio", "execucoes", "assinatura", "perfil"] };
  assert.equal(resolveTab("execucoes", travado), "assinatura");
  assert.equal(resolveTab("perfil", travado), "assinatura");
  assert.equal(resolveTab("assinatura", travado), "assinatura");
  assert.equal(resolveTab("execucoes", livre), "execucoes");
  assert.equal(resolveTab("nada", livre), "inicio");
});

test("firstName pega só o primeiro nome", () => {
  assert.equal(firstName("Maria da Silva"), "Maria");
  assert.equal(firstName("  Maria  "), "Maria");
  assert.equal(firstName(null), "");
});
