(function () {
  "use strict";

  function buildAgentPayload({ monitoringId, user, monitorings }) {
    if (!monitoringId) {
      throw new Error("O identificador do monitoramento é obrigatório.");
    }

    const fullName = String(user?.fullName ?? "").trim();
    const registrationNumber = String(monitorings?.[0]?.registrationNumber ?? "").trim();

    if (!fullName) {
      throw new Error("O nome completo do candidato é obrigatório.");
    }

    if (!registrationNumber) {
      throw new Error("O número de inscrição do candidato é obrigatório.");
    }

    return {
      monitoramento_id: monitoringId,
      candidato: {
        nome_completo: fullName.toLocaleUpperCase("pt-BR"),
        numero_inscricao: registrationNumber
      }
    };
  }

  function buildDatabaseRecord({ monitoringId, user, monitorings, channels, planId }) {
    return {
      monitoramento_id: monitoringId,
      candidato: {
        nome_completo: String(user?.fullName ?? "").trim().toLocaleUpperCase("pt-BR"),
        numero_inscricao: String(monitorings?.[0]?.registrationNumber ?? "").trim()
      },
      dados_pessoais: {
        cpf: String(user?.cpf ?? "").trim(),
        data_nascimento: String(user?.birthDate ?? "").trim(),
        email: String(user?.email ?? "").trim(),
        telefone: String(user?.phone ?? "").trim()
      },
      monitoramentos: monitorings.map(({ registrationNumber, process }) => ({
        numero_inscricao: String(registrationNumber).trim(),
        processo: String(process).trim()
      })),
      configuracao: {
        plano: planId,
        canais: Array.isArray(channels) ? channels : []
      }
    };
  }

  const globalScope = typeof window !== "undefined" ? window : globalThis;
  globalScope.buildAgentPayload = buildAgentPayload;
  globalScope.buildDatabaseRecord = buildDatabaseRecord;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { buildAgentPayload, buildDatabaseRecord };
  }
}());
