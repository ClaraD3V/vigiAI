(function () {
  "use strict";

  // Regras e traduções espelhadas de leonavasconi/SistemaPresencaUnisanta
  // (lib/auth/errors.ts e components/ui/PasswordFields.tsx).
  const SENHA_REQUISITOS =
    "A senha deve ter pelo menos 8 caracteres, 1 número e 1 caractere especial (!@#$%^&*).";

  const CARACTERE_ESPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

  const REQUISITOS_SENHA_LISTA = [
    { chave: "comprimento", rotulo: "Pelo menos 8 caracteres" },
    { chave: "numero", rotulo: "Pelo menos 1 número" },
    { chave: "especial", rotulo: "Pelo menos 1 caractere especial (!@#$%&*)" }
  ];

  // Trechos das mensagens do Supabase -> texto que o usuário vê. Comparação por
  // `includes` porque o Supabase varia o sufixo entre versões.
  const TRADUCOES = [
    ["invalid login credentials", "E-mail ou senha incorretos."],
    ["email not confirmed", "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada."],
    ["user already registered", "Já existe uma conta com este e-mail."],
    ["email address is invalid", "Informe um e-mail válido (exemplo: nome@dominio.com)."],
    ["unable to validate email address", "Informe um e-mail válido (exemplo: nome@dominio.com)."],
    ["password should be at least", SENHA_REQUISITOS],
    ["new password should be different", "A nova senha precisa ser diferente da anterior."],
    ["token has expired or is invalid", "Este link de redefinição expirou ou já foi usado. Peça um novo."],
    ["invalid flow state", "Este link de redefinição expirou ou já foi usado. Peça um novo."],
    ["code verifier", "Este link de redefinição expirou ou já foi usado. Peça um novo."],
    ["auth session missing", "Sua sessão expirou. Peça um novo link de redefinição."],
    ["for security purposes", "Aguarde alguns segundos antes de tentar novamente."],
    ["email rate limit exceeded", "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo."],
    ["over_email_send_rate_limit", "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo."]
  ];

  function passwordChecks(password) {
    const value = String(password ?? "");
    return {
      comprimento: value.length >= 8,
      numero: /[0-9]/.test(value),
      especial: CARACTERE_ESPECIAL.test(value)
    };
  }

  function validatePassword(password) {
    return Object.values(passwordChecks(password)).every(Boolean);
  }

  function validateAccountSignup(data) {
    const errors = {};
    const fullName = String(data?.fullName ?? "").trim();
    const email = String(data?.email ?? "").trim();
    const password = String(data?.password ?? "");

    if (fullName.length < 3) errors.fullName = "Informe seu nome completo.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Informe um e-mail válido.";
    if (!validatePassword(password)) errors.password = SENHA_REQUISITOS;

    if (password !== String(data?.confirmPassword ?? "")) {
      errors.confirmPassword = "As senhas não coincidem.";
    }

    return { errors, valid: Object.keys(errors).length === 0 };
  }

  function buildAccountRegistration(data) {
    return {
      full_name: String(data?.fullName ?? "").trim(),
      email: String(data?.email ?? "").trim(),
      password: String(data?.password ?? "")
    };
  }

  function translateAuthError(message, fallback) {
    if (!message) return fallback;
    const normalized = String(message).toLowerCase();
    const hit = TRADUCOES.find(([trecho]) => normalized.includes(trecho));
    return hit ? hit[1] : fallback;
  }

  // Destino depois do login. `perfil` é a linha de `perfis` do usuário.
  function resolvePostLoginRoute(perfil) {
    return perfil && perfil.consentimento_aceito_em ? "portal.html" : "consentimento.html";
  }

  const api = {
    SENHA_REQUISITOS,
    REQUISITOS_SENHA_LISTA,
    passwordChecks,
    validatePassword,
    validateAccountSignup,
    buildAccountRegistration,
    translateAuthError,
    resolvePostLoginRoute
  };

  const globalScope = typeof window !== "undefined" ? window : globalThis;
  Object.assign(globalScope, api);

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
}());
