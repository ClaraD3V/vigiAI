const test = require("node:test");
const assert = require("node:assert/strict");
const { generateMatchMessage } = require("../src/llm/generateNotificationMessage");

test("generateMatchMessage retorna null sem OPENROUTER_API_KEY configurada", async () => {
  assert.equal(process.env.OPENROUTER_API_KEY, undefined);

  const result = await generateMatchMessage({
    fullName: "JOÃO DA SILVA",
    publication: {
      type: "convocacao",
      title: "Convocação encontrada no Diário Oficial",
      deadline: "2026-10-20",
      url: "https://diariooficial.santos.sp.gov.br/edicoes/inicio/download/2026-10-07"
    }
  });

  assert.equal(result, null);
});
