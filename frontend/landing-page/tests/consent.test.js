const test = require("node:test");
const assert = require("node:assert/strict");
const { CONSENT_VERSION, isScrolledToEnd, buildConsentUpdate } = require("../js/auth/consent");

test("só considera lido quando a rolagem chega ao fim", () => {
  assert.equal(isScrolledToEnd({ scrollTop: 0, scrollHeight: 1000, clientHeight: 200 }), false);
  assert.equal(isScrolledToEnd({ scrollTop: 780, scrollHeight: 1000, clientHeight: 200 }), false);
  assert.equal(isScrolledToEnd({ scrollTop: 791, scrollHeight: 1000, clientHeight: 200 }), true);
  assert.equal(isScrolledToEnd({ scrollTop: 800, scrollHeight: 1000, clientHeight: 200 }), true);
});

test("texto que cabe na caixa conta como lido", () => {
  assert.equal(isScrolledToEnd({ scrollTop: 0, scrollHeight: 200, clientHeight: 200 }), true);
});

test("monta a atualização do perfil com data e versão", () => {
  const update = buildConsentUpdate(new Date("2026-10-09T12:00:00Z"));
  assert.deepEqual(update, {
    consentimento_aceito_em: "2026-10-09T12:00:00.000Z",
    consentimento_versao: CONSENT_VERSION
  });
});
