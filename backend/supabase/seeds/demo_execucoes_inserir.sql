-- Dados de DEMONSTRAÇÃO da aba Execuções. Para apagar exatamente o que este arquivo cria,
-- rode demo_execucoes_apagar.sql (antes da apresentação).
--
-- Só toca no usuário gabrielvilelacarvalho@gmail.com e nas inscrições 20230 e 20231 dele.
-- Nenhum nome ou inscrição de pessoa real do Diário Oficial é usado.
--
-- O que cria:
--   * 5 leituras seguidas (05 a 09/10/2026, 00h05 de São Paulo);
--   * uma delas (07/10) com falha parcial (errors = 1);
--   * um achado de alta confiança na leitura mais recente (09/10), inspirado na edição
--     real nº 9221 (convocação para as provas de 18/10/2026);
--   * 2 snapshots do agente, marcados com status = 'demonstracao' (é o que o apagar usa).
--
-- A tela só mostra execuções a partir de assinaturas.iniciada_em e só conta as
-- inscrições que já existiam na leitura. Como a assinatura e as inscrições de teste foram
-- criadas em 09/10, o bloco 1 recua essas duas datas para 04/10. O apagar devolve os
-- valores originais (e só mexe se ainda estiverem com o valor do seed).

do $$
declare
  v_user uuid;
  v_a uuid;
  v_b uuid;
begin
  select id into v_user from auth.users where email = 'gabrielvilelacarvalho@gmail.com';
  if v_user is null then
    raise exception 'Usuário gabrielvilelacarvalho@gmail.com não encontrado.';
  end if;

  select id into v_a from public.inscricoes where usuario_id = v_user and numero_inscricao = '20230';
  select id into v_b from public.inscricoes where usuario_id = v_user and numero_inscricao = '20231';
  if v_a is null or v_b is null then
    raise exception 'Inscrições 20230 e 20231 do usuário não encontradas.';
  end if;

  if exists (select 1 from public.agent_daily_runs where run_at = timestamptz '2026-10-09 03:05:07+00') then
    raise exception 'O seed de demonstração já foi aplicado. Rode demo_execucoes_apagar.sql antes de repetir.';
  end if;

  -- 1. Recua as datas de teste para que as leituras de 05 a 09/10 apareçam.
  update public.assinaturas
     set iniciada_em = timestamptz '2026-10-04 12:30:00+00'
   where usuario_id = v_user and iniciada_em = timestamptz '2026-10-09 11:27:17.381+00';

  update public.inscricoes
     set criado_em = timestamptz '2026-10-04 12:00:00+00'
   where usuario_id = v_user and criado_em = timestamptz '2026-10-09 11:22:40.166295+00';

  -- 2. Snapshots (a chave estrangeira de agent_match_results exige).
  insert into public.agent_monitoring_snapshots
    (monitoring_id, city, registration_number, status, active, documents_checked_count, last_matched_at, last_checked_at)
  values
    (v_a::text, 'Santos', '20230', 'demonstracao', true, 5, timestamptz '2026-10-09 03:06:12+00', timestamptz '2026-10-09 03:08:07+00'),
    (v_b::text, 'Santos', '20231', 'demonstracao', true, 5, null, timestamptz '2026-10-09 03:08:07+00')
  on conflict (monitoring_id) do nothing;

  -- 3. Leituras: 05, 06, 07 (falha parcial), 08 e 09/10, às 00h05 de São Paulo (03h05 UTC).
  insert into public.agent_daily_runs (run_at, finished_at, cities_synced, monitorings_checked, matches_found, errors)
  values
    (timestamptz '2026-10-05 03:05:07+00', timestamptz '2026-10-05 03:08:07+00', 1, 2, 0, 0),
    (timestamptz '2026-10-06 03:05:07+00', timestamptz '2026-10-06 03:08:07+00', 1, 2, 0, 0),
    (timestamptz '2026-10-07 03:05:07+00', timestamptz '2026-10-07 03:08:07+00', 1, 2, 0, 1),
    (timestamptz '2026-10-08 03:05:07+00', timestamptz '2026-10-08 03:08:07+00', 1, 2, 0, 0),
    (timestamptz '2026-10-09 03:05:07+00', timestamptz '2026-10-09 03:08:07+00', 1, 2, 1, 0);

  -- 4. Achado de alta confiança na leitura mais recente (inscrição 20230).
  insert into public.agent_match_results
    (monitoring_id, found, confidence, confidence_level, llm_arbitrated, publication_type, publication_title,
     publication_url, publication_deadline, excerpt, checked_at)
  values
    (v_a::text, true, 0.97, 'alta', false, 'convocacao',
     'Convocação para prova objetiva — Edital nº 149/2026-SEPLA-RH',
     'https://diariooficial.santos.sp.gov.br/edicoes/leitura/mobile/2026-10-09/26',
     '18/10/2026',
     'Edital nº 149/2026-SEPLA-RH — convocação para as provas objetivas do concurso do Edital nº 74/2026-SEPLA-RH. Inscrição 20230. Prova em 18/10/2026, na Unisanta, Bloco M, período da manhã.',
     timestamptz '2026-10-09 03:06:12+00');
end $$;
