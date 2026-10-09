(function () {
  "use strict";

  const authClient = globalThis.vigiAISupabase && globalThis.vigiAISupabase.client;
  const root = document.querySelector("#homeRoot");
  const { buildHomeSummary } = window.vigiAIHomeLogic || {};
  let requestId = 0;

  async function loadInicio(session, perfil, assinatura) {
    if (!root || !authClient || !session || !buildHomeSummary) return;

    const current = ++requestId;
    root.replaceChildren(h("p", { class: "portal-empty", text: "Carregando resumo…" }));

    try {
      const userId = session.user.id;
      const [inscricoesResult, runsResult] = await Promise.all([
        authClient.from("inscricoes")
          .select("id")
          .eq("usuario_id", userId),
        fetchLatestRun()
      ]);
      if (inscricoesResult.error) throw inscricoesResult.error;
      if (runsResult.error) throw runsResult.error;
      if (current !== requestId) return;

      const summary = buildHomeSummary({ session, perfil, assinatura, lastRun: runsResult.data });
      root.replaceChildren(renderSummary(summary, (inscricoesResult.data || []).length));
    } catch {
      if (current !== requestId) return;
      root.replaceChildren(
        h("p", { class: "portal-empty", text: "Não foi possível carregar o resumo da sua conta." }),
        h("button", { class: "btn", type: "button", text: "Tentar de novo", onclick: () => loadInicio(session, perfil, assinatura) }));
    }
  }

  async function fetchLatestRun() {
    const query = authClient.from("agent_daily_runs")
      .select("id, run_at, finished_at, cities_synced, monitorings_checked, matches_found, errors")
      .not("finished_at", "is", null)
      .eq("errors", 0)
      .order("run_at", { ascending: false })
      .limit(1);
    return query.maybeSingle();
  }

  function noticeCard(label, value, detail, href, action, extraClass = "") {
    return h("article", { class: `home-notice ${extraClass}` },
      h("p", { class: "home-notice__label", text: label }),
      h("p", { class: "home-notice__value", text: value }),
      h("p", { class: "home-notice__detail", text: detail }),
      h("a", { class: "home-notice__link", href, text: action }));
  }

  function renderSummary(summary, inscricoesCount) {
    const userData = h("article", { class: "home-notice home-notice--user" },
      h("p", { class: "home-notice__label", text: "Seus dados" }),
      h("dl", { class: "home-user-data" },
        h("div", {}, h("dt", { text: "Nome" }), h("dd", { text: summary.name })),
        h("div", {}, h("dt", { text: "E-mail" }), h("dd", { class: "home-user-data__email", text: summary.email }))),
      h("a", { class: "home-notice__link", href: "#perfil", text: "Ver meu perfil" }));

    return h("div", { class: "home-view" },
      h("header", { class: "home-welcome" },
        h("p", { class: "home-eyebrow", text: "Resumo da sua conta" }),
        h("h2", { text: summary.greeting }),
        h("p", { text: "Aqui estão as atualizações mais importantes do seu monitoramento." })),
      h("div", { class: "home-grid", "aria-label": "Notificações principais" },
        noticeCard(
          "Última execução",
          summary.lastRunAt || "Nenhuma execução registrada",
          summary.lastRunStatus,
          "#execucoes",
          "Ver execuções"
        ),
        noticeCard(
          "Vencimento da mensalidade",
          summary.dueDate,
          summary.billingLabel,
          "#assinatura",
          "Gerenciar assinatura"
        ),
        noticeCard(
          "Inscrições acompanhadas",
          String(inscricoesCount),
          inscricoesCount === 1 ? "inscrição cadastrada" : "inscrições cadastradas",
          "#assinatura",
          "Ver inscrições"
        ),
        userData));
  }

  window.addEventListener("portal:access", ({ detail }) => {
    if (detail && detail.session && !detail.guard.locked) {
      loadInicio(detail.session, detail.perfil, detail.assinatura);
    }
  });
}());
