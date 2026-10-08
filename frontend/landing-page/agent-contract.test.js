const test = require("node:test");
const assert = require("node:assert/strict");
const { buildAgentPayload } = require("./agent-contract.js");

test("constrói exatamente o contrato esperado pelo agente", () => {
  const payload = buildAgentPayload({
    monitoringId: "mon_01JXYZ",
    user: { fullName: "  João da Silva  " },
    monitorings: [{ registrationNumber: "123456" }]
  });

  assert.deepEqual(payload, {
    monitoramento_id: "mon_01JXYZ",
    candidato: {
      nome_completo: "JOÃO DA SILVA",
      numero_inscricao: "123456"
    }
  });
});

test("não envia campos que não fazem parte do contrato", () => {
  const payload = buildAgentPayload({
    monitoringId: "mon_01JXYZ",
    user: {
      fullName: "João da Silva",
      cpf: "123.456.789-09",
      birthDate: "1990-01-01",
      email: "joao@example.com",
      phone: "(13) 99999-9999"
    },
    monitorings: [{ registrationNumber: "123456" }]
  });

  assert.deepEqual(Object.keys(payload), ["monitoramento_id", "candidato"]);
  assert.deepEqual(Object.keys(payload.candidato), ["nome_completo", "numero_inscricao"]);
});

test("mantém o cadastro completo separado do contrato do agente", () => {
  const databaseRecord = buildDatabaseRecord({
    monitoringId: "mon_01JXYZ",
    user: {
      fullName: "João da Silva",
      cpf: "123.456.789-09",
      birthDate: "1990-01-01",
      email: "joao@example.com",
      phone: "(13) 99999-9999"
    },
    monitorings: [{ registrationNumber: "123456", process: "Concurso Público X" }],
    channels: ["whatsapp", "telegram"],
    planId: "pro"
  });

  assert.equal(databaseRecord.monitoramento_id, "mon_01JXYZ");
  assert.equal(databaseRecord.candidato.nome_completo, "JOÃO DA SILVA");
  assert.equal(databaseRecord.dados_pessoais.cpf, "123.456.789-09");
  assert.equal(databaseRecord.configuracao.plano, "pro");
  assert.deepEqual(databaseRecord.configuracao.canais, ["whatsapp", "telegram"]);
});
