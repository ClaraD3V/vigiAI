(function () {
  "use strict";

  const client = globalThis.vigiAISupabase && globalThis.vigiAISupabase.client;
  const root = document.querySelector("#exeRoot");
  const PAGE = 30;
  const MATCHES_LIMIT = 500;

  let ctx = null; // { userId, since, guard }
  let state = { runs: [], matches: [], inscricoes: [], hasMore: false };
  let requestId = 0;

  // ---------- dados ----------

  async function fetchRuns(offset) {
    // Pede uma linha a mais para saber se existe página seguinte.
    const { data, error } = await client.from("agent_daily_runs")
      .select("id, run_at, finished_at, cities_synced, monitorings_checked, matches_found, errors, created_at")
      .not("finished_at", "is", null)
      .eq("errors", 0)
      .order("run_at", { ascending: false })
      .range(offset, offset + PAGE);
    if (error) throw error;
    return { rows: (data || []).slice(0, PAGE), hasMore: (data || []).length > PAGE };
  }

  async function load() {
    const current = ++requestId;
    root.replaceChildren(h("p", { class: "portal-empty", text: "Carregando…" }));
    try {
      const [runs, matches, inscricoes] = await Promise.all([
        fetchRuns(0),
        client.from("agent_match_results")
          .select("id, monitoring_id, found, confidence, confidence_level, publication_type, publication_title, publication_url, publication_deadline, excerpt, checked_at")
          .gte("checked_at", ctx.since)
          .order("checked_at", { ascending: false })
          .limit(MATCHES_LIMIT),
        client.from("inscricoes").select("id, numero_inscricao, criado_em")
      ]);
      if (matches.error) throw matches.error;
      if (inscricoes.error) throw inscricoes.error;
      if (current !== requestId) return; // chegou uma carga mais nova

      state = { runs: runs.rows, hasMore: runs.hasMore, matches: matches.data || [], inscricoes: inscricoes.data || [] };
      render();
    } catch {
      if (current !== requestId) return;
      root.replaceChildren(
        h("p", { class: "portal-empty", text: "Não foi possível carregar as execuções." }),
        h("button", { type: "button", class: "btn", text: "Tentar de novo", onclick: load }));
    }
  }

  async function loadMore(button) {
    button.disabled = true;
    try {
      const page = await fetchRuns(state.runs.length);
      state = { ...state, runs: [...state.runs, ...page.rows], hasMore: page.hasMore };
      render();
    } catch {
      button.disabled = false;
      button.textContent = "Não foi possível carregar. Tentar de novo";
    }
  }

  // ---------- desenho ----------

  function foundCard(card) {
    return h("article", { class: "exe-found" },
      h("div", { class: "exe-found__head" },
        h("span", { class: "exe-chip", text: card.typeLabel }),
        card.inscricao ? h("span", { class: "exe-meta" }, "Inscrição ", h("span", { class: "mono", text: card.inscricao })) : null),
      card.title ? h("h3", { text: card.title }) : null,
      card.excerpt ? h("blockquote", { text: card.excerpt }) : null,
      card.deadline ? h("p", { class: "exe-deadline" }, h("strong", { text: "Prazo: " }), card.deadline) : null,
      card.url
        ? h("a", { class: "btn btn--small", href: card.url, target: "_blank", rel: "noopener noreferrer", text: "Abrir publicação" })
        : null);
  }

  function possibleCard(card) {
    return h("div", { class: "exe-possible" },
      h("p", { class: "exe-possible__label" },
        "Possível correspondência, confira",
        card.inscricao ? ` · inscrição ${card.inscricao}` : ""),
      card.excerpt ? h("blockquote", { text: card.excerpt }) : null,
      card.url
        ? h("a", { href: card.url, target: "_blank", rel: "noopener noreferrer", text: "Abrir publicação" })
        : null);
  }

  function runLog(log) {
    const fields = [
      ["Início", log.startedAt],
      ["Término", log.finishedAt || "Em andamento"],
      ["Cidades sincronizadas", String(log.citiesSynced)],
      ["Monitoramentos verificados", String(log.monitoringsChecked)],
      ["Correspondências", String(log.matchesFound)],
      ["Erros", String(log.errors)]
    ];
    if (log.createdAt) fields.push(["Registro criado", log.createdAt]);

    return h("section", { class: "exe-log", "aria-label": `Log da execução ${log.id}` },
      h("div", { class: "exe-log__head" },
        h("h3", { text: `Execução #${log.id}` }),
        h("span", { class: `exe-log__status exe-log__status--${log.statusCode}`, text: log.statusLabel })),
      h("dl", { class: "exe-log__details" },
        fields.map(([label, value]) => h("div", { class: "exe-log__field" },
          h("dt", { text: label }), h("dd", { text: value })) )));
  }

  function entryNode(entry) {
    return h("li", { class: `exe-item${entry.found.length ? " has-found" : ""}` },
      h("div", { class: "exe-when", text: entry.dateLabel }),
      h("div", { class: "exe-body" },
        h("p", { class: "exe-summary", text: entry.summary }),
        entry.hadErrors
          ? h("p", { class: "exe-warn", text: "Parte do Diário não pôde ser lida nesta noite. Vamos tentar de novo na próxima leitura." })
          : null,
        entry.log ? runLog(entry.log) : null,
        entry.found.map(foundCard),
        entry.possible.map(possibleCard)));
  }

  function emptyState() {
    return h("div", { class: "exe-empty" },
      h("h2", { text: "Sua vigilância já começou" }),
      h("p", { text: "Toda noite, às 00h05, o vigiAI lê o Diário Oficial de Santos inteiro e procura o seu nome junto com cada número de inscrição que você cadastrou." }),
      h("p", { text: "O primeiro registro aparece aqui depois da próxima leitura. A partir daí, cada noite ganha uma linha, e se você for encontrado, o aviso chega também pelo canal que escolheu." }),
      h("dl", { class: "sub-summary" },
        h("dt", { text: "Próxima leitura" }), h("dd", { text: formatRunDate(nextReadingAt().toISOString()) }),
        h("dt", { text: "Inscrições vigiadas" }), h("dd", { text: String(state.inscricoes.length) })));
  }

  function render() {
    const timeline = buildTimeline(state);
    const toolbar = h("div", { class: "exe-toolbar" },
      h("p", { class: "muted", text: `Próxima leitura: ${formatRunDate(nextReadingAt().toISOString())}` }),
      h("button", { type: "button", class: "btn ghost btn--small", text: "Atualizar", onclick: load }));

    if (timeline.length === 0) {
      root.replaceChildren(toolbar, emptyState());
      return;
    }

    const more = state.hasMore
      ? h("button", { type: "button", class: "btn ghost", text: "Ver leituras anteriores", onclick: event => loadMore(event.currentTarget) })
      : null;
    root.replaceChildren(...[toolbar, h("ol", { class: "exe-list" }, timeline.map(entryNode)), more].filter(Boolean));
  }

  // ---------- entrada ----------

  window.addEventListener("portal:access", event => {
    if (!client) return;
    const { guard, session, assinatura } = event.detail;
    if (guard.locked || !assinatura || !assinatura.iniciada_em) {
      ctx = null;
      return;
    }
    ctx = { userId: session.user.id, since: assinatura.iniciada_em, guard };
    load();
  });

  // Ao voltar para a aba, recarrega: pode ter havido uma leitura nova.
  window.addEventListener("hashchange", () => {
    if (ctx && window.location.hash === "#execucoes") load();
  });
}());
