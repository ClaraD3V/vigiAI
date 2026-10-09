(function () {
  "use strict";

  const authClient = globalThis.vigiAISupabase && globalThis.vigiAISupabase.client;
  const loginForm = document.querySelector("#loginForm");
  const signupForm = document.querySelector("#signupForm");
  const authMessage = document.querySelector("#authMessage");
  const signupSubmit = document.querySelector("#signupSubmit");
  const passwordInput = document.querySelector("#password");
  const confirmInput = document.querySelector("#confirmPassword");
  const passwordHelp = document.querySelector("#passwordHelp");
  const confirmState = document.querySelector("#confirmState");
  const tabs = document.querySelectorAll("[data-auth-tab]");
  const panels = {
    login: document.querySelector("#panel-login"),
    signup: document.querySelector("#panel-signup")
  };

  function showMessage(message, type = "info") {
    authMessage.hidden = false;
    authMessage.className = `msg ${type === "error" ? "bad" : "ok"}`;
    authMessage.textContent = message;
  }

  function clearErrors(form) {
    form.querySelectorAll(".err").forEach(element => {
      element.textContent = "";
    });
  }

  function setFormError(form, fieldName, message) {
    const element = form.querySelector(`[data-error="${fieldName}"]`);
    if (element) element.textContent = message;
  }

  function setActiveTab(tabName) {
    tabs.forEach(tab => {
      const active = tab.dataset.authTab === tabName;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    Object.entries(panels).forEach(([name, panel]) => {
      const active = name === tabName;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
  }

  // Checklist ao vivo: só aparece quando falta algum requisito.
  // Aviso de coincidência: só aparece depois que a confirmação começa a ser digitada.
  // O botão só habilita quando tudo vale.
  function updatePasswordFeedback() {
    const password = passwordInput.value;
    const confirmation = confirmInput.value;
    const checks = passwordChecks(password);
    const strongEnough = validatePassword(password);

    passwordHelp.hidden = password.length === 0 || strongEnough;
    passwordHelp.replaceChildren(...REQUISITOS_SENHA_LISTA.map(({ chave, rotulo }) => {
      const item = document.createElement("li");
      item.textContent = rotulo;
      item.className = checks[chave] ? "ok" : "";
      return item;
    }));

    const matches = password.length > 0 && password === confirmation;
    const mismatch = confirmation.length > 0 && password !== confirmation;
    confirmState.hidden = !(matches || mismatch);
    confirmState.className = `pw-state ${matches ? "ok" : "bad"}`;
    confirmState.textContent = matches ? "✓ As senhas coincidem." : "✗ As senhas não coincidem.";

    signupSubmit.disabled = !(strongEnough && matches);
  }

  function validateLogin(form) {
    const values = {
      email: form.querySelector("#loginEmail").value.trim(),
      password: form.querySelector("#loginPassword").value
    };

    clearErrors(form);
    let valid = true;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      setFormError(form, "loginEmail", "Informe um e-mail válido.");
      valid = false;
    }

    if (!values.password) {
      setFormError(form, "loginPassword", "Informe sua senha.");
      valid = false;
    }

    return { valid, values };
  }

  function validateSignup(form) {
    const formData = new FormData(form);
    const values = {
      fullName: formData.get("fullName").toString().trim(),
      email: formData.get("email").toString().trim(),
      password: formData.get("password").toString(),
      confirmPassword: formData.get("confirmPassword").toString()
    };

    clearErrors(form);
    const result = validateAccountSignup(values);

    Object.entries(result.errors).forEach(([field, message]) => {
      setFormError(form, field, message);
    });

    return { valid: result.valid, values };
  }

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function routeAfterLogin(userId) {
    const { data: perfil, error } = await authClient
      .from("perfis")
      .select("consentimento_aceito_em")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return resolvePostLoginRoute(perfil);
  }

  async function login(event) {
    event.preventDefault();
    const { valid, values } = validateLogin(loginForm);
    if (!valid) return;
    if (!authClient) {
      showMessage("A autenticação ainda não está configurada. Defina VIGIAI_SUPABASE com a URL e a chave pública do projeto.", "error");
      return;
    }

    showMessage("Autenticando…", "info");

    try {
      const { data, error } = await authClient.auth.signInWithPassword({
        email: values.email,
        password: values.password
      });
      if (error) throw error;
      const destination = await routeAfterLogin(data.user.id);
      showMessage("Login realizado. Redirecionando…", "ok");
      window.location.assign(destination);
    } catch (error) {
      showMessage(translateAuthError(error && error.message, "Não foi possível entrar. Tente novamente."), "error");
    }
  }

  async function signup(event) {
    event.preventDefault();
    const { valid, values } = validateSignup(signupForm);
    if (!valid) return;

    if (!authClient) {
      showMessage("O cadastro ainda não está configurado. Defina VIGIAI_SUPABASE com a URL e a chave pública do projeto.", "error");
      return;
    }

    showMessage("Criando sua conta…", "info");

    try {
      const registration = buildAccountRegistration(values);
      const { data, error } = await authClient.auth.signUp({
        email: registration.email,
        password: registration.password,
        options: {
          data: { full_name: registration.full_name },
          emailRedirectTo: new URL("consentimento.html", window.location.href).href
        }
      });
      if (error) throw error;
      if (data.session) {
        showMessage("Conta criada com sucesso! Redirecionando…", "ok");
        window.location.assign("consentimento.html");
      } else {
        showMessage("Conta criada. Verifique seu e-mail para confirmar o cadastro.", "ok");
        setActiveTab("login");
        signupForm.reset();
        updatePasswordFeedback();
      }
    } catch (error) {
      showMessage(translateAuthError(error && error.message, "Não foi possível criar a conta. Tente novamente mais tarde."), "error");
    }
  }

  tabs.forEach(tab => tab.addEventListener("click", () => setActiveTab(tab.dataset.authTab)));
  loginForm.addEventListener("submit", login);
  signupForm.addEventListener("submit", signup);
  passwordInput.addEventListener("input", updatePasswordFeedback);
  confirmInput.addEventListener("input", updatePasswordFeedback);

  document.querySelector("#signupEmail").addEventListener("blur", event => {
    if (validateEmail(event.target.value)) {
      showMessage("Seu e-mail será usado para acessar a conta e receber os avisos.", "info");
    }
  });

  // Quem já está logado vai direto para o destino certo.
  if (authClient) {
    authClient.auth.getSession().then(async ({ data }) => {
      if (data && data.session) window.location.assign(await routeAfterLogin(data.session.user.id));
    }).catch(() => {
      // Sem destino definido: fica na tela de acesso para o usuário tentar de novo.
    });
  }
}());
