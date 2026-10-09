(function () {
  "use strict";

  // Versão do texto exibido em consentimento.html. Mudou o texto? Mude a versão.
  const CONSENT_VERSION = "2026-10-09";

  // Mesma regra do CadastroWizard do Sistema de Presença. Se não há o que rolar
  // (texto cabe na caixa), conta como lido.
  function isScrolledToEnd(box) {
    const { scrollTop, scrollHeight, clientHeight } = box;
    return scrollHeight <= clientHeight || scrollHeight - scrollTop - clientHeight < 10;
  }

  function buildConsentUpdate(now = new Date()) {
    return {
      consentimento_aceito_em: now.toISOString(),
      consentimento_versao: CONSENT_VERSION
    };
  }

  const api = { CONSENT_VERSION, isScrolledToEnd, buildConsentUpdate };

  const globalScope = typeof window !== "undefined" ? window : globalThis;
  Object.assign(globalScope, api);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}());
