const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizePhone, sendWhatsApp } = require("./whatsapp.cjs");

test("normaliza telefone internacional", () => {
  assert.equal(normalizePhone("+55 (11) 99999-9999"), "5511999999999");
});

test("rejeita telefone sem DDI e DDD completos", () => {
  assert.throws(
    () => normalizePhone("99999-9999"),
    /formato internacional/
  );
});

test("envia mensagem para o endpoint da Z-API", async () => {
  const originalEnv = {
    instanceId: process.env.ZAPI_INSTANCE_ID,
    token: process.env.ZAPI_TOKEN,
    clientToken: process.env.ZAPI_CLIENT_TOKEN,
  };
  const originalFetch = global.fetch;
  let request;

  process.env.ZAPI_INSTANCE_ID = "instance-test";
  process.env.ZAPI_TOKEN = "token-test";
  process.env.ZAPI_CLIENT_TOKEN = "client-test";
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 200, text: async () => "" };
  };

  try {
    const result = await sendWhatsApp("5511999999999", "Olá do vigiAI");

    assert.deepEqual(result, { success: true });
    assert.equal(
      request.url,
      "https://api.z-api.io/instances/instance-test/token/token-test/send-text"
    );
    assert.equal(request.options.headers["Client-Token"], "client-test");
    assert.deepEqual(JSON.parse(request.options.body), {
      phone: "5511999999999",
      message: "Olá do vigiAI",
    });
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
