# Configuração do vigiAI

O frontend é estático e usa o Supabase JS v2 pelo CDN. Antes de publicar, disponibilize um
arquivo carregado antes de `supabase-config.js` com:

```js
globalThis.VIGIAI_SUPABASE = {
  url: "https://seu-projeto.supabase.co",
  anonKey: "sua-chave-anon-ou-publishable"
};
```

O arquivo `supabase-config.example.js` pode ser usado como modelo. Apenas a URL e a chave
anon/publishable são permitidas no navegador; nunca publique `service_role`.

A senha não é salva no frontend nem na tabela `public.perfis`. Ela é enviada somente
pelos métodos oficiais do Supabase Auth (`signUp`, `signInWithPassword` e `updateUser`).
Não crie uma coluna de senha nem envie a senha para uma API própria ou para as tabelas
de negócio.

Execute a migration `../../backend/supabase/migrations/20261008000000_initial_schema.sql`
no projeto Supabase usando o Supabase CLI ou o SQL editor. Configure no Supabase Auth a URL de
`reset-password.html` como URL de redirecionamento permitida para o fluxo de recuperação.

As tabelas de negócio do banco estão em português, sem acentos nos identificadores SQL:
`perfis`, `planos`, `assinaturas`, `perfis_candidatos`, `monitoramentos`,
`canais_notificacao`, `eventos_monitoramento` e `logs_auditoria`.

As páginas de autenticação disponíveis são:

- `account.html` — login e cadastro;
- `forgot-password.html` — solicitação de recuperação;
- `reset-password.html` — definição da nova senha.
