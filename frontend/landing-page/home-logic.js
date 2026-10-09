(function () {
  "use strict";

  const globalScope = typeof window !== "undefined" ? window : globalThis;
  // No navegador, executions-logic.js já pendurou suas funções na window.
  const exe = typeof module !== "undefined" && module.exports ? require("./executions-logic.js") : globalScope;
  const { dayKey, formatDay, formatRunTime, nextReadingAt } = exe;

  const MAX_SHOWN = 3;
  const BILLING_WARNING_DAYS = 5;
  const DAY_MS = 24 * 60 * 60 * 1000;

  // Dias de calendário (São Paulo) de `fromIso` até `toIso`. Negativo se já passou.
  function daysBetween(fromIso, toIso) {
    const [fy, fm, fd] = dayKey(fromIso).split("-").map(Number);
    const [ty, tm, td] = dayKey(toIso).split("-").map(Number);
    return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS);
  }

  // "hoje às 00h07", "ontem às 00h05", "amanhã às 00h05" ou "06/10 às 00h05".
  function describeMoment(iso, now = new Date()) {
    const diff = daysBetween(now.toISOString(), iso);
    let day;
    if (diff === 0) day = "hoje";
    else if (diff === -1) day = "ontem";
    else if (diff === 1) day = "amanhã";
    else day = formatDay(iso).slice(0, 5);
    return `${day} às ${formatRunTime(iso)}`;
  }

  function inscricoesPhrase(total) {
    return total === 1 ? "1 inscrição" : `${total} inscrições`;
  }

  // Só as ativas, da mais antiga para a mais nova; mostra as primeiras `max` e o resto vira "+N".
  function watchedInscricoes(items, max = MAX_SHOWN) {
    const active = (items || [])
      .filter(item => item.ativo !== false)
      .sort((a, b) => new Date(a.criado_em || 0) - new Date(b.criado_em || 0));
    return {
      total: active.length,
      shown: active.slice(0, max).map(item => item.numero_inscricao),
      extra: Math.max(0, active.length - max)
    };
  }

  function foundDetail(cards) {
    if (cards.length !== 1) return "Veja o que fazer e o prazo de cada uma.";
    const [card] = cards;
    const parts = [card.typeLabel];
    if (card.inscricao) parts.push(`inscrição ${card.inscricao}`);
    if (card.deadline) parts.push(`prazo ${card.deadline}`);
    return parts.join(" · ");
  }

  // A frase de status do topo. `entry` é a leitura mais recente de buildTimeline (ou null).
  function buildStatus({ total, entry, now = new Date() }) {
    if (total === 0) {
      return {
        kind: "empty",
        text: "Você ainda não tem inscrições vigiadas.",
        detail: "Cadastre o número da sua inscrição para o vigiAI começar a procurar.",
        link: { hash: "#assinatura", label: "Cadastrar inscrição" },
        note: null
      };
    }

    const watching = `Vigiando ${inscricoesPhrase(total)}.`;
    if (!entry) {
      const next = describeMoment(nextReadingAt(now).toISOString(), now);
      return { kind: "waiting", text: `${watching} A primeira leitura acontece ${next}.`, detail: null, link: null, note: null };
    }

    const last = `Última leitura ${describeMoment(entry.at, now)}`;
    const note = entry.hadErrors
      ? "Parte do Diário não pôde ser lida nessa leitura. Vamos tentar de novo na próxima."
      : null;

    if (entry.found.length > 0) {
      const lead = entry.found.length === 1
        ? "Você foi encontrado em uma publicação."
        : `Você foi encontrado em ${entry.found.length} publicações.`;
      return {
        kind: "found",
        text: `${lead} ${last}.`,
        detail: foundDetail(entry.found),
        link: { hash: "#execucoes", label: "Ver em Execuções" },
        note
      };
    }
    if (entry.possible.length > 0) {
      return {
        kind: "possible",
        text: `Há uma possível correspondência para você conferir. ${last}.`,
        detail: null,
        link: { hash: "#execucoes", label: "Conferir em Execuções" },
        note
      };
    }
    return { kind: "clear", text: `${watching} ${last}: nada novo.`, detail: null, link: null, note };
  }

  function formatPrice(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }).replace(/ /g, " ");
  }

  // O join com planos volta como objeto; aceita lista por garantia.
  function planOf(assinatura) {
    const plan = assinatura && assinatura.planos;
    return Array.isArray(plan) ? plan[0] || null : plan || null;
  }

  // Aviso só quando faltam 5 dias ou menos para a cobrança, ou se já venceu.
  function buildBillingNotice({ expiraEm, price, now }) {
    if (!expiraEm) return null;
    const when = formatDay(expiraEm).slice(0, 5);
    if (new Date(expiraEm).getTime() <= now.getTime()) {
      return { kind: "overdue", text: `Sua assinatura venceu em ${when}. Atualize o pagamento para continuar vigiando.` };
    }
    const days = daysBetween(now.toISOString(), expiraEm);
    if (days > BILLING_WARNING_DAYS) return null;
    const charge = price ? `A próxima cobrança, de ${price}, ` : "A próxima cobrança ";
    let text;
    if (days <= 0) text = `${charge}é hoje.`;
    else if (days === 1) text = `${charge}é amanhã (${when}).`;
    else text = `${charge}é em ${days} dias (${when}).`;
    return { kind: "soon", text };
  }

  function buildBilling(assinatura, now = new Date()) {
    const plan = planOf(assinatura);
    const price = formatPrice(plan && plan.preco);
    const final = assinatura && assinatura.pagamento_final;
    const expiraEm = assinatura && assinatura.expira_em;
    return {
      price,
      card: final ? `${assinatura.pagamento_bandeira || "Cartão"} final ${final}` : null,
      nextCharge: expiraEm ? formatDay(expiraEm).slice(0, 5) : null,
      notice: buildBillingNotice({ expiraEm, price, now })
    };
  }

  // Tudo o que a tela Início desenha. `timeline` vem de buildTimeline (mais recente primeiro).
  function buildHomeSummary({ assinatura, inscricoes = [], timeline = [], now = new Date() } = {}) {
    const watched = watchedInscricoes(inscricoes);
    const entry = timeline[0] || null;
    return {
      status: buildStatus({ total: watched.total, entry, now }),
      inscricoes: watched,
      nextReading: describeMoment(nextReadingAt(now).toISOString(), now),
      billing: buildBilling(assinatura, now)
    };
  }

  const api = {
    daysBetween,
    describeMoment,
    inscricoesPhrase,
    watchedInscricoes,
    buildStatus,
    formatPrice,
    buildBilling,
    buildHomeSummary
  };

  Object.assign(globalScope, api);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}());
