"use strict";

const { normalize, onlyDigits } = require("../text/normalize");

// A janela do excerto precisa ser igual à janela de busca: senão o trecho
// mostrado como evidência pode não conter o nome/inscrição que o motivou.
const WINDOW_LINES = 3;
const EXCERPT_LINES = WINDOW_LINES;

const CONFIDENCE = {
  ALTA: 0.97,
  MEDIA_INSCRICAO: 0.6,
  MEDIA_NOME: 0.5
};

function levelFor(confidence) {
  if (confidence >= 0.9) return "alta";
  if (confidence >= 0.4) return "media";
  return "baixa";
}

function lineTokens(normalizedLine) {
  return normalizedLine.split(" ").filter(Boolean);
}

function findRegistrationLines(normalizedLines, registrationDigits) {
  if (!registrationDigits) return [];
  return normalizedLines.reduce((indices, line, index) => {
    if (lineTokens(line).includes(registrationDigits)) indices.push(index);
    return indices;
  }, []);
}

function nameTokensPresentInWindow(normalizedLines, nameTokens, centerIndex, window) {
  const start = Math.max(0, centerIndex - window);
  const end = Math.min(normalizedLines.length, centerIndex + window + 1);
  const tokens = new Set(normalizedLines.slice(start, end).flatMap(lineTokens));
  return nameTokens.every(token => tokens.has(token));
}

function findNameOnlyMatch(normalizedLines, nameTokens, window) {
  for (let i = 0; i < normalizedLines.length; i += 1) {
    if (nameTokensPresentInWindow(normalizedLines, nameTokens, i, window)) return i;
  }
  return -1;
}

function buildExcerpt(originalLines, centerIndex) {
  const start = Math.max(0, centerIndex - EXCERPT_LINES);
  const end = Math.min(originalLines.length, centerIndex + EXCERPT_LINES + 1);
  return originalLines.slice(start, end).join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Busca determinística (sem LLM) por nome + número de inscrição dentro do
 * texto de uma edição. Retorna o melhor match com nível de confiança.
 */
function matchCandidateInText(editionText, { fullName, registrationNumber }) {
  const originalLines = String(editionText ?? "").split(/\r?\n/);
  const normalizedLines = originalLines.map(normalize);
  const registrationDigits = onlyDigits(registrationNumber);
  const nameTokens = lineTokens(normalize(fullName));

  const registrationLines = findRegistrationLines(normalizedLines, registrationDigits);

  for (const lineIndex of registrationLines) {
    if (nameTokensPresentInWindow(normalizedLines, nameTokens, lineIndex, WINDOW_LINES)) {
      return {
        found: true,
        confidence: CONFIDENCE.ALTA,
        level: "alta",
        evidence: {
          nomeEncontrado: true,
          numeroInscricaoEncontrado: true,
          trecho: buildExcerpt(originalLines, lineIndex)
        }
      };
    }
  }

  if (registrationLines.length > 0) {
    const lineIndex = registrationLines[0];
    return {
      found: true,
      confidence: CONFIDENCE.MEDIA_INSCRICAO,
      level: levelFor(CONFIDENCE.MEDIA_INSCRICAO),
      evidence: {
        nomeEncontrado: false,
        numeroInscricaoEncontrado: true,
        trecho: buildExcerpt(originalLines, lineIndex)
      }
    };
  }

  if (nameTokens.length > 0) {
    const lineIndex = findNameOnlyMatch(normalizedLines, nameTokens, WINDOW_LINES);
    if (lineIndex !== -1) {
      return {
        found: true,
        confidence: CONFIDENCE.MEDIA_NOME,
        level: levelFor(CONFIDENCE.MEDIA_NOME),
        evidence: {
          nomeEncontrado: true,
          numeroInscricaoEncontrado: false,
          trecho: buildExcerpt(originalLines, lineIndex)
        }
      };
    }
  }

  return {
    found: false,
    confidence: 0,
    level: "baixa",
    evidence: { nomeEncontrado: false, numeroInscricaoEncontrado: false, trecho: "" }
  };
}

module.exports = { matchCandidateInText };
