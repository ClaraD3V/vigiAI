(function () {
  "use strict";
  const form = document.querySelector("#resetForm");
  const message = document.querySelector("#authMessage");
  let recoverySession = false;

  function show(text, type) {
    message.hidden = false;
    message.className = `msg ${type === "error" ? "bad" : "ok"}`;
    message.textContent = text;
  }

  async function initialize() {
    const client = globalThis.vigiAISupabase && globalThis.vigiAISupabase.client;
    if (!client) {
      show("A redefinição ainda não está configurada. Defina VIGIAI_SUPABASE com a URL e a chave pública do projeto.", "error");
      return;
    }
    const { data } = await client.auth.getSession();
    recoverySession = Boolean(data.session);
    if (!recoverySession) show("O link de recuperação expirou ou já foi utilizado. Solicite um novo link.", "error");
    client.auth.onAuthStateChange(event => {
      if (event === "PASSWORD_RECOVERY") recoverySession = true;
    });
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const password = document.querySelector("#password").value;
    const confirmation = document.querySelector("#confirmPassword").value;
    document.querySelector('[data-error="password"]').textContent = password.length < 8 ? "A senha deve ter pelo menos 8 caracteres." : "";
    document.querySelector('[data-error="confirmPassword"]').textContent = password !== confirmation ? "As senhas não coincidem." : "";
    if (password.length < 8 || password !== confirmation) return;
    if (!recoverySession) {
      show("Abra o link recebido por e-mail para redefinir sua senha.", "error");
      return;
    }
    show("Atualizando sua senha…", "info");
    const { error } = await globalThis.vigiAISupabase.client.auth.updateUser({ password });
    if (error) {
      show("Não foi possível redefinir a senha. Solicite um novo link e tente novamente.", "error");
      return;
    }
    await globalThis.vigiAISupabase.client.auth.signOut();
    form.reset();
    show("Senha redefinida com sucesso. Você já pode entrar na sua conta.", "ok");
  });

  initialize();
}());
