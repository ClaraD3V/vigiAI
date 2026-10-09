"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const config = require("../config");

const MONITORINGS_FILE = path.join(config.dataDir, "monitorings.json");
const RESULTS_FILE = path.join(config.dataDir, "results.json");
const STATE_FILE = path.join(config.dataDir, "state.json");

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

async function listMonitorings() {
  return readJson(MONITORINGS_FILE, []);
}

async function listActiveMonitorings() {
  return (await listMonitorings()).filter(monitoring => monitoring.active);
}

async function getMonitoring(monitoringId) {
  return (await listMonitorings()).find(monitoring => monitoring.monitoringId === monitoringId) ?? null;
}

async function upsertMonitoring(record) {
  const monitorings = await listMonitorings();
  const index = monitorings.findIndex(item => item.monitoringId === record.monitoringId);

  const stored = {
    status: "monitorando",
    createdAt: new Date().toISOString(),
    lastMatchedAt: null,
    checkedDocuments: [],
    ...(index >= 0 ? monitorings[index] : {}),
    ...record
  };

  if (index >= 0) monitorings[index] = stored;
  else monitorings.push(stored);

  await writeJson(MONITORINGS_FILE, monitorings);
  return stored;
}

async function markMonitoringMatched(monitoringId) {
  const monitorings = await listMonitorings();
  const index = monitorings.findIndex(item => item.monitoringId === monitoringId);
  if (index === -1) return null;

  monitorings[index] = {
    ...monitorings[index],
    status: "encontrado",
    active: false,
    lastMatchedAt: new Date().toISOString()
  };

  await writeJson(MONITORINGS_FILE, monitorings);
  return monitorings[index];
}

async function markDocumentChecked(monitoringId, documentUrl) {
  const monitorings = await listMonitorings();
  const index = monitorings.findIndex(item => item.monitoringId === monitoringId);
  if (index === -1) return null;

  const checkedDocuments = monitorings[index].checkedDocuments ?? [];
  if (!checkedDocuments.includes(documentUrl)) checkedDocuments.push(documentUrl);

  monitorings[index] = { ...monitorings[index], checkedDocuments };
  await writeJson(MONITORINGS_FILE, monitorings);
  return monitorings[index];
}

async function appendResult(result) {
  const results = await readJson(RESULTS_FILE, []);
  results.push({ ...result, checkedAt: new Date().toISOString() });
  await writeJson(RESULTS_FILE, results);
}

async function listResultsForMonitoring(monitoringId) {
  const results = await readJson(RESULTS_FILE, []);
  return results.filter(result => result.monitoramento_id === monitoringId);
}

async function getState() {
  return readJson(STATE_FILE, { lastCheckedDate: null });
}

async function setState(partial) {
  const state = await getState();
  const next = { ...state, ...partial };
  await writeJson(STATE_FILE, next);
  return next;
}

module.exports = {
  listMonitorings,
  listActiveMonitorings,
  getMonitoring,
  upsertMonitoring,
  markMonitoringMatched,
  markDocumentChecked,
  appendResult,
  listResultsForMonitoring,
  getState,
  setState
};
