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

function monthlyReportMessage({ fullName, monitoringSince, documentsChecked }) {
  const firstName = firstNameTitleCase(fullName);

  return (
    `📋 Olá, ${firstName}!\n\n` +
    `Este mês não encontramos nenhuma publicação sua nos concursos monitorados ` +
    `(verificamos ${documentsChecked} documento(s) desde ${monitoringSince}).\n\n` +
    `Não foi dessa vez, mas não desista! Continuamos monitorando por você.`
  );
}

module.exports = { matchFoundMessage, monthlyReportMessage };
