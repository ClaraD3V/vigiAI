const test = require("node:test");
const assert = require("node:assert/strict");
const { parseMonitoringInput } = require("../src/contracts/input");
const { buildMatchOutput } = require("../src/contracts/output");

test("parseMonitoringInput normaliza o contrato mínimo do agente", () => {
  const parsed = parseMonitoringInput({
    monitoramento_id: "mon_01JXYZ",
    candidato: { nome_completo: "João da Silva", numero_inscricao: "123456" }
  });

  assert.equal(parsed.monitoringId, "mon_01JXYZ");
  assert.equal(parsed.fullName, "João da Silva");
  assert.equal(parsed.registrationNumber, "123456");
  assert.equal(parsed.city, "Santos");
  assert.equal(parsed.active, true);
});

test("parseMonitoringInput aceita cidade explícita (candidato.cidade)", () => {
  const parsed = parseMonitoringInput({
    monitoramento_id: "mon_02",
    candidato: { nome_completo: "Maria Souza", numero_inscricao: "654321", cidade: "Guarujá" }
  });

  assert.equal(parsed.city, "Guarujá");
});

test("parseMonitoringInput rejeita contrato sem campos obrigatórios", () => {
  assert.throws(() => parseMonitoringInput({ monitoramento_id: "mon_1" }), /nome_completo/);
  assert.throws(() => parseMonitoringInput({}), /monitoramento_id/);
});

test("buildMatchOutput monta o contrato de saída padronizado", () => {
  const output = buildMatchOutput({
    monitoringId: "mon_01JXYZ",
    fullName: "JOÃO DA SILVA",
    registrationNumber: "123456",
    matchResult: {
      found: true,
      confidence: 0.97,
      evidence: { nomeEncontrado: true, numeroInscricaoEncontrado: true, trecho: "123456 - JOÃO DA SILVA" }
    },
    publication: {
      date: "2026-10-07",
      type: "convocacao",
      title: "Convocação encontrada no Diário Oficial",
      url: "https://diariooficial.santos.sp.gov.br/edicoes/inicio/download/2026-10-07"
    }
  });

  assert.deepEqual(output, {
    monitoramento_id: "mon_01JXYZ",
    resultado: { encontrado: true, confianca: 0.97 },
    candidato: { nome: "JOÃO DA SILVA", numero_inscricao: "123456" },
    publicacao: {
      data: "2026-10-07",
      tipo: "convocacao",
      titulo: "Convocação encontrada no Diário Oficial",
      url: "https://diariooficial.santos.sp.gov.br/edicoes/inicio/download/2026-10-07"
    },
    evidencia: { nomeEncontrado: true, numeroInscricaoEncontrado: true, trecho: "123456 - JOÃO DA SILVA" }
  });
});
