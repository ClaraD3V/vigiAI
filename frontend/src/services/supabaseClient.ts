import { createClient } from "@supabase/supabase-js";
import { config } from "../config/env";
import type { Database } from "../../../shared/src/types/database";

/**
 * Singleton Supabase Client para Frontend (anon key apenas)
 */
export const supabaseClient = createClient<Database>(
  config.supabaseUrl,
  config.supabaseAnonKey
);

/**
 * Service de autenticação
 */
export async function signUp(email: string, password: string, fullName: string, cpf: string, birthDate: string) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        cpf,
        birth_date: birthDate,
      },
    },
  });

  return { data, error };
}

export async function signIn(email: string, password: string) {
  return supabaseClient.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signOut() {
  return supabaseClient.auth.signOut();
}

export async function resetPasswordForEmail(email: string) {
  return supabaseClient.auth.resetPasswordForEmail(email);
}

export async function updateUser(attributes: { password?: string; email?: string }) {
  return supabaseClient.auth.updateUser(attributes);
}

/**
 * Service de Monitoramentos (queries ao Supabase)
 */
export async function getMyMonitorings(userId: string) {
  const { data, error } = await supabaseClient
    .from("monitoramentos")
    .select(`
      *,
      candidato:perfis_candidatos(*),
      eventos:eventos_monitoramento(id, tipo_evento, detectado_em)
    `)
    .eq("usuario_id", userId)
    .order("atualizado_em", { ascending: false });

  return { data, error };
}

export async function createMonitoring(
  userId: string,
  perfilCandidatoId: string,
  urlFonte: string,
  nomeFonte?: string
) {
  const { data, error } = await supabaseClient
    .from("monitoramentos")
    .insert({
      usuario_id: userId,
      perfil_candidato_id: perfilCandidatoId,
      url_fonte: urlFonte,
      nome_fonte: nomeFonte,
      status: "ativo",
    })
    .select()
    .single();

  return { data, error };
}

export async function getMonitoringEvents(monitoringId: string, limit = 20) {
  const { data, error } = await supabaseClient
    .from("eventos_monitoramento")
    .select("*")
    .eq("monitoramento_id", monitoringId)
    .order("detectado_em", { ascending: false })
    .limit(limit);

  return { data, error };
}
