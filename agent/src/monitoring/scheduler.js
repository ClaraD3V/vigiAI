"use strict";

const cron = require("node-cron");
const config = require("../config");
const { runDailyCheck, runMonthlyReport } = require("./runner");

function isLastDayOfMonth(date) {
  const tomorrow = new Date(date);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return tomorrow.getUTCDate() === 1;
}

function start() {
  cron.schedule(config.cron.dailyCheck, async () => {
    try {
      const results = await runDailyCheck();
      if (results.length > 0) console.log(`[scheduler] ${results.length} match(es) encontrado(s) na checagem diária.`);
    } catch (error) {
      console.error("[scheduler] erro na checagem diária:", error);
    }
  });

  cron.schedule(config.cron.monthlyReport, async () => {
    if (!isLastDayOfMonth(new Date())) return;
    try {
      const sent = await runMonthlyReport();
      console.log(`[scheduler] relatório mensal enviado para ${sent.length} monitoramento(s).`);
    } catch (error) {
      console.error("[scheduler] erro no relatório mensal:", error);
    }
  });

  console.log(`[scheduler] checagem diária: "${config.cron.dailyCheck}" | relatório mensal: "${config.cron.monthlyReport}" (só executa no último dia do mês)`);
}

module.exports = { start, isLastDayOfMonth };
