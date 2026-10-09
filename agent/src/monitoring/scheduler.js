"use strict";

const cron = require("node-cron");
const config = require("../config");
const { runDailyCheck } = require("./runner");

function start() {
  cron.schedule(config.cron.dailyCheck, async () => {
    try {
      const results = await runDailyCheck();
      if (results.length > 0) console.log(`[scheduler] ${results.length} match(es) encontrado(s) na checagem diária.`);
    } catch (error) {
      console.error("[scheduler] erro na checagem diária:", error);
    }
  });

  console.log(`[scheduler] checagem diária: "${config.cron.dailyCheck}"`);
}

module.exports = { start };
