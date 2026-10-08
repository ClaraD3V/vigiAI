"use strict";

const config = require("../config");
const store = require("./store");
const ibam = require("../sources/ibamConcursos");
const { matchCandidateInText } = require("../matching/identity");
const { classifyPublication } = require("../llm/classifyPublication");
const { buildMatchOutput } = require("../contracts/output");
const whatsapp = require("../notifications/whatsapp");
const messages = require("../notifications/messages");

/**
 * Descobre concursos de `city`, baixa/cacheia (uma única vez) o texto de
 * cada documento de resultado ainda desconhecido e registra no índice da
 * fonte. Não roda nenhum matching aqui — só sincroniza o que existe.
 */
async function syncCity(city) {
  const contests = await ibam.listContests(city);
  const discovered = [];

  for (const contest of contests) {
    const detail = await ibam.getContestDetail(contest.id);
    if (!detail) continue;

    for (const document of detail.documents) {
      if (!ibam.isResultDocument(document.label)) continue;
      if (await ibam.isDocumentKnown(city, document.url)) continue;

      await ibam.getDocumentText(document.url);
      await ibam.registerKnownDocument(city, {
        contestId: contest.id,
        contestTitle: detail.title ?? contest.title,
        status: detail.status,
        label: document.label,
        url: document.url
      });
      discovered.push(document.url);
    }
  }

  return discovered;
}

async function evaluateMatch(monitoring, document, text) {
  const matchResult = matchCandidateInText(text, monitoring);
  if (!matchResult.found || matchResult.confidence < config.confidenceThreshold) return null;

  const publicationMeta = await classifyPublication(matchResult.evidence.trecho);
  const publication = {
    date: null,
    type: publicationMeta.type,
    title: document.contestTitle ? `${document.contestTitle} — ${document.label}` : document.label,
    deadline: publicationMeta.deadline,
    url: document.url
  };

  const output = buildMatchOutput({
    monitoringId: monitoring.monitoringId,
    fullName: monitoring.fullName,
    registrationNumber: monitoring.registrationNumber,
    matchResult,
    publication
  });

  await store.appendResult(output);

  if (monitoring.whatsappPhone) {
    await whatsapp.sendText(monitoring.whatsappPhone, messages.matchFoundMessage({ fullName: monitoring.fullName, publication }));
  }

  await store.markMonitoringMatched(monitoring.monitoringId);
  return output;
}

/**
 * Checa um monitoramento contra os documentos já conhecidos da sua cidade
 * que ele ainda não viu. Para no primeiro match de alta confiança.
 */
async function checkMonitoringAgainstCity(monitoring) {
  const documents = await ibam.listKnownDocuments(monitoring.city);
  const checked = new Set(monitoring.checkedDocuments ?? []);
  const pending = documents.filter(document => !checked.has(document.url));
  const results = [];

  for (const document of pending) {
    const text = await ibam.getDocumentText(document.url);
    await store.markDocumentChecked(monitoring.monitoringId, document.url);
    if (!text) continue;

    const output = await evaluateMatch(monitoring, document, text);
    if (output) {
      results.push(output);
      break;
    }
  }

  return results;
}

/**
 * Ciclo de checagem: sincroniza cada cidade monitorada uma única vez e
 * depois checa todos os monitoramentos ativos contra o que foi descoberto
 * (N monitoramentos reaproveitam os mesmos documentos já cacheados).
 */
async function runDailyCheck() {
  const activeMonitorings = await store.listActiveMonitorings();
  const cities = [...new Set(activeMonitorings.map(monitoring => monitoring.city))];

  for (const city of cities) await syncCity(city);

  const results = [];
  for (const monitoring of activeMonitorings) {
    results.push(...await checkMonitoringAgainstCity(monitoring));
  }

  return results;
}

/** Relatório mensal "não foi dessa vez" para quem ainda está monitorando sem match. */
async function runMonthlyReport() {
  const pendingMonitorings = await store.listActiveMonitorings();
  const sent = [];

  for (const monitoring of pendingMonitorings) {
    const since = monitoring.createdAt.slice(0, 10);
    const documentsChecked = (monitoring.checkedDocuments ?? []).length;
    const body = messages.monthlyReportMessage({
      fullName: monitoring.fullName,
      monitoringSince: since,
      documentsChecked
    });

    if (monitoring.whatsappPhone) {
      await whatsapp.sendText(monitoring.whatsappPhone, body);
    }

    sent.push({ monitoringId: monitoring.monitoringId, body });
  }

  return sent;
}

module.exports = { runDailyCheck, runMonthlyReport, syncCity, checkMonitoringAgainstCity };
