# Backend

O backend do projeto é organizado nesta pasta. A integração atual usa o Supabase como
serviço gerenciado:

- `supabase/migrations/` contém as migrations versionadas do banco;
- as políticas RLS, triggers e funções SQL também são mantidas nas migrations;
- não há `service_role`, secrets ou credenciais administrativas no frontend.

A aplicação estática em `../frontend/landing-page` usa somente a chave pública
`anon`/`publishable` do Supabase pelo navegador.
