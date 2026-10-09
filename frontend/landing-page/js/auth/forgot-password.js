(function () {
  "use strict";
  const form = document.querySelector("#forgotForm");
  const message = document.querySelector("#authMessage");
  const redirectTo = new URL("reset-password.html", window.location.href).href;

  function show(text, type) {
    message.hidden = false;
    message.className = `msg ${type === "error" ? "bad" : "ok"}`;
    message.textContent = text;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const email = document.querySelector("#email").value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.querySelector('[data-error="email"]').textContent = "Informe um e-mail válido.";
      return;
    }
    document.querySelector('[data-error="email"]').textContent = "";
    const client = globalThis.vigiAISupabase && globalThis.vigiAISupabase.client;
    if (!client) {
      show("A recuperação ainda não está configurada. Defina VIGIAI_SUPABASE com a URL e a chave pública do projeto.", "error");
      return;
    }
    show("Enviando instruções…", "info");
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      show("Não foi possível processar a solicitação agora. Tente novamente mais tarde.", "error");
      return;
    }
    show("Se existe uma conta associada a este e-mail, enviaremos instruções para redefinir sua senha.", "ok");
  });
}());
