const test = require("node:test");
const assert = require("node:assert/strict");
const { matchCandidateInText } = require("../src/matching/identity");

test("alta confiança quando inscrição e nome aparecem próximos", () => {
  const text = [
    "EDITAL DE CONVOCAÇÃO",
    "123456 - JOÃO DA SILVA - Analista de Sistemas",
    "Prazo para apresentação: 10/10/2026"
  ].join("\n");

  const result = matchCandidateInText(text, { fullName: "João da Silva", registrationNumber: "123456" });

  assert.equal(result.found, true);
  assert.equal(result.level, "alta");
  assert.ok(result.confidence >= 0.9);
  assert.equal(result.evidence.nomeEncontrado, true);
  assert.equal(result.evidence.numeroInscricaoEncontrado, true);
  assert.match(result.evidence.trecho, /JOÃO DA SILVA/);
});

test("média confiança quando só a inscrição aparece", () => {
  const text = ["123456 - MARIA DOS SANTOS", "outra linha qualquer"].join("\n");

  const result = matchCandidateInText(text, { fullName: "João da Silva", registrationNumber: "123456" });

  assert.equal(result.found, true);
  assert.equal(result.level, "media");
  assert.equal(result.evidence.numeroInscricaoEncontrado, true);
  assert.equal(result.evidence.nomeEncontrado, false);
});

test("média confiança quando só o nome aparece", () => {
  const text = ["JOÃO DA SILVA foi aprovado", "sem nenhum número por perto"].join("\n");

  const result = matchCandidateInText(text, { fullName: "João da Silva", registrationNumber: "999999" });

  assert.equal(result.found, true);
  assert.equal(result.level, "media");
  assert.equal(result.evidence.nomeEncontrado, true);
  assert.equal(result.evidence.numeroInscricaoEncontrado, false);
});

test("baixa confiança / não encontrado quando nada bate", () => {
  const text = ["789000 - CARLOS PEREIRA"].join("\n");

  const result = matchCandidateInText(text, { fullName: "João da Silva", registrationNumber: "123456" });

  assert.equal(result.found, false);
  assert.equal(result.level, "baixa");
  assert.equal(result.confidence, 0);
});

test("não confunde inscrição parcial (substring) com inscrição completa", () => {
  const text = ["1234567 - OUTRA PESSOA"].join("\n");

  const result = matchCandidateInText(text, { fullName: "João da Silva", registrationNumber: "123456" });

  assert.equal(result.evidence.numeroInscricaoEncontrado, false);
});

test("ignora acentuação e caixa ao comparar nomes", () => {
  const text = ["123456 - joão   DA  sílva"].join("\n");

  const result = matchCandidateInText(text, { fullName: "JOÃO DA SILVA", registrationNumber: "123456" });

  assert.equal(result.level, "alta");
});
