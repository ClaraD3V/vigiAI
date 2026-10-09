-- Permissões de tabela para os papéis da API do Supabase.
--
-- Este projeto foi criado sem os GRANTs padrão para anon/authenticated/service_role.
-- Sem eles, toda consulta falha com "permission denied" antes mesmo de o RLS ser
-- avaliado. Aqui cada papel recebe só o necessário; o RLS continua decidindo QUAIS
-- linhas cada usuário enxerga.

-- service_role: usado pelo agente (backend). Ignora RLS e precisa de acesso total.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- anon (visitante sem login): só a vitrine de planos.
grant select on public.planos to anon;

-- authenticated (usuário logado): o que o portal usa.
grant select on public.planos to authenticated;
grant select, update on public.perfis to authenticated;            -- dados e consentimento
grant select, insert, update on public.assinaturas to authenticated; -- assinar e cancelar
grant select, insert, update, delete on public.inscricoes to authenticated;
grant select, insert, update on public.preferencias_envio to authenticated;
grant select on public.agent_daily_runs to authenticated;          -- tela de Execuções
grant select on public.agent_monitoring_snapshots to authenticated;
grant select on public.agent_match_results to authenticated;
