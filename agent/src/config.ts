import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseEnv(value: string | undefined, fallback: string): string {
  return value || fallback;
}

function parseInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseFloat(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value || "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  environment: parseEnv(process.env.NODE_ENV, "development"),
  port: parseInt(process.env.PORT, 3001),

  // Supabase Backend (service role — NEVER expose in frontend)
  supabase: {
    url: parseEnv(process.env.SUPABASE_URL, ""),
    serviceRoleKey: parseEnv(process.env.SUPABASE_SERVICE_ROLE_KEY, ""),
  },

  // LLM Services
  openrouter: {
    apiKey: parseEnv(process.env.OPENROUTER_API_KEY, ""),
    model: parseEnv(process.env.OPENROUTER_MODEL, "meta-llama/llama-3.3-70b-instruct:free"),
    baseUrl: parseEnv(process.env.OPENROUTER_BASE_URL, "https://openrouter.ai/api/v1"),
  },

  // Notifications
  whatsapp: {
    token: parseEnv(process.env.WHATSAPP_TOKEN, ""),
    phoneNumberId: parseEnv(process.env.WHATSAPP_PHONE_NUMBER_ID, ""),
    apiVersion: parseEnv(process.env.WHATSAPP_API_VERSION, "v20.0"),
    templateName: parseEnv(process.env.WHATSAPP_TEMPLATE_NAME, "vigiai_notificacao"),
  },

  // Monitoring
  monitoring: {
    cronDailyCheck: parseEnv(process.env.CRON_DAILY_CHECK, "0 19 * * *"),
    confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD, 0.9),
  },

  // Source Config
  source: {
    baseUrl: "https://www.ibamsp-concursos.org.br",
    defaultCity: parseEnv(process.env.IBAM_CIDADE_PADRAO, "Santos"),
  },
} as const;

// Validation
if (!config.supabase.url || !config.supabase.serviceRoleKey) {
  console.warn("[Config] Supabase não configurado — functions de dashboard desabilitadas");
}

if (!config.openrouter.apiKey) {
  console.warn("[Config] OpenRouter não configurado — LLM arbitration desabilitado");
}
