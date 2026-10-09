(function () {
  "use strict";

  const authClient = globalThis.vigiAISupabase && globalThis.vigiAISupabase.client;
  const container = document.querySelector("#tab-inicio");

  // Importar funções de executions-logic
  const { formatRunDate, formatDay, nextReadingAt } = window.vigiAIExecutionsLogic || {};

  async function loadInicio(session, perfil, assinatura) {
    if (!container || !authClient || !session) return;

    const userId = session.user.id;
    const now = new Date();

    // Carregar inscrições
    const { data: inscricoes = [], error: insError } = await authClient
      .from("inscricoes")
      .select("id, numero_inscricao, criado_em")
      .eq("usuario_id", userId)
      .order("criado_em", { ascending: false });

    if (insError) console.error("Erro ao carregar inscrições:", insError);

    // Carregar últimas execuções (últimas 3)
    const { data: runs = [], error: runError } = await authClient
      .from("agent_daily_runs")
      .select("id, run_at, finished_at, errors")
      .eq("usuario_id", userId)
      .order("run_at", { ascending: false })
      .limit(3);

    if (runError) console.error("Erro ao carregar execuções:", runError);

    // Carregar resultados de correspondência
    const runIds = runs.map(r => r.id);
    const { data: matches = [], error: matchError } = runIds.length
      ? await authClient
          .from("agent_match_results")
          .select("id, run_id, found, confidence_level, publication_type, publication_title, publication_deadline")
          .in("run_id", runIds)
          .eq("found", true)  // Apenas aprovações/nomeações encontradas
      : { data: [], error: null };

    if (matchError) console.error("Erro ao carregar resultados:", matchError);

    // Montar conteúdo
    const nextReading = formatRunDate ? formatRunDate(nextReadingAt()) : "próximamente";
    const nInscrictions = inscricoes.length;
    const lastRun = runs[0];
    const lastRunText = lastRun ? formatRunDate(lastRun.run_at) : "nunca";
    const foundCount = matches.filter(m => m.found).length;

    const content = h("div", { class: "dashboard" }, [
      // Card: Próxima cobrança
      h("div", { class: "dashboard-card" }, [
        h("h3", {}, "Assinatura"),
        h("div", { class: "dashboard-alert" }, [
          h("strong", {}, "Próxima cobrança"),
          h("p", { style: "margin: 6px 0 0 0; font-size: 1.1rem; color: var(--ink);" },
            assinatura && assinatura.expira_em
              ? `R$ 4,99 em ${formatDay(assinatura.expira_em) || "breve"}`
              : "Sem assinatura ativa"
          )
        ])
      ]),

      // Grid com stats
      h("div", { class: "dashboard-grid" }, [
        // Card: Inscrições monitoradas
        h("div", { class: "dashboard-card" }, [
          h("h3", {}, "Inscrições"),
          h("div", { class: "dashboard-stat" }, String(nInscrictions)),
          h("div", { class: "dashboard-stat-label" },
            nInscrictions === 1 ? "inscrição monitorada" : "inscrições monitoradas"
          )
        ]),

        // Card: Últimas leitura
        h("div", { class: "dashboard-card" }, [
          h("h3", {}, "Última leitura"),
          h("div", { class: "dashboard-stat" }, lastRun ? lastRunText.split(" às ")[0] : "—"),
          h("div", { class: "dashboard-stat-label" }, lastRun ? `às ${lastRunText.split(" às ")[1]}` : "Sem leituras ainda")
        ]),

        // Card: Aprovações encontradas
        h("div", { class: "dashboard-card" }, [
          h("h3", {}, "Status"),
          h("div", { class: "dashboard-stat", style: foundCount > 0 ? "color: var(--ok);" : "" }, String(foundCount)),
          h("div", { class: "dashboard-stat-label" },
            foundCount === 0
              ? "Nenhuma aprovação encontrada ainda"
              : foundCount === 1
              ? "aprovação encontrada!"
              : "aprovações encontradas!"
          )
        ])
      ]),

      // Card: Próxima leitura
      h("div", { class: "dashboard-card" }, [
        h("h3", {}, "Próxima leitura"),
        h("p", { style: "margin: 0; font-size: 1.05rem; color: var(--ink); font-weight: 600;" }, nextReading),
        h("p", { style: "margin: 6px 0 0 0; font-size: 0.9rem; color: var(--muted);" },
          "O agente verifica o Diário Oficial de Santos todos os dias às 00h05 (horário de São Paulo)."
        )
      ])
    ]);

    container.innerHTML = "";
    container.appendChild(content);
  }

  // Escutar portal:access para carregar dados
  window.addEventListener("portal:access", ({ detail }) => {
    if (detail && detail.assinatura && !detail.guard.locked) {
      loadInicio(detail.session, detail.perfil, detail.assinatura).catch(console.error);
    }
  });

  // Helper para criar elementos (reutiliza dom-helpers se disponível)
  function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    Object.entries(props).forEach(([key, value]) => {
      if (value === undefined || value === null || value === false) return;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "style") node.setAttribute("style", value);
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
}());
