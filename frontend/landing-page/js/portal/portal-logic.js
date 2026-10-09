(function () {
  "use strict";

  const TABS = [
    { key: "inicio", label: "Início" },
    { key: "execucoes", label: "Execuções" },
    { key: "assinatura", label: "Assinatura" },
    { key: "perfil", label: "Meu perfil" }
  ];

  const DEFAULT_TAB = "inicio";
  const LOCKED_TAB = "assinatura";

  // "#execucoes" -> "execucoes". Hash vazio ou desconhecido cai em "inicio".
  function parseHash(hash) {
    const key = String(hash ?? "").replace(/^#/, "").trim().toLowerCase();
    return TABS.some(tab => tab.key === key) ? key : DEFAULT_TAB;
  }

  // Mesmo critério da view agente_inscricoes (status 'teste' ou 'ativa'), mais a
  // data: o status no banco pode continuar 'ativa' depois de expira_em.
  function hasActiveSubscription(assinatura, now = new Date()) {
    if (!assinatura || !["ativa", "teste"].includes(assinatura.status)) return false;
    if (!assinatura.expira_em) return true;
    return new Date(assinatura.expira_em).getTime() > now.getTime();
  }

  // Guardas na ordem: sessão -> consentimento -> assinatura.
  function resolveGuard({ session, perfil, assinatura, now } = {}) {
    if (!session) return { redirect: "account.html" };
    if (!perfil || !perfil.consentimento_aceito_em) return { redirect: "consentimento.html" };
    if (!hasActiveSubscription(assinatura, now)) return { locked: true, allowed: [LOCKED_TAB] };
    return { locked: false, allowed: TABS.map(tab => tab.key) };
  }

  // Aba que de fato deve aparecer: com o portal travado, só a Assinatura.
  function resolveTab(requestedTab, guard) {
    const tab = TABS.some(item => item.key === requestedTab) ? requestedTab : DEFAULT_TAB;
    if (guard && guard.locked && !guard.allowed.includes(tab)) return LOCKED_TAB;
    return tab;
  }

  function firstName(fullName) {
    return String(fullName ?? "").trim().split(/\s+/)[0] || "";
  }

  const api = { TABS, DEFAULT_TAB, LOCKED_TAB, parseHash, hasActiveSubscription, resolveGuard, resolveTab, firstName };

  const globalScope = typeof window !== "undefined" ? window : globalThis;
  Object.assign(globalScope, api);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}());
