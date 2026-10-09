"use strict";

const config = require("../config");

/**
 * Valida e normaliza o contrato de entrada (o payload que o front-end monta
 * em landing-page/agent-contract.js). `telefone_whatsapp` é opcional e não
 * faz parte do "contrato do agente" em si — é usado só para entrega da
 * notificação, igual à separação que já existe entre buildAgentPayload e
 * buildDatabaseRecord no front-end.
 */
function parseMonitoringInput(payload) {
  const monitoringId = String(payload?.monitoramento_id ?? "").trim();
  if (!monitoringId) throw new Error("monitoramento_id é obrigatório.");

  const fullName = String(payload?.candidato?.nome_completo ?? "").trim();
  if (!fullName) throw new Error("candidato.nome_completo é obrigatório.");

  const registrationNumber = String(payload?.candidato?.numero_inscricao ?? "").trim();
  if (!registrationNumber) throw new Error("candidato.numero_inscricao é obrigatório.");

  const city = String(payload?.candidato?.cidade ?? payload?.monitoramento?.cidade ?? "").trim()
    || config.source.defaultCity;
  const active = payload?.monitoramento?.ativo !== false;
  const whatsappPhone = String(payload?.candidato?.telefone_whatsapp ?? "").trim();

  return {
    monitoringId,
    city,
    fullName,
    registrationNumber,
    whatsappPhone,
    active
  };
}

module.exports = { parseMonitoringInput };
