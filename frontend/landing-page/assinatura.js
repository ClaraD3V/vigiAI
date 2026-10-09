(function () {
  "use strict";

  const client = globalThis.vigiAISupabase && globalThis.vigiAISupabase.client;
  const root = document.querySelector("#subRoot");

  let ctx = null; // { userId, email, guard }
  let data = { plano: null, inscricoes: [], prefs: null, assinatura: null };
  let wizardStep = "plano";
  let uidCounter = 0;

  // ---------- helpers de DOM (sem innerHTML: dados do usuário entram como texto) ----------

  function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([key, value]) => {
      if (value === undefined || value === null || value === false) return;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
      else if (key in node) node[key] = value;
      else node.setAttribute(key, value);
    });
    children.flat().forEach(child => {
      if (child === null || child === undefined || child === false) return;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  function uid(prefix) {
    uidCounter += 1;
    return `${prefix}-${uidCounter}`;
  }

  function field(labelText, input, hint) {
    const id = uid("sub");
    input.id = id;
    const error = h("div", { class: "err" });
    const node = h("div", { class: "field" },
      h("label", { htmlFor: id, text: labelText }),
      input,
      hint ? h("p", { class: "sub-hint", text: hint }) : null,
      error);
    return { node, setError: message => { error.textContent = message || ""; } };
  }

  function notice() {
    const node = h("div", { class: "msg", role: "status", hidden: true });
    return {
      node,
      show(text, type = "ok") {
        node.hidden = false;
        node.className = `msg ${type === "error" ? "bad" : "ok"}`;
        node.textContent = text;
      },
      clear() { node.hidden = true; }
    };
  }

  async function busy(button, fn) {
    button.disabled = true;
    try {
      await fn();
    } finally {
      button.disabled = false;
    }
  }

  function friendlyError(error, fallback) {
    if (error && error.code === "23505") return "Esse número de inscrição já está cadastrado.";
    return fallback;
  }

  // ---------- editor de inscrições ----------

  function createInscricoesEditor(initial) {
    let rows = initial.length
      ? initial.map(item => ({ numero: item.numero_inscricao, descricao: item.descricao || "" }))
      : [{ numero: "", descricao: "" }];
    const list = h("div", { class: "sub-grid" });
    const general = h("div", { class: "err" });
    let focusIndex = -1;

    function render(errors = []) {
      list.replaceChildren(
        h("div", { class: "sub-row sub-row--head", "aria-hidden": "true" },
          h("span", { text: "Número de inscrição" }),
          h("span", { text: "Descrição (opcional)" }),
          h("span")),
        ...rows.map((row, index) => {
          const rowErrors = errors[index] || {};
          const numero = h("input", {
            type: "text", value: row.numero, placeholder: "20230", autocomplete: "off",
            maxlength: "30", "aria-label": `Número da inscrição ${index + 1}`,
            oninput: event => { row.numero = event.target.value; }
          });
          const descricao = h("input", {
            type: "text", value: row.descricao, placeholder: "Professor Adjunto I", autocomplete: "off",
            maxlength: "80", "aria-label": `Descrição da inscrição ${index + 1}`,
            oninput: event => { row.descricao = event.target.value; }
          });
          const remove = h("button", {
            type: "button", class: "btn ghost btn--small", text: "Remover",
            "aria-label": `Remover inscrição ${index + 1}`,
            onclick: () => {
              rows.splice(index, 1);
              if (rows.length === 0) rows.push({ numero: "", descricao: "" });
              render();
            }
          });
          if (index === focusIndex) queueMicrotask(() => numero.focus());
          return h("div", { class: "sub-row" },
            h("div", {}, numero, h("div", { class: "err", text: rowErrors.numero || "" })),
            h("div", {}, descricao, h("div", { class: "err", text: rowErrors.descricao || "" })),
            remove);
        }));
      focusIndex = -1;
    }

    const add = h("button", {
      type: "button", class: "btn ghost btn--small", text: "Adicionar inscrição",
      onclick: () => {
        rows.push({ numero: "", descricao: "" });
        focusIndex = rows.length - 1;
        render();
      }
    });

    render();

    return {
      node: h("div", {},
        h("p", { class: "sub-hint", text: "O número está no comprovante ou no e-mail de confirmação da inscrição." }),
        list, general, add),
      validate() {
        const result = validateInscricoes(rows);
        general.textContent = result.general;
        render(result.errors);
        return result;
      }
    };
  }

  // ---------- editor de envio ----------

  function createEnvioEditor(prefs, email) {
    const initial = prefs || { periodicidade: "diario_08h", canal_email: true, canal_whatsapp: false, whatsapp: null };

    const periodicidade = h("select", {},
      PERIODICIDADES.map(option => h("option", { value: option.value, text: option.label, selected: option.value === initial.periodicidade })));
    const periodicidadeField = field("Quando você quer receber os avisos", periodicidade);

    const emailCheck = h("input", { type: "checkbox", checked: Boolean(initial.canal_email) });
    const whatsappCheck = h("input", { type: "checkbox", checked: Boolean(initial.canal_whatsapp) });
    const phone = h("input", {
      type: "tel", inputmode: "numeric", autocomplete: "tel-national", placeholder: "(13) 99999-9999",
      value: initial.whatsapp ? phoneFromStorage(initial.whatsapp) : "",
      oninput: event => { event.target.value = maskPhone(event.target.value); }
    });
    const phoneField = field("Número do WhatsApp", phone);
    const canaisError = h("div", { class: "err" });

    function syncPhone() {
      phoneField.node.hidden = !whatsappCheck.checked;
    }
    whatsappCheck.addEventListener("change", syncPhone);
    syncPhone();

    const node = h("div", {},
      periodicidadeField.node,
      h("fieldset", { class: "sub-channels" },
        h("legend", { text: "Canais" }),
        h("label", { class: "consent-option" }, emailCheck, h("span", { text: `E-mail (${email})` })),
        h("label", { class: "consent-option" }, whatsappCheck, h("span", { text: "WhatsApp" })),
        canaisError),
      phoneField.node);

    function values() {
      return {
        periodicidade: periodicidade.value,
        email: emailCheck.checked,
        whatsapp: whatsappCheck.checked,
        phone: phone.value
      };
    }

    return {
      node,
      values,
      validate() {
        const current = values();
        const result = validateEnvio(current);
        periodicidadeField.setError(result.errors.periodicidade);
        canaisError.textContent = result.errors.canais || "";
        phoneField.setError(result.errors.phone);
        return { ...result, values: current };
      }
    };
  }

  // ---------- editor de cartão (só visual) ----------

  function createCardEditor() {
    const previewNumber = h("div", { class: "sub-card__number", text: "•••• •••• •••• ••••" });
    const previewHolder = h("div", { class: "sub-card__holder", text: "NOME NO CARTÃO" });
    const previewExpiry = h("div", { class: "sub-card__expiry", text: "MM/AA" });
    const previewBrand = h("div", { class: "sub-card__brand", text: "Cartão" });
    const preview = h("div", { class: "sub-card", "aria-hidden": "true" },
      previewBrand, previewNumber, h("div", { class: "sub-card__foot" }, previewHolder, previewExpiry));

    const number = h("input", {
      type: "text", inputmode: "numeric", autocomplete: "cc-number", placeholder: "0000 0000 0000 0000",
      oninput: event => {
        event.target.value = maskCardNumber(event.target.value);
        const brand = detectBrand(event.target.value);
        previewBrand.textContent = brand || "Cartão";
        previewNumber.textContent = event.target.value || "•••• •••• •••• ••••";
        cvv.maxLength = brand === "Amex" ? 4 : 3;
        if (!brand) cvv.maxLength = 4;
      }
    });
    const holder = h("input", {
      type: "text", autocomplete: "cc-name", placeholder: "Como está no cartão", maxlength: "40",
      oninput: event => { previewHolder.textContent = event.target.value.trim().toUpperCase() || "NOME NO CARTÃO"; }
    });
    const expiry = h("input", {
      type: "text", inputmode: "numeric", autocomplete: "cc-exp", placeholder: "MM/AA", maxlength: "5",
      oninput: event => {
        event.target.value = maskExpiry(event.target.value);
        previewExpiry.textContent = event.target.value || "MM/AA";
      }
    });
    const cvv = h("input", {
      type: "password", inputmode: "numeric", autocomplete: "cc-csc", placeholder: "123", maxlength: "4",
      oninput: event => { event.target.value = event.target.value.replace(/\D/g, ""); }
    });

    const numberField = field("Número do cartão", number);
    const holderField = field("Nome do titular", holder);
    const expiryField = field("Validade", expiry);
    const cvvField = field("CVV", cvv);

    const node = h("div", { class: "sub-payment" },
      preview,
      h("div", {},
        numberField.node,
        holderField.node,
        h("div", { class: "sub-pair" }, expiryField.node, cvvField.node),
        h("p", { class: "sub-demo", text: "Ambiente de demonstração: nenhum valor é cobrado. Para testar, use 4242 4242 4242 4242, qualquer validade futura e CVV 123." })));

    return {
      node,
      // O número completo e o CVV só existem nestes campos, em memória.
      read() {
        return { number: number.value, holder: holder.value, expiry: expiry.value, cvv: cvv.value };
      },
      validate() {
        const result = validateCard(this.read());
        numberField.setError(result.errors.number);
        holderField.setError(result.errors.holder);
        expiryField.setError(result.errors.expiry);
        cvvField.setError(result.errors.cvv);
        return result;
      },
      clear() {
        [number, holder, expiry, cvv].forEach(input => { input.value = ""; });
        previewNumber.textContent = "•••• •••• •••• ••••";
        previewHolder.textContent = "NOME NO CARTÃO";
        previewExpiry.textContent = "MM/AA";
        previewBrand.textContent = "Cartão";
      }
    };
  }

  // ---------- acesso a dados ----------

  async function loadData() {
    const [plano, inscricoes, prefs, assinatura] = await Promise.all([
      client.from("planos").select("id, nome, preco").eq("identificador", "vigiai").eq("ativo", true).maybeSingle(),
      client.from("inscricoes").select("id, numero_inscricao, descricao").order("criado_em", { ascending: true }),
      client.from("preferencias_envio").select("periodicidade, canal_email, canal_whatsapp, whatsapp").eq("usuario_id", ctx.userId).maybeSingle(),
      client.from("assinaturas")
        .select("status, expira_em, iniciada_em, pagamento_bandeira, pagamento_final, pagamento_titular")
        .eq("usuario_id", ctx.userId).maybeSingle()
    ]);
    [plano, inscricoes, prefs, assinatura].forEach(result => { if (result.error) throw result.error; });
    data = { plano: plano.data, inscricoes: inscricoes.data || [], prefs: prefs.data, assinatura: assinatura.data };
  }

  async function reloadInscricoes() {
    const { data: rows, error } = await client.from("inscricoes")
      .select("id, numero_inscricao, descricao").order("criado_em", { ascending: true });
    if (error) throw error;
    data.inscricoes = rows || [];
  }

  async function saveInscricoes(cleaned) {
    const diff = diffInscricoes(data.inscricoes, cleaned);
    if (diff.toDelete.length) {
      const { error } = await client.from("inscricoes").delete().in("id", diff.toDelete);
      if (error) throw error;
    }
    for (const update of diff.toUpdate) {
      const { error } = await client.from("inscricoes").update({ descricao: update.descricao }).eq("id", update.id);
      if (error) throw error;
    }
    if (diff.toInsert.length) {
      const { error } = await client.from("inscricoes").insert(diff.toInsert.map(item => ({ ...item, usuario_id: ctx.userId })));
      if (error) throw error;
    }
    await reloadInscricoes();
  }

  async function savePrefs(values) {
    const row = buildPreferenciasUpsert({ userId: ctx.userId, ...values });
    const { error } = await client.from("preferencias_envio").upsert(row, { onConflict: "usuario_id" });
    if (error) throw error;
    data.prefs = { periodicidade: row.periodicidade, canal_email: row.canal_email, canal_whatsapp: row.canal_whatsapp, whatsapp: row.whatsapp };
  }

  async function savePayment(card) {
    const payment = buildPaymentRecord(card);
    const { error } = await client.from("assinaturas")
      .update(payment).eq("usuario_id", ctx.userId);
    if (error) throw error;
    data.assinatura = { ...data.assinatura, ...payment };
  }

  // ---------- resumo ----------

  function channelsText(prefs) {
    const channels = [];
    if (prefs.canal_email) channels.push("E-mail");
    if (prefs.canal_whatsapp) channels.push(`WhatsApp ${phoneFromStorage(prefs.whatsapp)}`);
    return channels.join(" e ");
  }

  function summaryList(pairs) {
    return h("dl", { class: "sub-summary" }, pairs.flatMap(([term, value]) => [h("dt", { text: term }), h("dd", { text: value })]));
  }

  // ---------- wizard ----------

  const STEPS = [
    ["plano", "Plano"],
    ["inscricoes", "Inscrições"],
    ["envio", "Envio"],
    ["pagamento", "Pagamento"]
  ];

  function goTo(step) {
    wizardStep = step;
    renderWizard();
  }

  function renderStepper() {
    const current = STEPS.findIndex(([key]) => key === wizardStep);
    return h("ol", { class: "sub-stepper" }, STEPS.map(([key, label], index) => {
      const state = index < current ? "is-done" : index === current ? "is-current" : "";
      const text = `${index + 1}. ${label}`;
      return h("li", { class: state, "aria-current": index === current ? "step" : null },
        index < current ? h("button", { type: "button", text, onclick: () => goTo(key) }) : h("span", { text }));
    }));
  }

  function actions(back, next) {
    return h("div", { class: "sub-actions" }, back, next);
  }

  function backButton(step) {
    return h("button", { type: "button", class: "btn ghost", text: "Voltar", onclick: () => goTo(step) });
  }

  function renderPlanoStep() {
    const next = h("button", { type: "button", class: "btn", text: "Aceitar e continuar", onclick: () => goTo("inscricoes") });
    return h("div", { class: "sub-panel" },
      h("h2", { text: "Plano vigiAI" }),
      h("p", { class: "sub-price" }, h("strong", { text: PLAN_PRICE_LABEL }), " · plano único"),
      h("ul", { class: "sub-list" },
        h("li", { text: "Leitura diária do Diário Oficial de Santos, procurando seu nome junto com cada número de inscrição." }),
        h("li", { text: "Aviso por e-mail e/ou WhatsApp quando você for encontrado, com o que fazer e o prazo." }),
        h("li", { text: "Quantas inscrições você quiser, sem fidelidade. Cancele quando quiser." })),
      actions(null, next));
  }

  function renderInscricoesStep() {
    const editor = createInscricoesEditor(data.inscricoes);
    const message = notice();
    const next = h("button", { type: "button", class: "btn", text: "Continuar" });
    next.addEventListener("click", () => busy(next, async () => {
      message.clear();
      const result = editor.validate();
      if (!result.valid) return;
      try {
        await saveInscricoes(result.cleaned);
        goTo("envio");
      } catch (error) {
        message.show(friendlyError(error, "Não foi possível salvar as inscrições. Tente novamente."), "error");
      }
    }));
    return h("div", { class: "sub-panel" },
      h("h2", { text: "Suas inscrições" }),
      h("p", { class: "muted", text: "O agente procura todas as inscrições desta lista." }),
      editor.node, message.node,
      actions(backButton("plano"), next));
  }

  function renderEnvioStep() {
    const editor = createEnvioEditor(data.prefs, ctx.email);
    const message = notice();
    const next = h("button", { type: "button", class: "btn", text: "Continuar" });
    next.addEventListener("click", () => busy(next, async () => {
      message.clear();
      const result = editor.validate();
      if (!result.valid) return;
      try {
        await savePrefs(result.values);
        goTo("pagamento");
      } catch {
        message.show("Não foi possível salvar as preferências. Tente novamente.", "error");
      }
    }));
    return h("div", { class: "sub-panel" },
      h("h2", { text: "Como receber os avisos" }),
      editor.node, message.node,
      actions(backButton("inscricoes"), next));
  }

  function renderPagamentoStep() {
    const card = createCardEditor();
    const message = notice();
    const confirm = h("button", { type: "button", class: "btn", text: `Assinar por ${PLAN_PRICE_LABEL}` });

    confirm.addEventListener("click", () => busy(confirm, async () => {
      message.clear();
      const result = card.validate();
      if (!result.valid) return;

      const payment = buildPaymentRecord(card.read());
      const row = buildSubscriptionUpsert({ userId: ctx.userId, planoId: data.plano.id, payment });
      try {
        const { error } = await client.from("assinaturas").upsert(row, { onConflict: "usuario_id" });
        if (error) throw error;
      } catch {
        message.show("Não foi possível concluir a assinatura. Tente novamente.", "error");
        return;
      }

      card.clear();
      try {
        await window.vigiAIPortal.refreshAccess();
      } catch {
        message.show("Assinatura concluída, mas não foi possível atualizar o portal. Recarregue a página.", "error");
      }
    }));

    return h("div", { class: "sub-panel" },
      h("h2", { text: "Pagamento" }),
      summaryList([
        ["Plano", `vigiAI · ${PLAN_PRICE_LABEL}`],
        ["Inscrições", String(data.inscricoes.length)],
        ["Envio", periodicidadeLabel(data.prefs.periodicidade)],
        ["Canais", channelsText(data.prefs)]
      ]),
      card.node, message.node,
      actions(backButton("envio"), confirm));
  }

  function renderWizard() {
    const panels = {
      plano: renderPlanoStep,
      inscricoes: renderInscricoesStep,
      envio: renderEnvioStep,
      pagamento: renderPagamentoStep
    };
    root.replaceChildren(renderStepper(), panels[wizardStep]());
  }

  // ---------- modo gerenciar ----------

  function renderManage(flash = {}) {
    const assinatura = data.assinatura;
    const nextCharge = assinatura.expira_em ? new Date(assinatura.expira_em).toLocaleDateString("pt-BR") : "—";

    // Bloco 1: plano e pagamento
    const paymentMessage = notice();
    const cardArea = h("div", { hidden: true });
    const cardEditor = createCardEditor();
    const saveCard = h("button", { type: "button", class: "btn", text: "Salvar cartão" });
    cardArea.append(cardEditor.node, h("div", { class: "sub-actions" }, saveCard));
    const changeCard = h("button", {
      type: "button", class: "btn ghost btn--small", text: "Trocar cartão",
      onclick: () => { cardArea.hidden = !cardArea.hidden; }
    });
    saveCard.addEventListener("click", () => busy(saveCard, async () => {
      paymentMessage.clear();
      const result = cardEditor.validate();
      if (!result.valid) return;
      try {
        await savePayment(cardEditor.read());
        cardEditor.clear();
        renderManage({ pagamento: "Cartão atualizado." });
      } catch {
        paymentMessage.show("Não foi possível salvar o cartão. Tente novamente.", "error");
      }
    }));

    const blockPlano = h("section", { class: "sub-block" },
      h("h2", { text: "Plano e pagamento" }),
      summaryList([
        ["Plano", `vigiAI · ${PLAN_PRICE_LABEL}`],
        ["Próxima cobrança", `${PLAN_PRICE_LABEL.split("/")[0]} em ${nextCharge}`],
        ["Cartão", assinatura.pagamento_final
          ? `${assinatura.pagamento_bandeira} final ${assinatura.pagamento_final} · ${assinatura.pagamento_titular}`
          : "Não informado"]
      ]),
      changeCard, cardArea, paymentMessage.node);

    // Bloco 2: inscrições
    const inscricoesEditor = createInscricoesEditor(data.inscricoes);
    const inscricoesMessage = notice();
    const saveInscricoesButton = h("button", { type: "button", class: "btn", text: "Salvar inscrições" });
    saveInscricoesButton.addEventListener("click", () => busy(saveInscricoesButton, async () => {
      inscricoesMessage.clear();
      const result = inscricoesEditor.validate();
      if (!result.valid) return;
      try {
        await saveInscricoes(result.cleaned);
        renderManage({ inscricoes: "Inscrições salvas." });
      } catch (error) {
        inscricoesMessage.show(friendlyError(error, "Não foi possível salvar as inscrições. Tente novamente."), "error");
      }
    }));
    const blockInscricoes = h("section", { class: "sub-block" },
      h("h2", { text: "Inscrições" }),
      inscricoesEditor.node, inscricoesMessage.node,
      h("div", { class: "sub-actions" }, saveInscricoesButton));

    // Bloco 3: envio
    const envioEditor = createEnvioEditor(data.prefs, ctx.email);
    const envioMessage = notice();
    const saveEnvioButton = h("button", { type: "button", class: "btn", text: "Salvar preferências" });
    saveEnvioButton.addEventListener("click", () => busy(saveEnvioButton, async () => {
      envioMessage.clear();
      const result = envioEditor.validate();
      if (!result.valid) return;
      try {
        await savePrefs(result.values);
        envioMessage.show("Preferências salvas.");
      } catch {
        envioMessage.show("Não foi possível salvar as preferências. Tente novamente.", "error");
      }
    }));
    const blockEnvio = h("section", { class: "sub-block" },
      h("h2", { text: "Envio" }),
      envioEditor.node, envioMessage.node,
      h("div", { class: "sub-actions" }, saveEnvioButton));

    // Cancelamento
    const cancelButton = h("button", { type: "button", class: "btn ghost", text: "Cancelar assinatura" });
    const dialog = h("dialog", { class: "sub-dialog" });
    const keep = h("button", { type: "button", class: "btn ghost", text: "Manter assinatura", onclick: () => dialog.close() });
    const confirmCancel = h("button", { type: "button", class: "btn sub-danger", text: "Cancelar assinatura" });
    const cancelMessage = notice();
    dialog.append(
      h("h2", { text: "Cancelar assinatura?" }),
      h("p", { text: "O monitoramento para imediatamente e o portal volta a ficar restrito a esta aba. Suas inscrições e preferências ficam salvas se você quiser assinar de novo." }),
      cancelMessage.node,
      h("div", { class: "sub-actions" }, keep, confirmCancel));
    confirmCancel.addEventListener("click", () => busy(confirmCancel, async () => {
      cancelMessage.clear();
      const { error } = await client.from("assinaturas").update({ status: "cancelada" }).eq("usuario_id", ctx.userId);
      if (error) {
        cancelMessage.show("Não foi possível cancelar. Tente novamente.", "error");
        return;
      }
      dialog.close();
      try {
        await window.vigiAIPortal.refreshAccess();
      } catch {
        window.location.reload();
      }
    }));
    cancelButton.addEventListener("click", () => dialog.showModal());

    if (flash.pagamento) paymentMessage.show(flash.pagamento);
    if (flash.inscricoes) inscricoesMessage.show(flash.inscricoes);

    root.replaceChildren(blockPlano, blockInscricoes, blockEnvio,
      h("div", { class: "sub-block sub-cancel" }, cancelButton), dialog);
  }

  // ---------- entrada ----------

  async function show() {
    root.replaceChildren(h("p", { class: "portal-empty", text: "Carregando…" }));
    try {
      await loadData();
    } catch {
      const retry = h("button", { type: "button", class: "btn", text: "Tentar de novo", onclick: show });
      root.replaceChildren(h("p", { class: "portal-empty", text: "Não foi possível carregar esta área." }), retry);
      return;
    }

    if (!data.plano) {
      root.replaceChildren(h("p", { class: "portal-empty", text: "O plano não está disponível no momento." }));
      return;
    }

    if (ctx.guard.locked) {
      wizardStep = firstIncompleteStep({ inscricoes: data.inscricoes.length, preferencias: Boolean(data.prefs) });
      renderWizard();
    } else {
      renderManage();
    }
  }

  window.addEventListener("portal:access", event => {
    if (!client) return;
    const { guard, session } = event.detail;
    ctx = { userId: session.user.id, email: session.user.email, guard };
    show();
  });
}());
