# Backend

O backend do projeto é organizado nesta pasta. A integração atual usa o Supabase como
serviço gerenciado:

- `supabase/migrations/` contém as migrations versionadas do banco;
- as políticas RLS, triggers e funções SQL também são mantidas nas migrations;
- as tabelas e colunas de negócio são nomeadas em português, sem acentos;
- não há `service_role`, secrets ou credenciais administrativas no frontend.

A aplicação estática em `../frontend/landing-page` usa somente a chave pública
`anon`/`publishable` do Supabase pelo navegador.

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
