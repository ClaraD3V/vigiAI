const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("./subscription-logic");

const agora = new Date(2026, 9, 9, 12, 0, 0); // 09/10/2026

// ---------- Inscrições ----------

test("valida número e descrição como o banco", () => {
  assert.deepEqual(S.validateInscricao("20230", "Professor Adjunto I"), {});
  assert.deepEqual(S.validateInscricao("AB-12/3.4", ""), {});
  assert.ok(S.validateInscricao("1", "").numero);
  assert.ok(S.validateInscricao("12 34", "").numero);
  assert.ok(S.validateInscricao("x".repeat(31), "").numero);
  assert.ok(S.validateInscricao("20230", "d".repeat(81)).descricao);
  assert.equal(S.validateInscricao("20230", "d".repeat(80)).descricao, undefined);
});

test("exige ao menos uma inscrição e ignora linhas em branco", () => {
  const vazio = S.validateInscricoes([{ numero: "", descricao: "" }]);
  assert.equal(vazio.valid, false);
  assert.equal(vazio.general, "Informe pelo menos uma inscrição.");

  const ok = S.validateInscricoes([
    { numero: " 20230 ", descricao: " Professor " },
    { numero: "", descricao: "" }
  ]);
  assert.equal(ok.valid, true);
  assert.deepEqual(ok.cleaned, [{ numero_inscricao: "20230", descricao: "Professor" }]);
});

test("impede número repetido, ignorando caixa e espaços nas pontas", () => {
  const result = S.validateInscricoes([
    { numero: "ab123", descricao: "" },
    { numero: " AB123 ", descricao: "" }
  ]);
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].numero, undefined);
  assert.equal(result.errors[1].numero, "Este número já foi informado.");
});

test("diff separa o que inserir, atualizar e apagar", () => {
  const existing = [
    { id: "a", numero_inscricao: "100", descricao: null },
    { id: "b", numero_inscricao: "200", descricao: "Antiga" },
    { id: "c", numero_inscricao: "300", descricao: "Igual" }
  ];
  const desired = [
    { numero_inscricao: "200", descricao: "Nova" },
    { numero_inscricao: "300", descricao: "Igual" },
    { numero_inscricao: "400", descricao: null }
  ];
  assert.deepEqual(S.diffInscricoes(existing, desired), {
    toDelete: ["a"],
    toInsert: [{ numero_inscricao: "400", descricao: null }],
    toUpdate: [{ id: "b", descricao: "Nova" }]
  });
});

// ---------- Envio ----------

test("máscara de telefone e armazenamento com 55", () => {
  assert.equal(S.maskPhone("13999999999"), "(13) 99999-9999");
  assert.equal(S.maskPhone("1333334444"), "(13) 3333-4444");
  assert.equal(S.maskPhone("13"), "(13");
  assert.equal(S.maskPhone(""), "");
  assert.equal(S.phoneToStorage("(13) 99999-9999"), "5513999999999");
  assert.equal(S.phoneFromStorage("5513999999999"), "(13) 99999-9999");
  assert.match(S.phoneToStorage("(13) 3333-4444"), /^[0-9]{12,13}$/);
});

test("valida telefone com DDD", () => {
  assert.equal(S.validatePhone("(13) 99999-9999"), true);
  assert.equal(S.validatePhone("(13) 3333-4444"), true);
  assert.equal(S.validatePhone("(13) 89999-9999"), false);
  assert.equal(S.validatePhone("(03) 99999-9999"), false);
  assert.equal(S.validatePhone("99999-9999"), false);
});

test("envio exige periodicidade, um canal e telefone quando WhatsApp", () => {
  assert.equal(S.validateEnvio({ periodicidade: "diario_08h", email: true, whatsapp: false }).valid, true);
  assert.ok(S.validateEnvio({ periodicidade: "outra", email: true }).errors.periodicidade);
  assert.ok(S.validateEnvio({ periodicidade: "diario_08h", email: false, whatsapp: false }).errors.canais);
  assert.ok(S.validateEnvio({ periodicidade: "diario_08h", email: false, whatsapp: true, phone: "123" }).errors.phone);
  assert.equal(S.validateEnvio({ periodicidade: "diario_08h", email: false, whatsapp: true, phone: "(13) 99999-9999" }).valid, true);
});

test("monta preferências respeitando os checks do banco", () => {
  assert.deepEqual(
    S.buildPreferenciasUpsert({ userId: "u1", periodicidade: "ter_sex_22h", email: true, whatsapp: false, phone: "(13) 99999-9999" }),
    { usuario_id: "u1", periodicidade: "ter_sex_22h", canal_email: true, canal_whatsapp: false, whatsapp: null }
  );
  assert.equal(
    S.buildPreferenciasUpsert({ userId: "u1", periodicidade: "diario_08h", email: false, whatsapp: true, phone: "(13) 99999-9999" }).whatsapp,
    "5513999999999"
  );
});

test("as cinco periodicidades do CLAUDE.md", () => {
  assert.deepEqual(
    S.PERIODICIDADES.map(item => item.value),
    ["diario_08h", "diario_20h", "seg_qua_sex_08h", "ter_sex_22h", "semanal_seg_08h"]
  );
});

// ---------- Cartão ----------

test("detecta a bandeira", () => {
  assert.equal(S.detectBrand("4242 4242 4242 4242"), "Visa");
  assert.equal(S.detectBrand("5555 5555 5555 4444"), "Mastercard");
  assert.equal(S.detectBrand("2223 0000 4840 0011"), "Mastercard");
  assert.equal(S.detectBrand("3782 822463 10005"), "Amex");
  assert.equal(S.detectBrand("6362 9700 0045 7013"), "Elo");
  assert.equal(S.detectBrand("5067 0000 0000 0000"), "Elo");
  assert.equal(S.detectBrand("5078 0000 0000 0000"), "");
  assert.equal(S.detectBrand("1234"), "");
});

test("Elo vence Visa e Mastercard nos BINs compartilhados", () => {
  assert.equal(S.detectBrand("4389 3500 0000 0000"), "Elo");
  assert.equal(S.detectBrand("5090 0000 0000 0000"), "Elo");
});

test("máscara do número: 4-4-4-4 e 4-6-5 para Amex", () => {
  assert.equal(S.maskCardNumber("4242424242424242"), "4242 4242 4242 4242");
  assert.equal(S.maskCardNumber("42424242424242429999"), "4242 4242 4242 4242");
  assert.equal(S.maskCardNumber("378282246310005"), "3782 822463 10005");
  assert.equal(S.maskCardNumber("4242"), "4242");
});

test("Luhn", () => {
  assert.equal(S.luhn("4242 4242 4242 4242"), true);
  assert.equal(S.luhn("5555555555554444"), true);
  assert.equal(S.luhn("378282246310005"), true);
  assert.equal(S.luhn("4242 4242 4242 4241"), false);
  assert.equal(S.luhn("123"), false);
});

test("máscara e validade da expiração", () => {
  assert.equal(S.maskExpiry("1228"), "12/28");
  assert.equal(S.maskExpiry("5"), "05/");
  assert.equal(S.maskExpiry("1"), "1");
  assert.equal(S.validateExpiry("12/28", agora), true);
  assert.equal(S.validateExpiry("10/26", agora), true); // mês corrente ainda vale
  assert.equal(S.validateExpiry("09/26", agora), false);
  assert.equal(S.validateExpiry("13/28", agora), false);
  assert.equal(S.validateExpiry("00/28", agora), false);
  assert.equal(S.validateExpiry("1/28", agora), false);
});

test("CVV: 3 dígitos, 4 para Amex, 3 ou 4 sem bandeira", () => {
  assert.equal(S.validateCvv("123", "Visa"), true);
  assert.equal(S.validateCvv("1234", "Visa"), false);
  assert.equal(S.validateCvv("1234", "Amex"), true);
  assert.equal(S.validateCvv("123", "Amex"), false);
  assert.equal(S.validateCvv("12", ""), false);
  assert.equal(S.validateCvv("12a", "Visa"), false);
});

test("validateCard aceita o cartão de demonstração e acusa cada erro", () => {
  const ok = S.validateCard({ number: "4242 4242 4242 4242", holder: "Maria Silva", expiry: "12/28", cvv: "123" }, agora);
  assert.equal(ok.valid, true);
  assert.equal(ok.brand, "Visa");

  const ruim = S.validateCard({ number: "4242 4242 4242 4241", holder: "Maria", expiry: "01/20", cvv: "1" }, agora);
  assert.deepEqual(Object.keys(ruim.errors).sort(), ["cvv", "expiry", "holder", "number"]);
});

test("registro de pagamento guarda só bandeira, final e titular", () => {
  const record = S.buildPaymentRecord({
    number: "4242 4242 4242 4242",
    holder: "  maria   da silva ",
    cvv: "123",
    expiry: "12/28"
  });
  assert.deepEqual(record, {
    pagamento_bandeira: "Visa",
    pagamento_final: "4242",
    pagamento_titular: "MARIA DA SILVA"
  });
  const serialized = JSON.stringify(record);
  assert.equal(serialized.includes("4242424242424242"), false);
  assert.equal(serialized.includes("123"), false);
  assert.equal(serialized.includes("12/28"), false);
});

// ---------- Assinatura ----------

test("soma de meses respeita o fim do mês", () => {
  assert.equal(S.addMonths(new Date(2026, 0, 31), 1).getDate(), 28);
  assert.equal(S.addMonths(new Date(2026, 0, 31), 1).getMonth(), 1);
  assert.equal(S.addMonths(new Date(2026, 9, 9), 1).getMonth(), 10);
  assert.equal(S.addMonths(new Date(2026, 11, 15), 1).getFullYear(), 2027);
});

test("upsert da assinatura: ativa, plano, início agora e +1 mês", () => {
  const payment = { pagamento_bandeira: "Visa", pagamento_final: "4242", pagamento_titular: "MARIA" };
  const row = S.buildSubscriptionUpsert({ userId: "u1", planoId: "p1", payment, now: agora });
  assert.equal(row.status, "ativa");
  assert.equal(row.usuario_id, "u1");
  assert.equal(row.plano_id, "p1");
  assert.equal(row.iniciada_em, agora.toISOString());
  assert.equal(row.expira_em, S.addMonths(agora, 1).toISOString());
  assert.equal(row.pagamento_final, "4242");
});

test("retoma na primeira etapa incompleta", () => {
  assert.equal(S.firstIncompleteStep({ inscricoes: 0, preferencias: false }), "plano");
  assert.equal(S.firstIncompleteStep({ inscricoes: 0, preferencias: true }), "inscricoes");
  assert.equal(S.firstIncompleteStep({ inscricoes: 2, preferencias: false }), "envio");
  assert.equal(S.firstIncompleteStep({ inscricoes: 2, preferencias: true }), "pagamento");
});
