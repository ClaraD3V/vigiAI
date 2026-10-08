/* Configuração central (valores de exemplo, fáceis de alterar). */
const CONFIG = {
  AGENT_API_URL: "",
  DATABASE_API_URL: "",
  MONITORING_ID: "mon_01JXYZ",
  currency: "BRL"
};
// URLs vazias = simulação local.
// O agente recebe somente o payload definido no contrato, enquanto o banco recebe o registro completo.

const CHANNELS = [
  { id: "whatsapp", name: "WhatsApp", icon: "💬", desc: "Receba seus alertas pelo WhatsApp." },
  { id: "telegram", name: "Telegram", icon: "✈️", desc: "Receba seus alertas pelo Telegram." },
  { id: "instagram", name: "Instagram", icon: "📷", desc: "Receba seus alertas pelo Instagram." }
];

const PLANS = [
  { id: "basic", name: "Básico", monitoringLimit: 1, notificationChannelLimit: 1, price: 9.99 },
  { id: "medium", name: "Médio", monitoringLimit: 3, notificationChannelLimit: 2, price: 14.99 },
  { id: "pro", name: "Pro", monitoringLimit: 10, notificationChannelLimit: 3, price: 19.99 }
];

const MSG = {
  loading: "Configurando seu monitoramento...",
  success: "Cadastro realizado! Seu monitoramento está sendo configurado.",
  error: "Não foi possível concluir o cadastro. Verifique seus dados e tente novamente.",
  monLimit: "Você atingiu o limite de monitoramentos do seu plano.",
  chLimit: n => `Seu plano permite utilizar até ${n} canais de comunicação.`
};

const STEPS = ["Dados", "Monitoramento", "Alertas", "Plano", "Confirmar"];
const $ = selector => document.querySelector(selector);

const fmtPrice = price => price == null
  ? "Valor a definir"
  : `${new Intl.NumberFormat("pt-BR", { style: "currency", currency: CONFIG.currency }).format(price)}/mês`;

const plan = id => PLANS.find(item => item.id === id);

const state = {
  step: 0,
  user: { fullName: "", cpf: "", birthDate: "", email: "", phone: "" },
  monitorings: [{ registrationNumber: "", process: "" }],
  channels: [],
  planId: "basic",
  status: "form",
  errors: {}
};

function validCPF(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;

  for (let index = 9; index < 11; index += 1) {
    let sum = 0;
    for (let digitIndex = 0; digitIndex < index; digitIndex += 1) {
      sum += Number(digits[digitIndex]) * (index + 1 - digitIndex);
    }
    if ((sum * 10 % 11) % 10 !== Number(digits[index])) return false;
  }

  return true;
}

const maskCPF = value => value
  .replace(/\D/g, "")
  .slice(0, 11)
  .replace(/(\d{3})(\d)/, "$1.$2")
  .replace(/(\d{3})(\d)/, "$1.$2")
  .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

const maskPhone = value => value
  .replace(/\D/g, "")
  .slice(0, 11)
  .replace(/^(\d{2})(\d)/, "($1) $2")
  .replace(/(\d{5})(\d{1,4})$/, "$1-$2");

function validDate(value) {
  if (!value) return false;

  const date = new Date(`${value}T00:00:00`);
  const year = date.getFullYear();
  return !Number.isNaN(date.getTime()) && year > 1900 && date < new Date();
}

const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function validate(step) {
  const errors = {};
  const { user } = state;

  if (step === 0) {
    if (user.fullName.trim().split(/\s+/).length < 2) {
      errors.fullName = "Informe o nome completo.";
    }
    if (!validCPF(user.cpf)) errors.cpf = "CPF inválido.";
    if (!validDate(user.birthDate)) errors.birthDate = "Informe uma data de nascimento válida.";
    if (!validEmail(user.email)) errors.email = "E-mail inválido.";
    if (user.phone.replace(/\D/g, "").length < 10) {
      errors.phone = "Informe um telefone/WhatsApp válido.";
    }
  }

  if (step === 1) {
    state.monitorings.forEach((monitoring, index) => {
      if (!monitoring.registrationNumber.trim()) {
        errors[`reg${index}`] = "Informe o número de inscrição.";
      }
    });

    if (state.monitorings.length > plan(state.planId).monitoringLimit) {
      errors.limit = MSG.monLimit;
    }
  }

  if (step === 2) {
    const limit = plan(state.planId).notificationChannelLimit;
    if (!state.channels.length) errors.channels = "Escolha ao menos um canal.";
    if (state.channels.length > limit) errors.channels = MSG.chLimit(limit);
  }

  state.errors = errors;
  return !Object.keys(errors).length;
}

function renderSteps() {
  const stepsElement = document.querySelector("#steps");
  stepsElement.innerHTML = STEPS.map((step, index) => {
    const stateClass = index === state.step ? "on" : index < state.step ? "done" : "";
    const prefix = index < state.step ? "✓ " : "";
    return `<span class="${stateClass}">${prefix}${step}</span>`;
  }).join("");
}

const errorMessage = key => (state.errors[key] ? `<div class="err">${state.errors[key]}</div>` : "");

const field = (key, label, type, placeholder, extra = "") => `
  <div class="field">
    <label for="f_${key}">${label}</label>
    <input id="f_${key}" type="${type}" value="${state.user[key]}" placeholder="${placeholder}" ${extra} data-user="${key}" autocomplete="off">
    ${errorMessage(key)}
  </div>
`;

function render() {
  renderSteps();

  const stage = document.querySelector("#stage");
  const selectedPlan = plan(state.planId);

  if (state.status === "loading") {
    stage.innerHTML = `<p class="sans"><b>⏳ ${MSG.loading}</b></p>`;
    return;
  }

  if (state.status === "success") {
    stage.innerHTML = `<div class="msg ok">✓ ${MSG.success}</div>`;
    return;
  }

  let markup = "";

  if (state.step === 0) {
    markup = `
      <h3>Sobre você</h3>
      ${field("fullName", "Nome completo", "text", "Seu nome completo")}
      ${field("cpf", "CPF", "text", "000.000.000-00", "inputmode=\"numeric\"")}
      ${field("birthDate", "Data de nascimento", "date", "")}
      ${field("email", "E-mail", "email", "voce@email.com")}
      ${field("phone", "Telefone/WhatsApp", "tel", "(13) 90000-0000")}
    `;
  }

  if (state.step === 1) {
    markup = `
      <h3>O que você quer acompanhar?</h3>
      <p class="muted monitoring-copy">Cada monitoramento representa um processo, concurso ou edital que você deseja acompanhar. Não é preciso informar link.</p>
    `;

    markup += state.monitorings.map((monitoring, index) => `
      <div class="card card--compact">
        <b class="sans">Monitoramento ${String(index + 1).padStart(2, "0")}</b>
        <div class="field" style="margin-top: 10px;">
          <label>Número de inscrição</label>
          <input data-mon="${index}" data-k="registrationNumber" value="${monitoring.registrationNumber}" placeholder="Ex.: 123456" inputmode="numeric">
          ${errorMessage(`reg${index}`)}
        </div>
        <div class="field">
          <label>Processo / concurso / edital</label>
          <input data-mon="${index}" data-k="process" value="${monitoring.process}" placeholder="Ex.: Concurso Público X">
        </div>
        <div class="sans" style="font-size: 0.85rem; color: var(--ok);">● Monitorando (após confirmação)</div>
        ${state.monitorings.length > 1 ? `<button class="btn ghost btn--small" data-rm="${index}">Remover</button>` : ""}
      </div>
    `).join("");

    const limitMarkup = `
      <p class="sans monitoring-copy">Você está utilizando <b>${state.monitorings.length} de ${selectedPlan.monitoringLimit}</b> monitoramentos.</p>
      ${errorMessage("limit")}
      <button class="btn ghost" id="addMon">+ Adicionar monitoramento</button>
    `;
    markup += limitMarkup;
  }

  if (state.step === 2) {
    markup = `
      <h3>Onde você quer receber seus alertas?</h3>
      <p class="sans channel-copy">Seu plano permite escolher até <b>${selectedPlan.notificationChannelLimit} canais de comunicação</b>.</p>
      ${CHANNELS.map(channel => `
        <button class="chan ${state.channels.includes(channel.id) ? "on" : ""}" data-ch="${channel.id}" aria-pressed="${state.channels.includes(channel.id)}">
          <span class="ic">${channel.icon}</span>
          <span><b>${channel.name}</b><br><span class="muted">${channel.desc}</span></span>
        </button>
      `).join("")}
      ${errorMessage("channels")}
    `;
  }

  if (state.step === 3) {
    markup = `
      <h3>Escolha seu plano</h3>
      ${PLANS.map(planOption => `
        <button class="chan ${planOption.id === state.planId ? "on" : ""}" data-plan="${planOption.id}">
          <span><b>${planOption.name}</b> — ${fmtPrice(planOption.price)}<br><span class="muted">${planOption.monitoringLimit} monitoramento(s) · ${planOption.notificationChannelLimit} canal(is) simultâneo(s)</span></span>
        </button>
      `).join("")}
    `;
  }

  if (state.step === 4) {
    const { user } = state;
    const channels = state.channels.map(channelId => CHANNELS.find(channel => channel.id === channelId).name);
    const [year, month, day] = user.birthDate.split("-");

    markup = `
      <h3>Confirme seus dados</h3>
      <dl class="sum">
        <dt>Seus dados</dt>
        <dd>${esc(user.fullName)}</dd>
        <dd class="muted">CPF ${user.cpf.slice(0, 3).replace(/\d/g, "*")}.***.***-**</dd>
        <dd class="muted">Nascimento **/**/${year}</dd>
        <dt>Monitoramentos</dt>
        ${state.monitorings.map(monitoring => `
          <dd>${esc(monitoring.process || "Processo não informado")} <span class="muted">· Inscrição ${esc(monitoring.registrationNumber)}</span></dd>
        `).join("")}
        <dt>Plano</dt>
        <dd>${selectedPlan.name} — ${fmtPrice(selectedPlan.price)}</dd>
        <dt>Canais de alerta</dt>
        ${channels.map(name => `<dd>✓ ${name}</dd>`).join("")}
      </dl>
      ${state.status === "error" ? `<div class="msg bad">${MSG.error}</div>` : ""}
    `;
  }

  const isLastStep = state.step === 4;
  markup += `
    <div class="nav">
      <button class="btn ghost" id="back" ${state.step === 0 ? "disabled" : ""}>Voltar</button>
      <button class="btn" id="next">${isLastStep ? "Confirmar cadastro" : "Continuar"}</button>
    </div>
  `;

  stage.innerHTML = markup;
}

const esc = value => String(value).replace(/[&<>"']/g, character => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[character]));

const stage = document.querySelector("#stage");
stage.addEventListener("input", event => {
  const target = event.target;

  if (target.dataset.user) {
    let value = target.value;
    if (target.dataset.user === "cpf") value = target.value = maskCPF(value);
    if (target.dataset.user === "phone") value = target.value = maskPhone(value);
    state.user[target.dataset.user] = value;
  }

  if (target.dataset.mon !== undefined) {
    state.monitorings[Number(target.dataset.mon)][target.dataset.k] = target.value;
  }
});

stage.addEventListener("click", async event => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.id === "back") {
    state.step -= 1;
    state.errors = {};
    render();
  }

  if (button.id === "next") {
    if (!validate(state.step)) {
      render();
      return;
    }
    if (state.step < 4) {
      state.step += 1;
      render();
      return;
    }
    await submit();
  }

  if (button.id === "addMon") {
    if (state.monitorings.length >= plan(state.planId).monitoringLimit) {
      state.errors = { limit: MSG.monLimit };
    } else {
      state.errors = {};
      state.monitorings.push({ registrationNumber: "", process: "" });
    }
    render();
  }

  if (button.dataset.rm) {
    state.monitorings.splice(Number(button.dataset.rm), 1);
    render();
  }

  if (button.dataset.ch) {
    const id = button.dataset.ch;
    const limit = plan(state.planId).notificationChannelLimit;
    const index = state.channels.indexOf(id);

    if (index > -1) {
      state.channels.splice(index, 1);
      state.errors = {};
    } else if (state.channels.length >= limit) {
      state.errors = {
        channels: `Seu plano permite até ${limit} ${limit > 1 ? "canais" : "canal"}. Faça upgrade para utilizar mais canais.`
      };
    } else {
      state.channels.push(id);
      state.errors = {};
    }
    render();
  }

  if (button.dataset.plan) {
    state.planId = button.dataset.plan;
    const selected = plan(state.planId);
    state.channels = state.channels.slice(0, selected.notificationChannelLimit);
    state.monitorings = state.monitorings.slice(0, selected.monitoringLimit);
    render();
  }
});

async function submit() {
  const agentPayload = buildAgentPayload({
    monitoringId: CONFIG.MONITORING_ID,
    user: state.user,
    monitorings: state.monitorings
  });

  const databaseRecord = buildDatabaseRecord({
    monitoringId: CONFIG.MONITORING_ID,
    user: state.user,
    monitorings: state.monitorings,
    channels: state.channels,
    planId: state.planId
  });

  state.status = "loading";
  render();

  try {
    if (CONFIG.AGENT_API_URL) {
      const agentResponse = await fetch(CONFIG.AGENT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentPayload)
      });

      if (!agentResponse.ok) throw new Error(`Agente: ${agentResponse.status}`);
    } else {
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    if (CONFIG.DATABASE_API_URL) {
      const databaseResponse = await fetch(CONFIG.DATABASE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(databaseRecord)
      });

      if (!databaseResponse.ok) throw new Error(`Banco: ${databaseResponse.status}`);
    } else {
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    state.status = "success";
  } catch {
    state.status = "error";
  }

  render();
}

const planCards = document.querySelector("#planCards");
planCards.innerHTML = PLANS.map(planOption => `
  <div class="card plan">
    <h3>${planOption.name}</h3>
    <div class="price">${fmtPrice(planOption.price)}</div>
    <p class="muted plan-copy">${planOption.monitoringLimit} monitoramento(s)<br>${planOption.notificationChannelLimit} canal(is) simultâneo(s)<br>Monitoramento automático<br>Identificação por dados cadastrados</p>
    <a class="btn ghost" href="#cadastro" data-pick="${planOption.id}">Escolher ${planOption.name}</a>
  </div>
`).join("");

document.addEventListener("click", event => {
  const selection = event.target.closest("[data-pick]");
  if (!selection) return;

  state.planId = selection.dataset.pick;
  state.channels = state.channels.slice(0, plan(state.planId).notificationChannelLimit);
  state.step = Math.min(state.step, 4);
  render();
});

const planTable = document.querySelector("#planTable");
planTable.innerHTML = `
  <tr><th>Recurso</th>${PLANS.map(planOption => `<th>${planOption.name}</th>`).join("")}</tr>
  <tr><td>Monitoramentos</td>${PLANS.map(planOption => `<td>${planOption.monitoringLimit}</td>`).join("")}</tr>
  ${CHANNELS.map(channel => `<tr><td>${channel.name}</td>${PLANS.map(() => "<td>✓</td>").join("")}</tr>`).join("")}
  <tr><td>Canais simultâneos</td>${PLANS.map(planOption => `<td><b>${planOption.notificationChannelLimit}</b></td>`).join("")}</tr>
  <tr><td>Monitoramento automático</td>${PLANS.map(() => "<td>✓</td>").join("")}</tr>
  <tr><td>Alertas</td>${PLANS.map(() => "<td>✓</td>").join("")}</tr>
`;

render();
