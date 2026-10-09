"use strict";

const { getClient } = require("./supabaseClient");

/**
 * Alimenta as tabelas de leitura do dashboard (front). Grava de forma
 * best-effort: se o Supabase não estiver configurado ou a escrita falhar,
 * loga e segue — isso nunca deve derrubar o monitoramento em si.
 */
async function recordDailyRun({ startedAt, finishedAt, citiesSynced, monitoringsChecked, matchesFound, errors }) {
  const client = getClient();
  if (!client) return;

  const { error } = await client.from("agent_daily_runs").insert({
    run_at: startedAt,
    finished_at: finishedAt,
    cities_synced: citiesSynced,
    monitorings_checked: monitoringsChecked,
    matches_found: matchesFound,
    errors
  });

  if (error) console.error("[dashboardSync] falha ao gravar agent_daily_runs:", error.message);
}

async function upsertMonitoringSnapshot(monitoring) {
  const client = getClient();
  if (!client) return;

  const { error } = await client.from("agent_monitoring_snapshots").upsert({
    monitoring_id: monitoring.monitoringId,
    city: monitoring.city,
    full_name: monitoring.fullName,
    registration_number: monitoring.registrationNumber,
    status: monitoring.status,
    active: monitoring.active,
    documents_checked_count: (monitoring.checkedDocuments ?? []).length,
    last_matched_at: monitoring.lastMatchedAt,
    last_checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  if (error) console.error("[dashboardSync] falha ao gravar agent_monitoring_snapshots:", error.message);
}

async function recordMatchResult({ monitoringId, matchResult, publication, llmArbitrated = false }) {
  const client = getClient();
  if (!client) return;

  const { error } = await client.from("agent_match_results").insert({
    monitoring_id: monitoringId,
    found: matchResult.found,
    confidence: matchResult.confidence,
    confidence_level: matchResult.level,
    llm_arbitrated: llmArbitrated,
    publication_type: publication.type,
    publication_title: publication.title,
    publication_url: publication.url,
    publication_deadline: publication.deadline ?? null,
    excerpt: matchResult.evidence.trecho,
    checked_at: new Date().toISOString()
  });

  if (error) console.error("[dashboardSync] falha ao gravar agent_match_results:", error.message);
}

module.exports = { recordDailyRun, upsertMonitoringSnapshot, recordMatchResult };
