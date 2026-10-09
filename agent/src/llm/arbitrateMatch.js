"use strict";

const { complete, isEnabled } = require("./client");

/**
 * Casos de confiança "média" (só nome OU só inscrição bateram) são
 * descartados por padrão — aqui o LLM decide, olhando só o trecho já
 * localizado deterministicamente, se é o mesmo candidato (ex.: variação de
 * OCR/formatação). Sem LLM configurado ou em caso de falha, retorna `null` e
 * o chamador mantém o comportamento atual (não notifica).
 */
async function arbitrateMediumConfidence({ fullName, registrationNumber, matchResult }) {
  if (!isEnabled()) return null;

  const { evidence } = matchResult;
  const prompt = JSON.stringify({
    nome_candidato: fullName,
    numero_inscricao: registrationNumber,
    nome_encontrado_no_trecho: evidence.nomeEncontrado,
    numero_inscricao_encontrado_no_trecho: evidence.numeroInscricaoEncontrado,
    trecho: evidence.trecho
  });

  const content = await complete({
    system:
      "Você decide se um trecho de diário oficial brasileiro se refere ao mesmo " +
      "candidato informado, quando só o nome OU só o número de inscrição bateram " +
      "numa busca determinística (pode ser variação de OCR/formatação, ou pode ser " +
      "outra pessoa/processo). Responda SOMENTE um JSON " +
      '{"mesmo_candidato": true|false, "motivo": "..."}.',
    prompt,
    maxTokens: 150
  });

  if (!content) return null;

  try {
    const parsed = JSON.parse(content);
    return {
      confirmed: parsed.mesmo_candidato === true,
      reasoning: String(parsed.motivo ?? "")
    };
  } catch {
    return null;
  }
}

module.exports = { arbitrateMediumConfidence };
