"use strict";

const config = require("../config");

function isEnabled() {
  return Boolean(config.llm.apiKey);
}

/**
 * Chama a API de chat completions da OpenRouter. Só deve ser usado sobre
 * trechos curtos já localizados pela busca determinística (matching/identity),
 * nunca sobre o PDF inteiro — é isso que mantém o custo de tokens baixo.
 */
async function complete({ system, prompt, maxTokens = 300 }) {
  if (!isEnabled()) return null;

  const response = await fetch(`${config.llm.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.llm.apiKey}`
    },
    body: JSON.stringify({
      model: config.llm.model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Falha ao chamar o LLM (${response.status}).`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? null;
}

module.exports = { complete, isEnabled };
