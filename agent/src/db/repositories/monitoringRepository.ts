import { BaseRepository } from "./base";
import type { Database } from "../../../shared/src/types/database";

type Monitoring = Database["public"]["Tables"]["monitoramentos"]["Row"];
type MonitoringInsert = Database["public"]["Tables"]["monitoramentos"]["Insert"];
type MonitoringUpdate = Database["public"]["Tables"]["monitoramentos"]["Update"];
type PerfisCandidate = Database["public"]["Tables"]["perfis_candidatos"]["Row"];

/**
 * Repository para Monitoramentos
 * Lê configurações de monitoramento e perfis de candidatos
 */
export class MonitoringRepository extends BaseRepository {
  /**
   * Obtém um monitoramento pelo ID
   */
  async getMonitoring(monitoringId: string): Promise<Monitoring | null> {
    if (!this.isConfigured() || !this.client) {
      return null;
    }

    try {
      const { data, error } = await this.client
        .from("monitoramentos")
        .select("*")
        .eq("id", monitoringId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // Não encontrado
        throw error;
      }

      return data;
    } catch (error) {
      throw this.handleError(error, "getMonitoring");
    }
  }

  /**
   * Lista monitoramentos ativos para processamento
   */
  async listActiveMonitorings(): Promise<(Monitoring & { candidato: PerfisCandidate | null })[]> {
    if (!this.isConfigured() || !this.client) {
      return [];
    }

    try {
      const { data, error } = await this.client
        .from("monitoramentos")
        .select(`
          *,
          candidato:perfis_candidatos(*)
        `)
        .eq("status", "ativo")
        .order("ultima_ocorrencia_em", { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      throw this.handleError(error, "listActiveMonitorings");
    }
  }

  /**
   * Cria novo monitoramento
   */
  async createMonitoring(data: MonitoringInsert): Promise<Monitoring> {
    if (!this.isConfigured() || !this.client) {
      throw this.handleError(
        new Error("Supabase não configurado"),
        "createMonitoring"
      );
    }

    try {
      const { data: result, error } = await this.client
        .from("monitoramentos")
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      this.log("info", `Monitoramento criado: ${result.id}`);

      return result;
    } catch (error) {
      throw this.handleError(error, "createMonitoring");
    }
  }

  /**
   * Atualiza monitoramento
   */
  async updateMonitoring(
    monitoringId: string,
    data: MonitoringUpdate
  ): Promise<Monitoring> {
    if (!this.isConfigured() || !this.client) {
      throw this.handleError(
        new Error("Supabase não configurado"),
        "updateMonitoring"
      );
    }

    try {
      const { data: result, error } = await this.client
        .from("monitoramentos")
        .update(data)
        .eq("id", monitoringId)
        .select()
        .single();

      if (error) throw error;

      this.log("info", `Monitoramento ${monitoringId} atualizado`);

      return result;
    } catch (error) {
      throw this.handleError(error, "updateMonitoring");
    }
  }

  /**
   * Obtém perfil candidato
   */
  async getCandidateProfile(profileId: string): Promise<PerfisCandidate | null> {
    if (!this.isConfigured() || !this.client) {
      return null;
    }

    try {
      const { data, error } = await this.client
        .from("perfis_candidatos")
        .select("*")
        .eq("id", profileId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return data;
    } catch (error) {
      throw this.handleError(error, "getCandidateProfile");
    }
  }
}
