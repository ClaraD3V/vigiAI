-- Apaga EXATAMENTE o que demo_execucoes_inserir.sql criou e devolve as datas originais.
-- Rode antes da apresentação. Pode rodar mais de uma vez sem efeito colateral.
--
-- Só remove linhas que batem com os valores do seed (timestamps exatos, URL, status
-- 'demonstracao'). Leituras e resultados reais gravados pelo agente não são tocados.

do $$
declare
  v_user uuid;
begin
  select id into v_user from auth.users where email = 'gabrielvilelacarvalho@gmail.com';

  -- Resultado do agente criado pelo seed.
  delete from public.agent_match_results
   where publication_url = 'https://diariooficial.santos.sp.gov.br/edicoes/leitura/mobile/2026-10-09/26'
     and checked_at = timestamptz '2026-10-09 03:06:12+00'
     and monitoring_id in (select id::text from public.inscricoes where usuario_id = v_user);

  -- Snapshots marcados pelo seed.
  delete from public.agent_monitoring_snapshots
   where status = 'demonstracao'
     and monitoring_id in (select id::text from public.inscricoes where usuario_id = v_user);

  -- As cinco leituras do seed (run_at e finished_at exatos).
  delete from public.agent_daily_runs
   where (run_at, finished_at) in (
     (timestamptz '2026-10-05 03:05:07+00', timestamptz '2026-10-05 03:08:07+00'),
     (timestamptz '2026-10-06 03:05:07+00', timestamptz '2026-10-06 03:08:07+00'),
     (timestamptz '2026-10-07 03:05:07+00', timestamptz '2026-10-07 03:08:07+00'),
     (timestamptz '2026-10-08 03:05:07+00', timestamptz '2026-10-08 03:08:07+00'),
     (timestamptz '2026-10-09 03:05:07+00', timestamptz '2026-10-09 03:08:07+00')
   );

  -- Datas originais da assinatura e das inscrições de teste (só se ainda estiverem recuadas).
  update public.assinaturas
     set iniciada_em = timestamptz '2026-10-09 11:27:17.381+00'
   where usuario_id = v_user and iniciada_em = timestamptz '2026-10-04 12:30:00+00';

  update public.inscricoes
     set criado_em = timestamptz '2026-10-09 11:22:40.166295+00'
   where usuario_id = v_user and criado_em = timestamptz '2026-10-04 12:00:00+00';
end $$;
