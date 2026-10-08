# vigiAI

## Estrutura

- [`frontend/landing-page`](./frontend/landing-page) — interface estática, autenticação e
  integração pública com o Supabase;
- [`backend/supabase`](./backend/supabase) — migrations, RLS, triggers e estrutura do banco.

As tabelas e colunas de negócio usam nomes em português e sem acentos para facilitar a
manutenção e manter compatibilidade com SQL e ferramentas de integração. Exemplos:
`perfis`, `planos`, `monitoramentos`, `usuario_id` e `criado_em`.

Consulte [`frontend/landing-page/README.md`](./frontend/landing-page/README.md) para configurar
as variáveis públicas do Supabase e [`backend/README.md`](./backend/README.md) para a organização
do backend.

## Testes

```powershell
node --test frontend\landing-page\*.test.js
```
