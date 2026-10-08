# vigiAI

## Estrutura

- [`frontend/landing-page`](./frontend/landing-page) — interface estática, autenticação e
  integração pública com o Supabase;
- [`backend/supabase`](./backend/supabase) — migrations, RLS, triggers e estrutura do banco.

Consulte [`frontend/landing-page/README.md`](./frontend/landing-page/README.md) para configurar
as variáveis públicas do Supabase e [`backend/README.md`](./backend/README.md) para a organização
do backend.

## Testes

```powershell
node --test frontend\landing-page\*.test.js
```
