"use strict";

require("dotenv").config();
const path = require("node:path");

function int(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function float(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const config = {
  port: int(process.env.PORT, 3001),

  dataDir: path.join(__dirname, "..", "data"),

  cron: {
    dailyCheck: process.env.CRON_DAILY_CHECK || "0 9 * * *",
    monthlyReport: process.env.CRON_MONTHLY_REPORT || "0 10 * * *"
  },

  confidenceThreshold: float(process.env.CONFIDENCE_THRESHOLD, 0.9),

  source: {
    baseUrl: "https://www.ibamsp-concursos.org.br",
    defaultCity: process.env.IBAM_CIDADE_PADRAO || "Santos"
  },

  llm: {
    apiKey: process.env.OPENROUTER_API_KEY || "",
    model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
    baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"
  },

  whatsapp: {
    token: process.env.WHATSAPP_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    apiVersion: process.env.WHATSAPP_API_VERSION || "v20.0",
    templateName: process.env.WHATSAPP_TEMPLATE_NAME || "vigiai_notificacao",
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "pt_BR"
  }
};

module.exports = config;
