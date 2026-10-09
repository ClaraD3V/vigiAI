"use strict";

const http = require("node:http");
const config = require("./config");
const store = require("./monitoring/store");
const scheduler = require("./monitoring/scheduler");
const { parseMonitoringInput } = require("./contracts/input");
const { syncCity, checkMonitoringAgainstCity } = require("./monitoring/runner");

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => { raw += chunk; });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("JSON inválido no corpo da requisição."));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

async function createMonitoring(req, res) {
  const payload = await readBody(req);
  const parsed = parseMonitoringInput(payload);

  const stored = await store.upsertMonitoring({
    monitoringId: parsed.monitoringId,
    city: parsed.city,
    fullName: parsed.fullName,
    registrationNumber: parsed.registrationNumber,
    whatsappPhone: parsed.whatsappPhone,
    active: parsed.active
  });

  sendJson(res, 201, stored);
}

async function getMonitoring(res, monitoringId) {
  const monitoring = await store.getMonitoring(monitoringId);
  if (!monitoring) return sendJson(res, 404, { error: "Monitoramento não encontrado." });

  const results = await store.listResultsForMonitoring(monitoringId);
  sendJson(res, 200, { ...monitoring, resultados: results });
}

async function runMonitoringNow(req, res, monitoringId) {
  const monitoring = await store.getMonitoring(monitoringId);
  if (!monitoring) return sendJson(res, 404, { error: "Monitoramento não encontrado." });

  await syncCity(monitoring.city);
  const results = await checkMonitoringAgainstCity(monitoring);
  sendJson(res, 200, results[0] ?? { encontrado: false, cidade: monitoring.city });
}

const routes = [
  { method: "POST", pattern: /^\/monitoramentos$/, handler: (req, res) => createMonitoring(req, res) },
  { method: "GET", pattern: /^\/monitoramentos\/([^/]+)$/, handler: (req, res, [id]) => getMonitoring(res, id) },
  { method: "POST", pattern: /^\/monitoramentos\/([^/]+)\/executar$/, handler: (req, res, [id]) => runMonitoringNow(req, res, id) }
];

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = routes.find(candidate => candidate.method === req.method && candidate.pattern.test(url.pathname));

  if (!route) return sendJson(res, 404, { error: "Rota não encontrada." });

  try {
    const matches = url.pathname.match(route.pattern).slice(1);
    await route.handler(req, res, matches);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
  }
});

if (require.main === module) {
  server.listen(config.port, () => {
    console.log(`[agent] API ouvindo em http://localhost:${config.port}`);
    scheduler.start();
  });
}

module.exports = server;
