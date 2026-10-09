(function () {
  "use strict";

  const client = globalThis.vigiAISupabase && globalThis.vigiAISupabase.client;
  const root = document.querySelector("#homeRoot");
  const MATCHES_LIMIT = 100;

  let ctx = null; // { since, assinatura }
  let requestId = 0;

  // ---------- dados ----------

  // Só o que o portal ainda não trouxe: a leitura mais recente, os resultados e as inscrições.
  async function load() {
    const current = ++requestId;
    root.replaceChildren(h("p", { class: "portal-empty", text: "Carregando…" }));
    try {
      const [runs, matches, inscricoes] = await Promise.all([
        client.from("agent_daily_runs")
          .select("id, run_at, finished_at, errors")
          .gte("run_at", ctx.since)
          .order("run_at", { ascending: false })
          .limit(1),
        client.from("agent_match_results")
          .select("id, monitoring_id, found, confidence, confidence_level, publication_type, publication_title, publication_url, publication_deadline, excerpt, checked_at")
          .gte("checked_at", ctx.since)
          .order("checked_at", { ascending: false })
          .limit(MATCHES_LIMIT),
        client.from("inscricoes")
          .select("id, numero_inscricao, criado_em, ativo")
          .eq("ativo", true)
          .order("criado_em", { ascending: true })
      ]);
      [runs, matches, inscricoes].forEach(result => { if (result.error) throw result.error; });
      if (current !== requestId) return; // chegou uma carga mais nova

      // hasMore: resultados anteriores à leitura carregada não viram entrada própria.
      const timeline = buildTimeline({
        runs: runs.data || [],
        matches: matches.data || [],
        inscricoes: inscricoes.data || [],
        hasMore: true
      });
      render(buildHomeSummary({
        assinatura: ctx.assinatura,
        inscricoes: inscricoes.data || [],
        timeline,
        now: new Date()
      }));
    } catch {
      if (current !== requestId) return;
      root.replaceChildren(
        h("p", { class: "portal-empty", text: "Não foi possível carregar o resumo." }),
        h("button", { type: "button", class: "btn", text: "Tentar de novo", onclick: load }));
    }
  }

  // ---------- desenho ----------

  function statusBlock(status) {
    return h("section", { class: `home-status home-status--${status.kind}`, "aria-live": "polite" },
      h("p", { class: "home-status__text", text: status.text }),
      status.detail ? h("p", { class: "home-status__detail", text: status.detail }) : null,
      status.link ? h("a", { class: "home-status__link", href: status.link.hash, text: status.link.label }) : null,
      status.note ? h("p", { class: "home-status__note", text: status.note }) : null);
  }

  function noticeBlock(notice) {
    if (!notice) return null;
    return h("p", { class: `home-notice home-notice--${notice.kind}`, role: "status" },
      notice.text, " ",
      h("a", { href: "#assinatura", text: "Ver assinatura" }));
  }

  function inscricoesRow(watched) {
    const numbers = watched.shown.length
      ? h("ul", { class: "home-numbers" },
        watched.shown.map(numero => h("li", { class: "mono", text: numero })),
        watched.extra > 0 ? h("li", { class: "home-more", text: `+${watched.extra}`, "aria-label": `mais ${watched.extra}` }) : null)
      : h("span", { class: "muted", text: "Nenhuma" });
    return h("div", { class: "home-fact" },
      h("dt", { text: "Inscrições vigiadas" }),
      h("dd", {}, numbers, h("a", { class: "home-fact__link", href: "#assinatura", text: "Gerenciar" })));
  }

  function billingRow(billing) {
    const lines = [
      billing.price ? `${billing.price}/mês` : null,
      billing.card,
      billing.nextCharge ? `próxima cobrança em ${billing.nextCharge}` : null
    ].filter(Boolean);
    return h("div", { class: "home-fact" },
      h("dt", { text: "Assinatura" }),
      h("dd", { text: lines.length ? lines.join(" · ") : "Ativa" }));
  }

  function render(summary) {
    // replaceChildren escreve "null" na tela se receber null: tira os blocos ausentes.
    root.replaceChildren(...[
      statusBlock(summary.status),
      noticeBlock(summary.billing.notice),
      h("dl", { class: "home-facts" },
        inscricoesRow(summary.inscricoes),
        h("div", { class: "home-fact" },
          h("dt", { text: "Próxima leitura" }),
          h("dd", { text: summary.nextReading })),
        billingRow(summary.billing))
    ].filter(Boolean));
  }

  // ---------- entrada ----------

  window.addEventListener("portal:access", event => {
    const { guard, assinatura } = event.detail;
    if (guard.locked || !assinatura || !assinatura.iniciada_em) {
      ctx = null;
      return;
    }
    ctx = { since: assinatura.iniciada_em, assinatura };
    // As outras abas não precisam desta carga: ela roda quando o usuário abre a Início.
    if (client && window.location.hash === "#inicio") load();
  });

  // Ao voltar para a aba, recarrega: pode ter havido uma leitura nova.
  window.addEventListener("hashchange", () => {
    if (client && ctx && window.location.hash === "#inicio") load();
  });
}());
