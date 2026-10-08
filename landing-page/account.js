(function () {
  "use strict";

  const AUTH_API_URL = "";
  const loginForm = document.querySelector("#loginForm");
  const signupForm = document.querySelector("#signupForm");
  const authMessage = document.querySelector("#authMessage");
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

  function getConsentData(form) {
    return {
      processing: form.querySelector('[name="processing"]').checked,
      alerts: form.querySelector('[name="alerts"]').checked,
      marketing: form.querySelector('[name="marketing"]').checked,
      terms: form.querySelector('[name="terms"]').checked
    };
  }

  function cpfValue(value) {
    return value.replace(/\D/g, "").slice(0, 11);
  }

  function formatCPF(value) {
    return value.replace(/\D/g, "").slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
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
      cpf: cpfValue(formData.get("cpf").toString()),
      birthDate: formData.get("birthDate").toString(),
      password: formData.get("password").toString(),
      confirmPassword: formData.get("confirmPassword").toString(),
      consent: getConsentData(form)
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

  async function login(event) {
    event.preventDefault();
    const { valid, values } = validateLogin(loginForm);
    if (!valid || !AUTH_API_URL) {
      if (!valid) return;
      showMessage("A autenticação ainda não está conectada a um backend seguro. Configure AUTH_API_URL para acessar a conta.", "error");
      return;
    }

    showMessage("Autenticando…", "info");

    try {
      const response = await fetch(AUTH_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", ...values })
      });

      if (!response.ok) throw new Error();
      showMessage("Login realizado. Você será redirecionado para sua conta.", "ok");
      window.setTimeout(() => window.location.assign("index.html"), 1200);
    } catch {
      showMessage("E-mail ou senha inválidos. Tente novamente ou crie uma conta.", "error");
    }
  }

  async function signup(event) {
    event.preventDefault();
    const { valid, values } = validateSignup(signupForm);
    if (!valid) return;

    if (!AUTH_API_URL) {
      showMessage("O cadastro ainda não está conectado a um backend. Configure AUTH_API_URL para criar a conta.", "error");
      return;
    }

    showMessage("Criando sua conta…", "info");

    try {
      const response = await fetch(AUTH_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signup", registration: buildAccountRegistration(values) })
      });

      if (!response.ok) throw new Error();
      showMessage("Conta criada com sucesso! Faça login para continuar.", "ok");
      setActiveTab("login");
      signupForm.reset();
    } catch {
      showMessage("Não foi possível criar a conta. Tente novamente mais tarde.", "error");
    }
  }

  tabs.forEach(tab => tab.addEventListener("click", () => setActiveTab(tab.dataset.authTab)));
  loginForm.addEventListener("submit", login);
  signupForm.addEventListener("submit", signup);

  document.querySelector("#cpf").addEventListener("input", event => {
    event.target.value = formatCPF(event.target.value);
  });

  document.querySelector("#signupEmail").addEventListener("blur", event => {
    if (validateEmail(event.target.value)) {
      showMessage("Seu e-mail será usado para acessar a conta e receber alertas.", "info");
    }
  });
}());
