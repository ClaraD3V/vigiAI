(function () {
  "use strict";

  const TIMEZONE = "America/Sao_Paulo";
  // O agente roda às 00h05 de São Paulo (UTC-3, sem horário de verão desde 2019).
  const READING_UTC_HOUR = 3;
  const READING_UTC_MINUTE = 5;

  const TYPE_LABELS = {
    convocacao: "Convocação",
    nomeacao: "Nomeação",
    homologacao: "Homologação",
    resultado: "Resultado"
  };

  function parts(iso, options) {
    const formatter = new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, hourCycle: "h23", ...options });
    return Object.fromEntries(formatter.formatToParts(new Date(iso)).map(item => [item.type, item.value]));
  }

  // "2026-10-09T03:05:00Z" -> "09/10 às 00h05"
  function formatRunDate(iso) {
    const p = parts(iso, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    return `${p.day}/${p.month} às ${p.hour}h${p.minute}`;
  }

  // "2026-10-09T03:05:00Z" -> "09/10/2026"
  function formatDay(iso) {
    const p = parts(iso, { day: "2-digit", month: "2-digit", year: "numeric" });
    return `${p.day}/${p.month}/${p.year}`;
  }

  // Chave do dia civil em São Paulo, para comparar datas.
  function dayKey(iso) {
    const p = parts(iso, { day: "2-digit", month: "2-digit", year: "numeric" });
    return `${p.year}-${p.month}-${p.day}`;
  }

  // Próxima leitura (00h05 de São Paulo) estritamente depois de `now`.
  function nextReadingAt(now = new Date()) {
    const candidate = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), READING_UTC_HOUR, READING_UTC_MINUTE
    ));
    if (candidate.getTime() <= now.getTime()) candidate.setUTCDate(candidate.getUTCDate() + 1);
    return candidate;
  }

  function publicationTypeLabel(type) {
    return TYPE_LABELS[String(type ?? "").toLowerCase()] || "Publicação";
  }

  // Aceita DD/MM/AAAA ou ISO (AAAA-MM-DD...). Outro formato volta como veio.
  function formatDeadline(text) {
    const value = String(text ?? "").trim();
    if (!value) return "";
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return value;
  }

  // Só http(s): qualquer outro esquema (ex.: javascript:) não vira link.
  function safeUrl(url) {
    try {
      const parsed = new URL(String(url ?? ""));
      return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
    } catch {
      return null;
    }
  }

  // found -> achado; found = false com confiança média -> possível correspondência.
  function classifyMatch(match) {
    if (!match) return null;
    if (match.found) return "found";
    if (String(match.confidence_level ?? "").toLowerCase() === "media") return "possible";
    return null;
  }

  // Quantas das inscrições atuais já existiam quando a leitura começou.
  function countCheckedInscricoes(inscricoes, runAt) {
    const start = new Date(runAt).getTime();
    return (inscricoes || []).filter(item => new Date(item.criado_em).getTime() <= start).length;
  }

  function summarizeRun({ checked = 0, foundCount = 0, possibleCount = 0 } = {}) {
    if (foundCount > 0) {
      return foundCount === 1
        ? "Diário lido. Você foi encontrado em uma publicação."
        : `Diário lido. Você foi encontrado em ${foundCount} publicações.`;
    }
    if (possibleCount > 0) return "Diário lido. Há uma possível correspondência para você conferir.";
    if (checked === 0) return "Diário lido.";
    if (checked === 1) return "Diário lido. Sua inscrição foi verificada. Não foi dessa vez.";
    return `Diário lido. Suas ${checked} inscrições foram verificadas. Não foi dessa vez.`;
  }

  function buildCard(match, kind, numeroById) {
    return {
      id: match.id,
      kind,
      confidenceLevel: match.confidence_level || "",
      typeLabel: publicationTypeLabel(match.publication_type),
      title: match.publication_title || "",
      inscricao: numeroById.get(match.monitoring_id) || "",
      excerpt: String(match.excerpt ?? "").trim(),
      deadline: formatDeadline(match.publication_deadline),
      url: safeUrl(match.publication_url)
    };
  }

  // Associa cada resultado à leitura em que foi gravado: primeiro pela janela
  // [run_at, finished_at]; se não couber, pela leitura do mesmo dia (a mais
  // recente que já tinha começado).
  function findRun(runs, checkedAt) {
    const at = new Date(checkedAt).getTime();
    const inWindow = runs.find(run => {
      if (!run.finished_at) return false;
      return new Date(run.run_at).getTime() <= at && at <= new Date(run.finished_at).getTime();
    });
    if (inWindow) return inWindow;
    const sameDay = runs
      .filter(run => dayKey(run.run_at) === dayKey(checkedAt) && new Date(run.run_at).getTime() <= at)
      .sort((a, b) => new Date(b.run_at) - new Date(a.run_at));
    return sameDay[0] || null;
  }

  // Monta a linha do tempo, da mais recente para a mais antiga. Um achado nunca
  // some: se a leitura dele não foi registrada, ele ganha uma entrada própria.
  function buildTimeline({ runs = [], matches = [], inscricoes = [], hasMore = false } = {}) {
    const numeroById = new Map(inscricoes.map(item => [item.id, item.numero_inscricao]));
    const sortedRuns = [...runs].sort((a, b) => new Date(b.run_at) - new Date(a.run_at));
    const oldestRunAt = sortedRuns.length ? new Date(sortedRuns[sortedRuns.length - 1].run_at).getTime() : null;

    const entries = new Map(sortedRuns.map(run => [run.id, {
      key: `run-${run.id}`,
      kind: "run",
      at: run.run_at,
      dateLabel: formatRunDate(run.run_at),
      checked: countCheckedInscricoes(inscricoes, run.run_at),
      hadErrors: Number(run.errors) > 0,
      found: [],
      possible: []
    }]));
    const orphans = new Map();

    matches.forEach(match => {
      const kind = classifyMatch(match);
      if (!kind) return;
      const card = buildCard(match, kind, numeroById);
      const run = findRun(sortedRuns, match.checked_at);

      if (run) {
        entries.get(run.id)[kind === "found" ? "found" : "possible"].push(card);
        return;
      }
      // Mais antigo que a página carregada: pertence a uma página que ainda não foi pedida.
      if (hasMore && oldestRunAt !== null && new Date(match.checked_at).getTime() < oldestRunAt) return;

      const key = dayKey(match.checked_at);
      if (!orphans.has(key)) {
        orphans.set(key, {
          key: `day-${key}`,
          kind: "orphan",
          at: match.checked_at,
          dateLabel: formatRunDate(match.checked_at),
          checked: 0,
          hadErrors: false,
          found: [],
          possible: []
        });
      }
      const entry = orphans.get(key);
      entry[kind === "found" ? "found" : "possible"].push(card);
      if (new Date(match.checked_at) > new Date(entry.at)) {
        entry.at = match.checked_at;
        entry.dateLabel = formatRunDate(match.checked_at);
      }
    });

    return [...entries.values(), ...orphans.values()]
      .map(entry => ({
        ...entry,
        summary: summarizeRun({
          checked: entry.checked,
          foundCount: entry.found.length,
          possibleCount: entry.possible.length
        })
      }))
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }

  const api = {
    formatRunDate,
    formatDay,
    dayKey,
    nextReadingAt,
    publicationTypeLabel,
    formatDeadline,
    safeUrl,
    classifyMatch,
    countCheckedInscricoes,
    summarizeRun,
    buildTimeline
  };

  const globalScope = typeof window !== "undefined" ? window : globalThis;
  Object.assign(globalScope, api);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}());
