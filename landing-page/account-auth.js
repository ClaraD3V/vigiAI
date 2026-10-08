(function () {
  "use strict";

  function validatePassword(password) {
    return typeof password === "string" && password.length >= 8;
  }

  function validateAccountSignup(data) {
    const errors = {};
    const password = String(data?.password ?? "");
    const consent = data?.consent ?? {};

    if (!validatePassword(password)) {
      errors.password = "A senha deve ter pelo menos 8 caracteres.";
    }

    if (password !== String(data?.confirmPassword ?? "")) {
      errors.confirmPassword = "As senhas não coincidem.";
    }

    if (!consent.processing || !consent.terms) {
      errors.consent = "Você deve aceitar os termos de uso e o tratamento necessário para criar a conta.";
    }

    return { errors, valid: Object.keys(errors).length === 0 };
  }

  function buildAccountRegistration(data) {
    return {
      full_name: String(data?.fullName ?? "").trim(),
      email: String(data?.email ?? "").trim(),
      password: String(data?.password ?? ""),
      cpf: String(data?.cpf ?? "").trim(),
      birth_date: String(data?.birthDate ?? "").trim(),
      consent: {
        processing: Boolean(data?.consent?.processing),
        alerts: Boolean(data?.consent?.alerts),
        marketing: Boolean(data?.consent?.marketing),
        terms: Boolean(data?.consent?.terms)
      }
    };
  }

  const globalScope = typeof window !== "undefined" ? window : globalThis;
  globalScope.validateAccountSignup = validateAccountSignup;
  globalScope.buildAccountRegistration = buildAccountRegistration;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { validateAccountSignup, buildAccountRegistration };
  }
}());
