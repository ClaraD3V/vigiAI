"use strict";

const config = require("../config");
const store = require("./store");
const ibam = require("../sources/ibamConcursos");
const { matchCandidateInText } = require("../matching/identity");
const { classifyPublication } = require("../llm/classifyPublication");
const { arbitrateMediumConfidence } = require("../llm/arbitrateMatch");
const { generateMatchMessage } = require("../llm/generateNotificationMessage");
const { buildMatchOutput } = require("../contracts/output");
const whatsapp = require("../notifications/whatsapp");
const messages = require("../notifications/messages");
const dashboardSync = require("../db/dashboardSync");

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
  if (!matchResult.found) return null;

  let confirmed = matchResult.confidence >= config.confidenceThreshold;
  let arbitration = null;

  if (!confirmed && matchResult.level === "media") {
    arbitration = await arbitrateMediumConfidence({
      fullName: monitoring.fullName,
      registrationNumber: monitoring.registrationNumber,
      matchResult
    });
    confirmed = Boolean(arbitration?.confirmed);
  }

  if (!confirmed) return null;

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
  await dashboardSync.recordMatchResult({
    monitoringId: monitoring.monitoringId,
    matchResult,
    publication,
    llmArbitrated: Boolean(arbitration)
  });

  if (monitoring.whatsappPhone) {
    const body =
      (await generateMatchMessage({ fullName: monitoring.fullName, publication }).catch(() => null)) ??
      messages.matchFoundMessage({ fullName: monitoring.fullName, publication });

    await whatsapp.sendText(monitoring.whatsappPhone, body);
  }

  await store.markMonitoringMatched(monitoring.monitoringId);
  return output;
}

/**
 * Checa um monitoramento contra os documentos já conhecidos da sua cidade
 * que ele ainda não viu. Para no primeiro match confirmado.
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

  const latest = await store.getMonitoring(monitoring.monitoringId);
  if (latest) await dashboardSync.upsertMonitoringSnapshot(latest);

  return results;
}

/**
 * Ciclo de checagem: sincroniza cada cidade monitorada uma única vez e
 * depois checa todos os monitoramentos ativos contra o que foi descoberto
 * (N monitoramentos reaproveitam os mesmos documentos já cacheados).
 */
async function runDailyCheck() {
  const startedAt = new Date().toISOString();
  const activeMonitorings = await store.listActiveMonitorings();
  const cities = [...new Set(activeMonitorings.map(monitoring => monitoring.city))];

  for (const city of cities) await syncCity(city);

  const results = [];
  let errors = 0;

  for (const monitoring of activeMonitorings) {
    try {
      results.push(...await checkMonitoringAgainstCity(monitoring));
    } catch (error) {
      errors += 1;
      console.error(`[runner] erro ao checar monitoramento ${monitoring.monitoringId}:`, error);
    }
  }

  await dashboardSync.recordDailyRun({
    startedAt,
    finishedAt: new Date().toISOString(),
    citiesSynced: cities.length,
    monitoringsChecked: activeMonitorings.length,
    matchesFound: results.length,
    errors
  });

  return results;
}

module.exports = { runDailyCheck, syncCity, checkMonitoringAgainstCity };
