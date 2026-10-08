"use strict";

const config = require("../config");

function isConfigured() {
  return Boolean(config.whatsapp.token && config.whatsapp.phoneNumberId);
}

function endpoint() {
  return `https://graph.facebook.com/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`;
}

async function callGraphApi(body) {
  const response = await fetch(endpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.whatsapp.token}`
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Falha ao enviar WhatsApp (${response.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

/**
 * Mensagem de texto livre. Só é entregue se o destinatário tiver uma sessão
 * de 24h aberta com o número (ex.: ele já mandou mensagem antes). Para
 * iniciar contato fora dessa janela, use `sendTemplate` com um template
 * aprovado no Meta Business Manager.
 */
async function sendText(to, body) {
  if (!isConfigured()) {
    console.log(`[whatsapp:simulado] para ${to}:\n${body}`);
    return { simulated: true, to, body };
  }

  return callGraphApi({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body }
  });
}

async function sendTemplate(to, bodyParams) {
  if (!isConfigured()) {
    console.log(`[whatsapp:simulado:template] para ${to}:`, bodyParams);
    return { simulated: true, to, bodyParams };
  }

  return callGraphApi({
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: config.whatsapp.templateName,
      language: { code: config.whatsapp.templateLanguage },
      components: [
        {
          type: "body",
          parameters: bodyParams.map(text => ({ type: "text", text }))
        }
      ]
    }
  });
}

module.exports = { isConfigured, sendText, sendTemplate };
