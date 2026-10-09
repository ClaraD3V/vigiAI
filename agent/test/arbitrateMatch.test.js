const test = require("node:test");
const assert = require("node:assert/strict");
const { arbitrateMediumConfidence } = require("../src/llm/arbitrateMatch");

test("arbitrateMediumConfidence retorna null sem OPENROUTER_API_KEY configurada", async () => {
  assert.equal(process.env.OPENROUTER_API_KEY, undefined);

  const result = await arbitrateMediumConfidence({
    fullName: "JOÃO DA SILVA",
    registrationNumber: "123456",
    matchResult: {
      found: true,
      confidence: 0.6,
      level: "media",
      evidence: { nomeEncontrado: false, numeroInscricaoEncontrado: true, trecho: "123456 - J. SILVA" }
    }
  });

  assert.equal(result, null);
});
