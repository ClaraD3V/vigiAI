/* Configuração central (valores de exemplo, fáceis de alterar). */
const CONFIG = {
  currency: "BRL"
};

const PLANS = [
  { id: "basic", name: "Básico", monitoringLimit: 1, notificationChannelLimit: 1, price: 9.99 },
  { id: "medium", name: "Médio", monitoringLimit: 3, notificationChannelLimit: 2, price: 14.99 },
  { id: "pro", name: "Pro", monitoringLimit: 10, notificationChannelLimit: 3, price: 19.99 }
];

const CHANNELS = [
  { id: "whatsapp", name: "WhatsApp", icon: "💬", desc: "Receba seus alertas pelo WhatsApp." },
  { id: "telegram", name: "Telegram", icon: "✈️", desc: "Receba seus alertas pelo Telegram." },
  { id: "instagram", name: "Instagram", icon: "📷", desc: "Receba seus alertas pelo Instagram." }
];

const fmtPrice = price => `${new Intl.NumberFormat("pt-BR", { style: "currency", currency: CONFIG.currency }).format(price)}/mês`;

const planCards = document.querySelector("#planCards");
planCards.innerHTML = PLANS.map(planOption => `
  <div class="card plan">
    <h3>${planOption.name}</h3>
    <div class="price">${fmtPrice(planOption.price)}</div>
    <p class="muted plan-copy">${planOption.monitoringLimit} monitoramento(s)<br>${planOption.notificationChannelLimit} canal(is) simultâneo(s)<br>Monitoramento automático<br>Identificação por dados cadastrados</p>
    <a class="btn ghost" href="account.html" data-pick="${planOption.id}">Escolher ${planOption.name}</a>
  </div>
`).join("");

document.addEventListener("click", event => {
  const selection = event.target.closest("[data-pick]");
  if (!selection) return;

  const chosenPlan = selection.dataset.pick;
  localStorage.setItem("vigiAI-selected-plan", chosenPlan);
  window.location.href = "account.html";
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
