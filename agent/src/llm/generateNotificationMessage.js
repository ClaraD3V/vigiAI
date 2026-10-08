"use strict";

const { complete, isEnabled } = require("./client");

/**
 * Gera o texto da notificação de match com o LLM, com tom mais natural do
 * que o template fixo. Usa só os dados já verificados (nunca o PDF inteiro).
 * Se a URL retornada não bater exatamente com a da publicação, descarta o
 * resultado — preferimos o template fixo a arriscar um link alterado.
 * Sem LLM configurado ou em caso de falha, retorna `null` e o chamador cai
 * para `notifications/messages.js#matchFoundMessage`.
 */
async function generateMatchMessage({ fullName, publication }) {
  if (!isEnabled()) return null;

  const prompt = JSON.stringify({
    primeiro_nome: String(fullName ?? "").trim().split(/\s+/)[0] ?? "",
    tipo_publicacao: publication.type,
    titulo_publicacao: publication.title,
    prazo: publication.deadline,
    url: publication.url
  });

  const content = await complete({
    system:
      "Você escreve uma mensagem curta de WhatsApp em português do Brasil, tom " +
      "caloroso e direto, avisando um candidato que encontramos uma publicação " +
      "relevante sobre ele num concurso público. Use SOMENTE os dados fornecidos " +
      "no JSON de entrada — não invente prazo, tipo, título ou qualquer outra " +
      "informação. Inclua a URL exatamente como recebida, sem alterar nenhum " +
      "caractere. Responda só o texto da mensagem, sem JSON, sem aspas.",
    prompt,
    maxTokens: 300
  });

  if (!content) return null;
  if (!content.includes(publication.url)) return null;

  return content.trim();
}

module.exports = { generateMatchMessage };
