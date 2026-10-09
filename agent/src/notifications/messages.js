"use strict";

function firstNameTitleCase(fullName) {
  const first = String(fullName ?? "").trim().split(/\s+/)[0] ?? "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function matchFoundMessage({ fullName, publication }) {
  const firstName = firstNameTitleCase(fullName);
  const deadlineLine = publication.deadline ? `\nPrazo para apresentação: ${publication.deadline}.` : "";

  return (
    `🎉 Parabéns, ${firstName}!\n\n` +
    `Identificamos uma publicação relevante para você: ${publication.title}.\n\n` +
    `Tipo: ${publication.type}${deadlineLine}\n\n` +
    `⚠️ Consulte o documento oficial para os detalhes: ${publication.url}`
  );
}

module.exports = { matchFoundMessage };
