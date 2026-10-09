(function () {
  "use strict";

  const PLAN_PRICE_LABEL = "R$ 4,99/mês";

  const PERIODICIDADES = [
    { value: "diario_08h", label: "Todo dia às 8h" },
    { value: "diario_20h", label: "Todo dia às 20h" },
    { value: "seg_qua_sex_08h", label: "Segunda, quarta e sexta às 8h" },
    { value: "ter_sex_22h", label: "Terça e sexta às 22h" },
    { value: "semanal_seg_08h", label: "Toda segunda às 8h" }
  ];

  function periodicidadeLabel(value) {
    const item = PERIODICIDADES.find(option => option.value === value);
    return item ? item.label : "";
  }

  function onlyDigits(value) {
    return String(value ?? "").replace(/\D/g, "");
  }

  // ---------- Inscrições ----------

  // Mesma regra do banco: inscricoes.numero_inscricao e inscricoes.descricao.
  const INSCRICAO_REGEX = /^[0-9A-Za-z./-]{2,30}$/;
  const DESCRICAO_MAX = 80;

  function validateInscricao(numero, descricao) {
    const errors = {};
    const n = String(numero ?? "").trim();
    const d = String(descricao ?? "").trim();
    if (!INSCRICAO_REGEX.test(n)) {
      errors.numero = "Use de 2 a 30 caracteres: letras, números, ponto, barra ou hífen.";
    }
    if (d.length > DESCRICAO_MAX) {
      errors.descricao = `A descrição pode ter até ${DESCRICAO_MAX} caracteres.`;
    }
    return errors;
  }

  // Linhas totalmente vazias são ignoradas (linha em branco recém-adicionada).
  // Devolve erros por índice da linha original e as linhas limpas para gravar.
  function validateInscricoes(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const errors = list.map(() => ({}));
    const cleaned = [];
    const seen = new Map();

    list.forEach((row, index) => {
      const numero = String(row?.numero ?? "").trim();
      const descricao = String(row?.descricao ?? "").trim();
      if (!numero && !descricao) return;

      const rowErrors = validateInscricao(numero, descricao);
      if (!rowErrors.numero) {
        const key = numero.toLowerCase();
        if (seen.has(key)) {
          rowErrors.numero = "Este número já foi informado.";
        } else {
          seen.set(key, index);
        }
      }
      errors[index] = rowErrors;
      if (Object.keys(rowErrors).length === 0) {
        cleaned.push({ numero_inscricao: numero, descricao: descricao || null });
      }
    });

    const hasRowErrors = errors.some(item => Object.keys(item).length > 0);
    const general = !hasRowErrors && cleaned.length === 0
      ? "Informe pelo menos uma inscrição."
      : "";

    return { valid: !hasRowErrors && cleaned.length > 0, errors, general, cleaned };
  }

  // Compara o que está no banco com o que o usuário deixou na grade.
  // A chave é o número; trocar o número vira apagar + inserir.
  function diffInscricoes(existing, desired) {
    const current = Array.isArray(existing) ? existing : [];
    const wanted = Array.isArray(desired) ? desired : [];
    const wantedByNumber = new Map(wanted.map(item => [item.numero_inscricao, item]));
    const currentByNumber = new Map(current.map(item => [item.numero_inscricao, item]));

    const toDelete = current.filter(item => !wantedByNumber.has(item.numero_inscricao)).map(item => item.id);
    const toInsert = wanted.filter(item => !currentByNumber.has(item.numero_inscricao));
    const toUpdate = wanted
      .filter(item => currentByNumber.has(item.numero_inscricao))
      .map(item => ({ id: currentByNumber.get(item.numero_inscricao).id, item, before: currentByNumber.get(item.numero_inscricao) }))
      .filter(({ item, before }) => (before.descricao || null) !== (item.descricao || null))
      .map(({ id, item }) => ({ id, descricao: item.descricao || null }));

    return { toInsert, toUpdate, toDelete };
  }

  // ---------- Envio ----------

  // Telefone nacional: DDD + 8 ou 9 dígitos. Gravado como 55 + dígitos.
  function maskPhone(value) {
    const digits = onlyDigits(value).slice(0, 11);
    if (digits.length === 0) return "";
    if (digits.length <= 2) return `(${digits}`;
    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);
    if (rest.length <= 4) return `(${ddd}) ${rest}`;
    if (digits.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
    return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  }

  function validatePhone(value) {
    const digits = onlyDigits(value);
    if (digits.length !== 10 && digits.length !== 11) return false;
    if (digits[0] === "0") return false;
    if (digits.length === 11 && digits[2] !== "9") return false;
    return true;
  }

  function phoneToStorage(value) {
    return `55${onlyDigits(value)}`;
  }

  function phoneFromStorage(stored) {
    const digits = onlyDigits(stored);
    return maskPhone(digits.startsWith("55") ? digits.slice(2) : digits);
  }

  function validateEnvio({ periodicidade, email, whatsapp, phone } = {}) {
    const errors = {};
    if (!PERIODICIDADES.some(option => option.value === periodicidade)) {
      errors.periodicidade = "Escolha a periodicidade dos avisos.";
    }
    if (!email && !whatsapp) {
      errors.canais = "Escolha pelo menos um canal de envio.";
    }
    if (whatsapp && !validatePhone(phone)) {
      errors.phone = "Informe um telefone válido com DDD, por exemplo (13) 99999-9999.";
    }
    return { errors, valid: Object.keys(errors).length === 0 };
  }

  function buildPreferenciasUpsert({ userId, periodicidade, email, whatsapp, phone }) {
    return {
      usuario_id: userId,
      periodicidade,
      canal_email: Boolean(email),
      canal_whatsapp: Boolean(whatsapp),
      whatsapp: whatsapp ? phoneToStorage(phone) : null
    };
  }

  // ---------- Cartão (somente visual: nada disso vai para o servidor) ----------

  // Faixas de BIN da Elo (6 primeiros dígitos).
  const ELO_EXACT = ["401178", "401179", "438935", "457631", "457632", "431274", "451416", "457393", "504175", "627780", "636297", "636368"];
  const ELO_RANGES = [
    [506699, 506778], [509000, 509999], [650031, 650033], [650035, 650051],
    [650405, 650439], [650485, 650538], [650541, 650598], [650700, 650718],
    [650720, 650727], [650901, 650920], [651652, 651679], [655000, 655019], [655021, 655058]
  ];

  function detectBrand(number) {
    const digits = onlyDigits(number);
    const bin6 = digits.slice(0, 6);
    if (bin6.length === 6) {
      const numeric = Number(bin6);
      if (ELO_EXACT.includes(bin6) || ELO_RANGES.some(([from, to]) => numeric >= from && numeric <= to)) return "Elo";
    }
    if (/^3[47]/.test(digits)) return "Amex";
    if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return "Mastercard";
    if (/^4/.test(digits)) return "Visa";
    return "";
  }

  function maxCardLength(brand) {
    return brand === "Amex" ? 15 : 16;
  }

  function maskCardNumber(value) {
    const brand = detectBrand(value);
    const digits = onlyDigits(value).slice(0, maxCardLength(brand));
    if (brand === "Amex") {
      return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)].filter(Boolean).join(" ");
    }
    return digits.replace(/(.{4})/g, "$1 ").trim();
  }

  function luhn(number) {
    const digits = onlyDigits(number);
    if (digits.length < 12) return false;
    let sum = 0;
    let double = false;
    for (let i = digits.length - 1; i >= 0; i -= 1) {
      let digit = Number(digits[i]);
      if (double) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      double = !double;
    }
    return sum % 10 === 0;
  }

  function maskExpiry(value) {
    let digits = onlyDigits(value).slice(0, 4);
    if (digits.length === 1 && Number(digits) > 1) digits = `0${digits}`;
    if (digits.length >= 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  }

  // Vale até o fim do mês de validade (o mês corrente ainda é válido).
  function validateExpiry(value, now = new Date()) {
    const match = /^(\d{2})\/(\d{2})$/.exec(String(value ?? ""));
    if (!match) return false;
    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);
    if (month < 1 || month > 12) return false;
    return year * 12 + month >= now.getFullYear() * 12 + (now.getMonth() + 1);
  }

  function validateCvv(cvv, brand) {
    const digits = onlyDigits(cvv);
    if (digits !== String(cvv ?? "")) return false;
    if (brand === "Amex") return digits.length === 4;
    if (brand) return digits.length === 3;
    return digits.length === 3 || digits.length === 4;
  }

  function validateCard({ number, holder, expiry, cvv } = {}, now = new Date()) {
    const errors = {};
    const brand = detectBrand(number);
    const digits = onlyDigits(number);

    if (digits.length !== maxCardLength(brand) || !luhn(digits)) errors.number = "Número de cartão inválido.";
    if (!/^[A-Za-zÀ-ÿ' ]{3,40}$/.test(String(holder ?? "").trim()) || !String(holder).trim().includes(" ")) {
      errors.holder = "Informe o nome como está no cartão.";
    }
    if (!validateExpiry(expiry, now)) errors.expiry = "Validade inválida ou vencida.";
    if (!validateCvv(cvv, brand)) {
      errors.cvv = brand === "Amex" ? "O CVV da Amex tem 4 dígitos." : "CVV inválido.";
    }
    return { errors, valid: Object.keys(errors).length === 0, brand };
  }

  // Único dado do cartão que vai para o banco. Número completo e CVV não entram.
  function buildPaymentRecord({ number, holder } = {}) {
    const digits = onlyDigits(number);
    return {
      pagamento_bandeira: detectBrand(digits) || "Cartão",
      pagamento_final: digits.slice(-4),
      pagamento_titular: String(holder ?? "").trim().replace(/\s+/g, " ").toUpperCase()
    };
  }

  // ---------- Assinatura ----------

  // Soma meses sem estourar o fim do mês (31/01 + 1 mês = 28/02).
  function addMonths(date, months) {
    const result = new Date(date.getTime());
    const day = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() + months);
    const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(day, lastDay));
    return result;
  }

  function buildSubscriptionUpsert({ userId, planoId, payment, now = new Date() }) {
    return {
      usuario_id: userId,
      plano_id: planoId,
      status: "ativa",
      iniciada_em: now.toISOString(),
      expira_em: addMonths(now, 1).toISOString(),
      ...payment
    };
  }

  // Etapa em que o wizard retoma. O aceite do plano não é gravado, então o
  // passo "plano" só aparece para quem ainda não começou.
  function firstIncompleteStep({ inscricoes = 0, preferencias = false } = {}) {
    if (inscricoes === 0 && !preferencias) return "plano";
    if (inscricoes === 0) return "inscricoes";
    if (!preferencias) return "envio";
    return "pagamento";
  }

  const api = {
    PLAN_PRICE_LABEL,
    PERIODICIDADES,
    periodicidadeLabel,
    validateInscricao,
    validateInscricoes,
    diffInscricoes,
    maskPhone,
    validatePhone,
    phoneToStorage,
    phoneFromStorage,
    validateEnvio,
    buildPreferenciasUpsert,
    detectBrand,
    maskCardNumber,
    luhn,
    maskExpiry,
    validateExpiry,
    validateCvv,
    validateCard,
    buildPaymentRecord,
    addMonths,
    buildSubscriptionUpsert,
    firstIncompleteStep
  };

  const globalScope = typeof window !== "undefined" ? window : globalThis;
  Object.assign(globalScope, api);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}());
