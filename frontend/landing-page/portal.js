(function () {
  "use strict";

  const authClient = globalThis.vigiAISupabase && globalThis.vigiAISupabase.client;
  const app = document.querySelector("#portalApp");
  const statusEl = document.querySelector("#portalStatus");
  const errorEl = document.querySelector("#portalError");
  const lockEl = document.querySelector("#portalLock");
  const userEl = document.querySelector("#portalUser");
  const links = document.querySelectorAll("[data-tab]");
  const sections = document.querySelectorAll("[data-section]");

  let guard = null;

  function showError() {
    statusEl.hidden = true;
    app.hidden = true;
    errorEl.hidden = false;
  }

  async function loadAccess() {
    const { data: sessionData, error: sessionError } = await authClient.auth.getSession();
    if (sessionError) throw sessionError;
    const session = sessionData.session;
    if (!session) return { session: null };

    const userId = session.user.id;
    const [perfilResult, assinaturaResult] = await Promise.all([
      authClient.from("perfis").select("nome_completo, consentimento_aceito_em").eq("id", userId).maybeSingle(),
      authClient.from("assinaturas").select("status, expira_em, iniciada_em")
        .eq("usuario_id", userId).order("iniciada_em", { ascending: false }).limit(1).maybeSingle()
    ]);
    if (perfilResult.error) throw perfilResult.error;
    if (assinaturaResult.error) throw assinaturaResult.error;

    return { session, perfil: perfilResult.data, assinatura: assinaturaResult.data };
  }

  // Menu: com o portal travado, só a Assinatura é navegável.
  function renderMenu() {
    links.forEach(link => {
      const enabled = guard.allowed.includes(link.dataset.tab);
      if (enabled) {
        link.setAttribute("href", `#${link.dataset.tab}`);
        link.removeAttribute("aria-disabled");
        link.removeAttribute("tabindex");
      } else {
        link.removeAttribute("href");
        link.setAttribute("aria-disabled", "true");
        link.setAttribute("tabindex", "-1");
      }
    });
    lockEl.hidden = !guard.locked;
  }

  function renderTab() {
    const requested = parseHash(window.location.hash);
    const tab = resolveTab(requested, guard);

    // Hash fora do permitido (ou vazio) é corrigido sem empilhar histórico.
    if (window.location.hash !== `#${tab}`) {
      window.history.replaceState(null, "", `#${tab}`);
    }

    sections.forEach(section => {
      section.hidden = section.dataset.section !== tab;
    });
    links.forEach(link => {
      if (link.dataset.tab === tab) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.title = `${TABS.find(item => item.key === tab).label} | vigiAI`;
  }

  // Reavalia as guardas sem recarregar a página. Se o portal estava travado e
  // agora está liberado (ex.: assinatura concluída na tarefa 6), vai para #inicio.
  async function refreshAccess() {
    const wasLocked = guard ? guard.locked : null;
    const access = await loadAccess();
    const next = resolveGuard(access);

    if (next.redirect) {
      window.location.replace(next.redirect);
      return next;
    }

    guard = next;
    userEl.textContent = firstName(access.perfil.nome_completo);
    renderMenu();

    if (wasLocked === true && !guard.locked) {
      window.history.replaceState(null, "", "#inicio");
    }
    renderTab();

    statusEl.hidden = true;
    errorEl.hidden = true;
    app.hidden = false;

    // Avisa as abas (ex.: Assinatura) que o estado de acesso mudou.
    window.dispatchEvent(new CustomEvent("portal:access", {
      detail: { guard, session: access.session, perfil: access.perfil, assinatura: access.assinatura }
    }));
    return guard;
  }

  async function start() {
    if (!authClient) {
      showError();
      return;
    }
    statusEl.hidden = false;
    errorEl.hidden = true;
    try {
      await refreshAccess();
    } catch {
      // Falha de rede/consulta não expulsa o usuário: oferece tentar de novo.
      showError();
    }
  }

  window.addEventListener("hashchange", () => {
    if (guard) renderTab();
  });

  // Link desabilitado não navega nem por clique.
  document.querySelector(".portal-nav").addEventListener("click", event => {
    const link = event.target.closest("a");
    if (link && link.getAttribute("aria-disabled") === "true") event.preventDefault();
  });

  document.querySelector("#portalRetry").addEventListener("click", start);

  document.querySelector("#logoutButton").addEventListener("click", async () => {
    if (authClient) await authClient.auth.signOut();
    window.location.assign("account.html");
  });

  // API para as próximas tarefas (ex.: wizard de assinatura chama refreshAccess()).
  window.vigiAIPortal = { refreshAccess };

  start();
}());
