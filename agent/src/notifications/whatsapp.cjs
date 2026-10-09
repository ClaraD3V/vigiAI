/**
 * WhatsApp - Envio via Z-API
 */

require("dotenv").config();

const ZAPI_BASE_URL = "https://api.z-api.io";

function normalizePhone(phone) {
  const normalized = String(phone ?? "").replace(/\D/g, "");

  if (!/^\d{12,13}$/.test(normalized)) {
    throw new Error(
      "O telefone do WhatsApp deve estar no formato internacional, com 12 ou 13 dígitos (ex.: 5511999999999)."
    );
  }

  return normalized;
}

function getZApiConfig() {
  const instanceId = String(process.env.ZAPI_INSTANCE_ID ?? "").trim();
  const token = String(process.env.ZAPI_TOKEN ?? "").trim();
  const clientToken = String(process.env.ZAPI_CLIENT_TOKEN ?? "").trim();

  return { instanceId, token, clientToken };
}

async function sendWhatsApp(to, message) {
  const phone = normalizePhone(to);
  const text = String(message ?? "").trim();

  if (!text) {
    throw new Error("A mensagem do WhatsApp não pode ser vazia.");
  }

  const { instanceId, token, clientToken } = getZApiConfig();

  if (!instanceId || !token || !clientToken) {
    console.warn(
      "\n📱 [SIMULADO] WhatsApp não enviado: configure ZAPI_INSTANCE_ID, ZAPI_TOKEN e ZAPI_CLIENT_TOKEN."
    );
    console.warn(`Para: ${phone}`);
    console.warn(`Mensagem:\n${text}\n`);
    return { success: false, simulated: true };
  }

  const endpoint =
    `${ZAPI_BASE_URL}/instances/${encodeURIComponent(instanceId)}` +
    `/token/${encodeURIComponent(token)}/send-text`;

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Client-Token": clientToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone, message: text }),
    });
  } catch (error) {
    throw new Error(`Falha de conexão com a Z-API: ${error.message}`);
  }

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `A Z-API recusou o envio (${response.status}): ${responseText || "resposta vazia"}`
    );
  }

  console.log(`✅ WhatsApp enviado para ${phone} via Z-API.`);
  return { success: true };
}

module.exports = {
  normalizePhone,
  sendWhatsApp,
};
