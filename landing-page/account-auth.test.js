const test = require("node:test");
const assert = require("node:assert/strict");
const { validateAccountSignup, buildAccountRegistration } = require("./account-auth");

test("rejeita cadastro sem senha ou consentimento", () => {
  const result = validateAccountSignup({
    fullName: "Maria Silva",
    email: "maria@email.com",
    password: "123",
    confirmPassword: "123",
    cpf: "123.456.789-09",
    birthDate: "1995-05-10",
    consent: { processing: false, alerts: false, marketing: false, terms: false }
  });

  assert.deepEqual(result.errors, {
    password: "A senha deve ter pelo menos 8 caracteres.",
    consent: "Você deve aceitar os termos de uso e o tratamento necessário para criar a conta."
  });
});

test("rejeita cadastro com senhas diferentes", () => {
  const result = validateAccountSignup({
    fullName: "Maria Silva",
    email: "maria@email.com",
    password: "Senha@123",
    confirmPassword: "Senha@456",
    cpf: "123.456.789-09",
    birthDate: "1995-05-10",
    consent: { processing: true, alerts: false, marketing: false, terms: true }
  });

  assert.equal(result.errors.confirmPassword, "As senhas não coincidem.");
});

test("monta somente os dados permitidos para a criação da conta", () => {
  const registration = buildAccountRegistration({
    fullName: "Maria Silva",
    email: "maria@email.com",
    password: "Senha@123",
    cpf: "123.456.789-09",
    birthDate: "1995-05-10",
    consent: { processing: true, alerts: true, marketing: false, terms: true }
  });

  assert.deepEqual(registration, {
    full_name: "Maria Silva",
    email: "maria@email.com",
    password: "Senha@123",
    cpf: "123.456.789-09",
    birth_date: "1995-05-10",
    consent: {
      processing: true,
      alerts: true,
      marketing: false,
      terms: true
    }
  });
});
