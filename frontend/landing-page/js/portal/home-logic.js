(function () {
  "use strict";

  const TIMEZONE = "America/Sao_Paulo";

  function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).format(date).replace(",", " às");
  }

  function formatDate(value) {
    if (!value) return "Data não informada";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Data não informada";
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(date);
  }

  function buildHomeSummary({ session, perfil, assinatura, lastRun } = {}) {
    const name = String(perfil?.nome_completo ?? "").trim() || "—";
    const successfulRun = lastRun && lastRun.finished_at && Number(lastRun.errors) === 0;

    return {
      greeting: name === "—" ? "Bem-vindo!" : `Bem-vindo, ${name}!`,
      name,
      email: session?.user?.email || "—",
      lastRunAt: successfulRun ? formatDateTime(lastRun.run_at) : "",
      lastRunStatus: successfulRun ? "Execução finalizada com sucesso" : "Nenhuma execução finalizada com sucesso.",
      dueDate: formatDate(assinatura?.expira_em),
      billingLabel: assinatura?.expira_em ? "Próxima renovação prevista" : "Sem vencimento cadastrado"
    };
  }

  const api = { formatDateTime, formatDate, buildHomeSummary };
  const globalScope = typeof window !== "undefined" ? window : globalThis;
  globalScope.vigiAIHomeLogic = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}());