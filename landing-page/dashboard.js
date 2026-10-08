(function () {
  "use strict";

  const PLAN_RULES = {
    basic: { name: "Básico", price: 79.0, billing: "mensal", maxMonitoring: 1, maxChannels: 1, benefits: ["1 monitoramento", "1 canal de notificação", "Curadoria automática do Diário Oficial de Santos"] },
    medium: { name: "Médio", price: 149.0, billing: "mensal", maxMonitoring: 3, maxChannels: 2, benefits: ["Até 3 monitoramentos", "Até 2 canais ativos", "Histórico detalhado de verificações e notificações"] },
    pro: { name: "Pro", price: 249.0, billing: "mensal", maxMonitoring: 10, maxChannels: 3, benefits: ["Até 10 monitoramentos", "Até 3 canais ativos", "Acompanhamento priorizado e suporte dedicado"] }
  };

  const DEMO_ACCOUNT = {
    currentPlan: "medium",
    status: "active",
    paymentMethod: "Cartão de crédito final 4242",
    nextChargeDate: "2026-10-22",
    lastChargeDate: "2026-09-22",
    lastChargeValue: 149.0,
    billingHistory: [
      { date: "2026-09-22", description: "Assinatura do plano Médio", value: 149.0, status: "Pago" },
      { date: "2026-08-22", description: "Assinatura do plano Médio", value: 149.0, status: "Pago" },
      { date: "2026-07-22", description: "Ajuste de plano", value: 0, status: "Cancelado" }
    ],
    channels: [
      { id: "whatsapp", name: "WhatsApp", configured: true, connected: true },
      { id: "telegram", name: "Telegram", configured: true, connected: false },
      { id: "instagram", name: "Instagram", configured: false, connected: false }
    ],
    monitorings: [
      {
        id: "mon_1024",
        title: "Convocação de aprovados",
        source: "Diário Oficial de Santos",
        status: "active",
        startedAt: "2026-07-12",
        lastCheckedAt: "2026-10-08T08:30:00",
        lastNotificationAt: "2026-10-07T18:45:00",
        channels: ["WhatsApp", "Telegram"],
        checks: [
          { date: "2026-10-08 08:30", result: "Verificação concluída sem novas publicações" },
          { date: "2026-10-07 18:45", result: "Notificação enviada ao WhatsApp" }
        ],
        notifications: [
          { date: "2026-10-07 18:45", channel: "WhatsApp", status: "Enviado", message: "Publicação relacionada encontrada." },
          { date: "2026-10-06 19:10", channel: "Telegram", status: "Enviado", message: "Atualização do edital incluída." }
        ]
      },
      {
        id: "mon_2051",
        title: "Licitação municipal",
        source: "Diário Oficial de Santos",
        status: "paused",
        startedAt: "2026-06-20",
        lastCheckedAt: "2026-10-02T09:15:00",
        lastNotificationAt: null,
        channels: ["WhatsApp"],
        checks: [
          { date: "2026-10-02 09:15", result: "Monitoramento pausado pelo cliente" }
        ],
        notifications: []
      },
      {
        id: "mon_1987",
        title: "Concurso público",
        source: "Diário Oficial de Santos",
        status: "error",
        startedAt: "2026-05-18",
        lastCheckedAt: "2026-10-04T15:40:00",
        lastNotificationAt: "2026-10-01T10:00:00",
        channels: ["Telegram"],
        checks: [
          { date: "2026-10-04 15:40", result: "Falha na última verificação" }
        ],
        notifications: [
          { date: "2026-10-01 10:00", channel: "Telegram", status: "Enviado", message: "Ajuste de edital publicado." }
        ],
        error: "A integração com o canal Telegram apresentou uma falha temporária."
      }
    ]
  };

  const state = { activeTab: "subscription" };
  const formatCurrency = value => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
  const formatDate = value => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };
  const formatDateTime = value => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  function getPlanById(planId) {
    return PLAN_RULES[planId] ?? PLAN_RULES.medium;
  }

  function getStatusMeta(status) {
    const statusMap = {
      active: { label: "Ativa", className: "status-badge--success" },
      pending: { label: "Pendente", className: "status-badge--warning" },
      delayed: { label: "Em atraso", className: "status-badge--danger" },
      canceled: { label: "Cancelada", className: "status-badge--muted" },
      expired: { label: "Expirada", className: "status-badge--muted" },
      paused: { label: "Pausado", className: "status-badge--warning" },
      processing: { label: "Em processamento", className: "status-badge--info" },
      completed: { label: "Concluído", className: "status-badge--success" },
      error: { label: "Com erro", className: "status-badge--danger" }
    };

    return statusMap[status] ?? { label: "Sem status", className: "status-badge--muted" };
  }

  function renderSubscriptionPanel() {
    const plan = getPlanById(DEMO_ACCOUNT.currentPlan);
    const planStatusMeta = getStatusMeta(DEMO_ACCOUNT.status);
    const connectedCount = DEMO_ACCOUNT.channels.filter(item => item.connected).length;
    const panel = document.querySelector("#subscriptionPanel");

    panel.innerHTML = `
      <div class="panel-section">
        <div class="subscription-card">
          <div class="section-header">
            <div>
              <p class="eyebrow">Plano atual</p>
              <h2>${plan.name}</h2>
            </div>
            <span class="status-badge ${planStatusMeta.className}">${planStatusMeta.label}</span>
          </div>

          <div class="price-row">
            <div>
              <span class="amount">${formatCurrency(plan.price)}</span>
              <small>/ ${plan.billing}</small>
            </div>
            <div class="billing-meta">
              <span class="muted">Próxima cobrança</span>
              <strong>${formatDate(DEMO_ACCOUNT.nextChargeDate)}</strong>
            </div>
          </div>

          <ul class="benefit-list">
            ${plan.benefits.map(item => `<li>${item}</li>`).join("")}
          </ul>

          <div class="button-row button-row--split">
            <button type="button" class="btn" id="changePlanButton">Alterar plano</button>
            <button type="button" class="btn ghost btn--danger" id="cancelSubscriptionButton">Cancelar assinatura</button>
          </div>
        </div>
      </div>

      <div class="panel-section">
        <div class="subsection-card">
          <div class="section-header compact">
            <h3>Canais de notificação contratados</h3>
          </div>
          <div class="channel-grid">
            ${DEMO_ACCOUNT.channels.map(channel => {
              const stateMeta = channel.connected ? getStatusMeta("active") : getStatusMeta("pending");
              const configuredText = channel.configured ? "Configurado" : "Não contratado";
              return `
                <div class="info-card">
                  <div class="info-card__top">
                    <strong>${channel.name}</strong>
                    <span class="status-badge ${stateMeta.className}">${channel.connected ? "Conectado" : "Pendente"}</span>
                  </div>
                  <p class="muted">${configuredText}</p>
                  <small>${channel.connected ? "Integração ativa" : "Aguardando ativação da integração"}</small>
                </div>
              `;
            }).join("")}
          </div>
          <p class="muted inline-note">Seu plano inclui até ${plan.maxChannels} canais simultâneos. Hoje, ${connectedCount} estão ativos.</p>
        </div>
      </div>

      <div class="panel-section">
        <div class="subsection-card">
          <div class="section-header compact">
            <h3>Pagamentos e cobranças</h3>
          </div>

          <div class="payment-grid">
            <div class="info-card payment-card">
              <span class="muted">Método de pagamento</span>
              <strong>${DEMO_ACCOUNT.paymentMethod}</strong>
            </div>
            <div class="info-card payment-card">
              <span class="muted">Última cobrança</span>
              <strong>${formatDate(DEMO_ACCOUNT.lastChargeDate)} · ${formatCurrency(DEMO_ACCOUNT.lastChargeValue)}</strong>
            </div>
            <div class="info-card payment-card">
              <span class="muted">Próxima cobrança</span>
              <strong>${formatDate(DEMO_ACCOUNT.nextChargeDate)} · ${formatCurrency(plan.price)}</strong>
            </div>
            <div class="info-card payment-card">
              <span class="muted">Status do pagamento</span>
              <strong>Em dia</strong>
            </div>
          </div>

          <div class="button-row button-row--inline">
            <button type="button" class="btn btn--small" id="updatePaymentButton">Atualizar método de pagamento</button>
            <button type="button" class="btn ghost btn--small" id="resolvePaymentButton">Regularizar pagamento pendente</button>
          </div>

          <div class="history-table-wrap">
            <table class="history-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${DEMO_ACCOUNT.billingHistory.map(item => `
                  <tr>
                    <td>${formatDate(item.date)}</td>
                    <td>${item.description}</td>
                    <td>${formatCurrency(item.value)}</td>
                    <td><span class="status-badge ${item.status === "Pago" ? "status-badge--success" : "status-badge--muted"}">${item.status}</span></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function renderMonitoringPanel() {
    const total = DEMO_ACCOUNT.monitorings.length;
    const active = DEMO_ACCOUNT.monitorings.filter(item => item.status === "active").length;
    const paused = DEMO_ACCOUNT.monitorings.filter(item => item.status === "paused").length;
    const availableLimit = getPlanById(DEMO_ACCOUNT.currentPlan).maxMonitoring;
    const panel = document.querySelector("#monitoringPanel");

    panel.innerHTML = `
      <div class="panel-section">
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-label">Total permitido</span>
            <strong>${availableLimit}</strong>
          </div>
          <div class="stat-card">
            <span class="stat-label">Ativos</span>
            <strong>${active}</strong>
          </div>
          <div class="stat-card">
            <span class="stat-label">Pausados</span>
            <strong>${paused}</strong>
          </div>
          <div class="stat-card">
            <span class="stat-label">Status do serviço</span>
            <strong>Operando</strong>
          </div>
        </div>
      </div>

      <div class="panel-section">
        <div class="subsection-card">
          <div class="section-header compact">
            <h3>Lista de monitoramentos</h3>
          </div>

          ${total === 0 ? `
            <div class="empty-state">
              <h4>Você ainda não possui monitoramentos ativos.</h4>
              <p>Nossa equipe está preparando seu acompanhamento ou você pode consultar as opções disponíveis para sua conta.</p>
            </div>
          ` : `
            <div class="monitoring-list">
              ${DEMO_ACCOUNT.monitorings.map(item => {
                const meta = getStatusMeta(item.status);
                const actionLabel = item.status === "paused" ? "Retomar" : "Pausar";
                return `
                  <article class="monitoring-card">
                    <div class="monitoring-header">
                      <div>
                        <h4>${item.title}</h4>
                        <p class="muted">${item.source}</p>
                      </div>
                      <span class="status-badge ${meta.className}">${meta.label}</span>
                    </div>

                    <dl class="monitoring-meta">
                      <div>
                        <dt>Início</dt>
                        <dd>${formatDate(item.startedAt)}</dd>
                      </div>
                      <div>
                        <dt>Última verificação</dt>
                        <dd>${formatDateTime(item.lastCheckedAt)}</dd>
                      </div>
                      <div>
                        <dt>Última notificação</dt>
                        <dd>${item.lastNotificationAt ? formatDateTime(item.lastNotificationAt) : "—"}</dd>
                      </div>
                    </dl>

                    <div class="channel-pills">
                      ${item.channels.map(channel => `<span>${channel}</span>`).join("")}
                    </div>

                    <div class="button-row button-row--inline">
                      <button type="button" class="btn btn--small" data-monitor-action="details" data-monitor-id="${item.id}">Ver detalhes</button>
                      <button type="button" class="btn ghost btn--small" data-monitor-action="toggle" data-monitor-id="${item.id}">${actionLabel}</button>
                      <button type="button" class="btn ghost btn--small btn--danger" data-monitor-action="end" data-monitor-id="${item.id}">Encerrar monitoramento</button>
                    </div>
                  </article>
                `;
              }).join("")}
            </div>
          `}
        </div>
      </div>
    `;
  }

  function renderCurrentTab() {
    const tabs = document.querySelectorAll("[data-client-tab]");
    tabs.forEach(button => {
      const isActive = button.dataset.clientTab === state.activeTab;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    const subscriptionPanel = document.querySelector("#subscriptionPanel");
    const monitoringPanel = document.querySelector("#monitoringPanel");
    subscriptionPanel.hidden = state.activeTab !== "subscription";
    monitoringPanel.hidden = state.activeTab !== "monitoring";

    if (state.activeTab === "subscription") {
      renderSubscriptionPanel();
      return;
    }

    renderMonitoringPanel();
  }

  function showModal(title, bodyHtml) {
    const modal = document.querySelector("#modalBackdrop");
    const modalTitle = document.querySelector("#modalTitle");
    const modalBody = document.querySelector("#modalBody");
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modal.hidden = false;
  }

  function closeModal() {
    const modal = document.querySelector("#modalBackdrop");
    if (modal) { modal.hidden = true; }
  }

  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `msg ${type === "error" ? "bad" : "ok"}`;
    toast.textContent = message;
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
  }

  function changePlan() {
    const planOptions = Object.entries(PLAN_RULES).map(([id, plan]) => `
      <button type="button" class="plan-option" data-plan-option="${id}">
        <strong>${plan.name}</strong>
        <span>${formatCurrency(plan.price)}/mês</span>
        <small>${plan.maxMonitoring} monitoramentos · ${plan.maxChannels} canais</small>
      </button>
    `).join("");

    showModal("Alterar plano", `
      <p class="muted">Antes de confirmar, revise as alterações de cobrança e o impacto no limite de canais e monitoramentos.</p>
      <div class="plan-option-list">${planOptions}</div>
    `);
  }

  function toggleMonitorStatus(monitorId) {
    const item = DEMO_ACCOUNT.monitorings.find(entry => entry.id === monitorId);
    if (!item) return;
    item.status = item.status === "paused" ? "active" : "paused";
    renderMonitoringPanel();
    showToast(item.status === "paused" ? "Monitoramento pausado com sucesso." : "Monitoramento retomado com sucesso.", "ok");
  }

  function closeMonitoring(monitorId) {
    const item = DEMO_ACCOUNT.monitorings.find(entry => entry.id === monitorId);
    if (!item) return;
    const confirmed = window.confirm(`Tem certeza que deseja encerrar o monitoramento “${item.title}”?`);
    if (!confirmed) return;
    item.status = "completed";
    renderMonitoringPanel();
    showToast("Monitoramento encerrado com sucesso.", "ok");
  }

  function showMonitoringDetails(monitorId) {
    const item = DEMO_ACCOUNT.monitorings.find(entry => entry.id === monitorId);
    if (!item) return;

    const notificationsHtml = item.notifications.length
      ? item.notifications.map(notification => `
          <li>
            <strong>${notification.date}</strong>
            <span>${notification.channel}</span>
            <small>${notification.status}</small>
            <p>${notification.message}</p>
          </li>
        `).join("")
      : "<li>Nenhuma notificação registrada.</li>";

    const checksHtml = item.checks.length
      ? item.checks.map(check => `<li><strong>${check.date}</strong><p>${check.result}</p></li>`).join("")
      : "<li>Sem verificações registradas.</li>";

    showModal("Detalhes do monitoramento", `
      <div class="detail-card">
        <div class="detail-highlight">
          <p class="eyebrow">Identificação</p>
          <h3>${item.title}</h3>
        </div>
        <dl class="detail-list">
          <div><dt>Status</dt><dd>${getStatusMeta(item.status).label}</dd></div>
          <div><dt>Início</dt><dd>${formatDate(item.startedAt)}</dd></div>
          <div><dt>Fonte</dt><dd>${item.source}</dd></div>
          <div><dt>Canais</dt><dd>${item.channels.join(", ") || "—"}</dd></div>
        </dl>

        <section>
          <h4>Últimas verificações</h4>
          <ul class="detail-list-items">${checksHtml}</ul>
        </section>

        <section>
          <h4>Histórico de notificações</h4>
          <ul class="detail-list-items">${notificationsHtml}</ul>
        </section>

        ${item.error ? `<section><h4>Mensagem de erro</h4><p class="muted">${item.error}</p></section>` : ""}
      </div>
    `);
  }

  document.addEventListener("click", event => {
    const tabButton = event.target.closest("[data-client-tab]");
    if (tabButton) {
      state.activeTab = tabButton.dataset.clientTab;
      renderCurrentTab();
      return;
    }

    if (event.target.closest("#changePlanButton")) {
      changePlan();
      return;
    }

    if (event.target.closest("#cancelSubscriptionButton")) {
      const confirmed = window.confirm("A assinatura será cancelada e o acesso será encerrado no fim do período contratado. Deseja continuar?");
      if (!confirmed) return;
      DEMO_ACCOUNT.status = "canceled";
      renderSubscriptionPanel();
      showToast("Solicitação de cancelamento registrada.", "ok");
      return;
    }

    if (event.target.closest("#updatePaymentButton")) {
      showToast("Atualização do método de pagamento iniciada.", "ok");
      return;
    }

    if (event.target.closest("#resolvePaymentButton")) {
      showToast("Pagamento pendente foi encaminhado para revisão.", "ok");
      return;
    }

    if (event.target.closest("[data-plan-option]")) {
      const planId = event.target.closest("[data-plan-option]").dataset.planOption;
      const plan = getPlanById(planId);
      const confirmed = window.confirm(`Você está trocando para o plano ${plan.name}. A cobrança será ajustada durante o próximo ciclo. Deseja confirmar?`);
      if (!confirmed) return;
      DEMO_ACCOUNT.currentPlan = planId;
      closeModal();
      renderCurrentTab();
      showToast(`Plano ${plan.name} selecionado com sucesso.`, "ok");
      return;
    }

    if (event.target.closest("[data-monitor-action]")) {
      const actionElement = event.target.closest("[data-monitor-action]");
      const action = actionElement.dataset.monitorAction;
      const monitorId = actionElement.dataset.monitorId;
      if (action === "toggle") toggleMonitorStatus(monitorId);
      if (action === "end") closeMonitoring(monitorId);
      if (action === "details") showMonitoringDetails(monitorId);
      return;
    }

    if (event.target.closest("#closeModalBtn")) {
      closeModal();
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    renderCurrentTab();
  });
}());
