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
    dailyCheck: process.env.CRON_DAILY_CHECK || "0 19 * * *"
  },

  confidenceThreshold: float(process.env.CONFIDENCE_THRESHOLD, 0.9),

  source: {
    baseUrl: "https://www.ibamsp-concursos.org.br",
    defaultCity: process.env.IBAM_CIDADE_PADRAO || "Santos"
  },

  llm: {
    apiKey: process.env.OPENROUTER_API_KEY || "",
    // Modelo gratuito (sufixo ":free"). A disponibilidade muda com frequência —
    // confira https://openrouter.ai/models?max_price=0 antes de usar em produção.
    model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
    baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"
  },

  supabase: {
    url: process.env.SUPABASE_URL || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ""
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
