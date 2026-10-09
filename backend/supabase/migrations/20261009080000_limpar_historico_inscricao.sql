-- Quando uma inscrição é apagada, apaga também o histórico do agente ligado a ela.
-- agent_monitoring_snapshots usa monitoring_id em texto (sem chave estrangeira para
-- inscricoes), então o "on delete cascade" não alcança. O delete do snapshot leva
-- junto os agent_match_results (esses têm cascade para o snapshot).

create or replace function public.limpar_historico_inscricao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.agent_monitoring_snapshots where monitoring_id = old.id::text;
  return old;
end;
$$;

revoke all on function public.limpar_historico_inscricao() from public, anon, authenticated;

drop trigger if exists limpar_historico_ao_apagar on public.inscricoes;
create trigger limpar_historico_ao_apagar
after delete on public.inscricoes
for each row execute function public.limpar_historico_inscricao();
