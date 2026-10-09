const test = require("node:test");
const assert = require("node:assert/strict");
const {
  SENHA_REQUISITOS,
  passwordChecks,
  validateAccountSignup,
  buildAccountRegistration,
  translateAuthError,
  resolvePostLoginRoute
} = require("../js/auth/account-auth");

const valido = {
  fullName: "Maria Silva",
  email: "maria@email.com",
  password: "Senha@123",
  confirmPassword: "Senha@123"
};

test("aceita cadastro válido", () => {
  const result = validateAccountSignup(valido);
  assert.deepEqual(result.errors, {});
  assert.equal(result.valid, true);
});

test("rejeita senha curta, sem número ou sem caractere especial", () => {
  for (const password of ["Ab@1", "Senha@abc", "Senha1234"]) {
    const result = validateAccountSignup({ ...valido, password, confirmPassword: password });
    assert.deepEqual(result.errors, { password: SENHA_REQUISITOS }, password);
  }
});

test("passwordChecks indica cada requisito", () => {
  assert.deepEqual(passwordChecks("abc"), { comprimento: false, numero: false, especial: false });
  assert.deepEqual(passwordChecks("abcdefg1"), { comprimento: true, numero: true, especial: false });
  assert.deepEqual(passwordChecks("abcdefg!"), { comprimento: true, numero: false, especial: true });
});

test("rejeita cadastro com senhas diferentes", () => {
  const result = validateAccountSignup({ ...valido, confirmPassword: "Senha@456" });
  assert.deepEqual(result.errors, { confirmPassword: "As senhas não coincidem." });
});

test("rejeita nome curto e e-mail inválido", () => {
  const result = validateAccountSignup({ ...valido, fullName: "Al", email: "maria@" });
  assert.deepEqual(result.errors, {
    fullName: "Informe seu nome completo.",
    email: "Informe um e-mail válido."
  });
});

test("monta somente nome, e-mail e senha para a criação da conta", () => {
  const registration = buildAccountRegistration({
    ...valido,
    fullName: "  Maria Silva ",
    cpf: "123.456.789-09",
    birthDate: "1995-05-10",
    consent: { terms: true }
  });

  assert.deepEqual(registration, {
    full_name: "Maria Silva",
    email: "maria@email.com",
    password: "Senha@123"
  });
});

test("traduz erros do Supabase e usa o fallback para os desconhecidos", () => {
  assert.equal(translateAuthError("Invalid login credentials", "x"), "E-mail ou senha incorretos.");
  assert.equal(translateAuthError("User already registered", "x"), "Já existe uma conta com este e-mail.");
  assert.equal(translateAuthError("Password should be at least 6 characters", "x"), SENHA_REQUISITOS);
  assert.equal(translateAuthError("algo inesperado", "fallback"), "fallback");
  assert.equal(translateAuthError(undefined, "fallback"), "fallback");
});

test("roteia para o portal só com consentimento aceito", () => {
  assert.equal(resolvePostLoginRoute({ consentimento_aceito_em: "2026-10-09T12:00:00Z" }), "portal.html");
  assert.equal(resolvePostLoginRoute({ consentimento_aceito_em: null }), "consentimento.html");
  assert.equal(resolvePostLoginRoute(null), "consentimento.html"); // perfil ainda sem linha
});
