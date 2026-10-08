"use strict";

const { complete, isEnabled } = require("./client");
const { normalize } = require("../text/normalize");

const KEYWORD_TYPES = [
  { type: "convocacao", words: ["CONVOCACAO", "CONVOCA", "CONVOCADO", "CONVOCADOS"] },
  { type: "nomeacao", words: ["NOMEACAO", "NOMEADO", "NOMEADOS"] },
  { type: "homologacao", words: ["HOMOLOGACAO", "HOMOLOGADO"] },
  { type: "resultado", words: ["RESULTADO", "CLASSIFICACAO"] }
];

const TITLE_BY_TYPE = {
  convocacao: "Convocação encontrada no Diário Oficial",
  nomeacao: "Nomeação encontrada no Diário Oficial",
  homologacao: "Homologação encontrada no Diário Oficial",
  resultado: "Resultado/classificação encontrado no Diário Oficial",
  publicacao: "Publicação relevante encontrada no Diário Oficial"
};

const DATE_PATTERN = /\b(\d{2}\/\d{2}\/\d{4})\b/;
const DEADLINE_CUE_WORDS = ["PRAZO", "ATE O DIA", "DATA LIMITE", "DIAS UTEIS", "APRESENTAR"];

function extractDeadline(excerpt) {
  const normalized = normalize(excerpt);
  // Datas soltas no trecho (ex.: data de nascimento em tabelas de classificação
  // final) não são prazo. Só extrai se houver uma palavra-chave de prazo por perto.
  if (!DEADLINE_CUE_WORDS.some(word => normalized.includes(word))) return null;
  return excerpt.match(DATE_PATTERN)?.[1] ?? null;
}

function classifyByKeywords(excerpt) {
  const normalized = normalize(excerpt);
  const match = KEYWORD_TYPES.find(({ words }) => words.some(word => normalized.includes(word)));
  const type = match?.type ?? "publicacao";
  const deadline = extractDeadline(excerpt);

  return { type, title: TITLE_BY_TYPE[type], deadline };
}

async function classifyWithLlm(excerpt) {
  const content = await complete({
    system:
      "Você classifica trechos de diário oficial brasileiro. Responda SOMENTE um JSON " +
      '{"tipo": "convocacao|nomeacao|homologacao|resultado|publicacao", "titulo": "...", "prazo": "DD/MM/AAAA ou null"}.',
    prompt: excerpt,
    maxTokens: 150
  });

  if (!content) return null;

  try {
    const parsed = JSON.parse(content);
    return {
      type: parsed.tipo || "publicacao",
      title: parsed.titulo || TITLE_BY_TYPE.publicacao,
      deadline: parsed.prazo && parsed.prazo !== "null" ? parsed.prazo : null
    };
  } catch {
    return null;
  }
}

/**
 * Classifica o excerto já localizado pelo matching determinístico.
 * Usa o LLM só se configurado; caso contrário (ou em caso de falha),
 * cai em um classificador por palavras-chave, sem custo de tokens.
 */
async function classifyPublication(excerpt) {
  if (isEnabled()) {
    const llmResult = await classifyWithLlm(excerpt).catch(() => null);
    if (llmResult) return llmResult;
  }
  return classifyByKeywords(excerpt);
}

module.exports = { classifyPublication };
