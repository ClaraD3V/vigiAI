# Backend

O backend do projeto é organizado nesta pasta. A integração atual usa o Supabase como
serviço gerenciado:

- `supabase/migrations/` contém as migrations versionadas do banco;
- as políticas RLS, triggers e funções SQL também são mantidas nas migrations;
- as tabelas e colunas de negócio são nomeadas em português, sem acentos;
- não há `service_role`, secrets ou credenciais administrativas no frontend.

A aplicação estática em `../frontend/landing-page` usa somente a chave pública
`anon`/`publishable` do Supabase pelo navegador.

## Senhas

As senhas **não devem ser armazenadas** em nenhuma tabela `public`, incluindo
`public.perfis`. O fluxo correto é:

1. o frontend envia a senha exclusivamente para `supabase.auth.signUp`;
2. o Supabase Auth armazena apenas o hash seguro da senha na área interna
   `auth.users`;
3. o login usa `supabase.auth.signInWithPassword`;
4. a recuperação usa `resetPasswordForEmail` e `updateUser`.

Não adicione colunas como `senha`, `senha_hash` ou `password` às tabelas públicas.
Também não é necessário criptografar ou descriptografar a senha manualmente. Senhas
devem ser protegidas por hash de mão única; a aplicação nunca deve conseguir recuperar
o valor original. A tabela `public.perfis` guarda somente dados do perfil e não contém
senha por desenho.

Principais tabelas:

| Tabela | Finalidade |
| --- | --- |
| `perfis` | Dados básicos do usuário |
| `planos` | Planos disponíveis |
| `assinaturas` | Plano associado a cada usuário |
| `perfis_candidatos` | Dados do candidato monitorado |
| `monitoramentos` | Configurações de monitoramento |
| `canais_notificacao` | Canais de recebimento |
| `monitoramentos_canais_notificacao` | Relação entre monitoramentos e canais |
| `eventos_monitoramento` | Histórico de ocorrências |
| `logs_auditoria` | Registro de ações relevantes |
