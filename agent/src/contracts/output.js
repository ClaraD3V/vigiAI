"use strict";

/**
 * Monta o contrato de resposta padronizado do agente (ver discussão do
 * contrato de saída): separa resultado, candidato, publicação e evidência.
 */
function buildMatchOutput({ monitoringId, fullName, registrationNumber, matchResult, publication }) {
  return {
    monitoramento_id: monitoringId,
    resultado: {
      encontrado: matchResult.found,
      confianca: matchResult.confidence
    },
    candidato: {
      nome: fullName,
      numero_inscricao: registrationNumber
    },
    publicacao: {
      data: publication.date,
      tipo: publication.type,
      titulo: publication.title,
      url: publication.url
    },
    evidencia: matchResult.evidence
  };
}

module.exports = { buildMatchOutput };
