(function () {
  "use strict";

  const authClient = globalThis.vigiAISupabase && globalThis.vigiAISupabase.client;
  const textBox = document.querySelector("#consentText");
  const check = document.querySelector("#consentCheck");
  const submit = document.querySelector("#consentSubmit");
  const message = document.querySelector("#consentMessage");
  const logout = document.querySelector("#logoutButton");

  let userId = null;
  let scrolledToEnd = false;

  function showMessage(text, type = "info") {
    message.hidden = false;
    message.className = `msg ${type === "error" ? "bad" : "ok"}`;
    message.textContent = text;
  }

  // Checkbox e botão só habilitam depois da rolagem até o fim.
  function refresh() {
    if (!scrolledToEnd) scrolledToEnd = isScrolledToEnd(textBox);
    check.disabled = !scrolledToEnd;
    if (!scrolledToEnd) check.checked = false;
    submit.disabled = !(scrolledToEnd && check.checked);
  }

  async function accept() {
    submit.disabled = true;
    showMessage("Salvando…", "info");

    const { error } = await authClient
      .from("perfis")
      .update(buildConsentUpdate())
      .eq("id", userId);

    if (error) {
      showMessage("Não foi possível registrar o aceite. Tente novamente.", "error");
      refresh();
      return;
    }
    window.location.assign("portal.html");
  }

  async function init() {
    if (!authClient) {
      showMessage("A autenticação ainda não está configurada.", "error");
      return;
    }

    const { data: sessionData } = await authClient.auth.getSession();
    if (!sessionData.session) {
      window.location.replace("account.html");
      return;
    }
    userId = sessionData.session.user.id;

    // Quem já consentiu não precisa ver a tela de novo.
    const { data: perfil, error } = await authClient
      .from("perfis")
      .select("consentimento_aceito_em")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      showMessage("Não foi possível carregar seu perfil. Recarregue a página.", "error");
      return;
    }
    if (perfil && perfil.consentimento_aceito_em) {
      window.location.replace("portal.html");
      return;
    }

    textBox.addEventListener("scroll", refresh);
    window.addEventListener("resize", refresh);
    check.addEventListener("change", refresh);
    submit.addEventListener("click", accept);
    refresh();
  }

  logout.addEventListener("click", async () => {
    if (authClient) await authClient.auth.signOut();
    window.location.assign("account.html");
  });

  init();
}());
