import { BaseRepository } from "./base";
import type { Database } from "../../../shared/src/types/database";

type MatchResult = Database["public"]["Tables"]["agent_match_results"]["Row"];
type MatchResultInsert = Database["public"]["Tables"]["agent_match_results"]["Insert"];
type DailyRun = Database["public"]["Tables"]["agent_daily_runs"]["Row"];
type DailyRunInsert = Database["public"]["Tables"]["agent_daily_runs"]["Insert"];

/**
 * Repository para Eventos e Resultados de Matching
 * Grava histórico de descobertas e execuções do agente
 */
export class EventsRepository extends BaseRepository {
  /**
   * Registra um resultado de matching
   */
  async recordMatchResult(data: MatchResultInsert): Promise<MatchResult> {
    if (!this.isConfigured() || !this.client) {
      throw this.handleError(
        new Error("Supabase não configurado"),
        "recordMatchResult"
      );
    }

    try {
      const { data: result, error } = await this.client
        .from("agent_match_results")
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      this.log("info", `Resultado de matching gravado para monitoring ${data.monitoring_id}`);

      return result;
    } catch (error) {
      throw this.handleError(error, "recordMatchResult");
    }
  }

  /**
   * Registra execução diária (run)
   */
  async recordDailyRun(data: DailyRunInsert): Promise<DailyRun> {
    if (!this.isConfigured() || !this.client) {
      throw this.handleError(
        new Error("Supabase não configurado"),
        "recordDailyRun"
      );
    }

    try {
      const { data: result, error } = await this.client
        .from("agent_daily_runs")
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      this.log("info", `Daily run gravado — ${data.monitorings_checked} monitoramentos checados`);

      return result;
    } catch (error) {
      throw this.handleError(error, "recordDailyRun");
    }
  }

  /**
   * Lista últimos matches para um monitoramento
   */
  async listRecentMatches(
    monitoringId: string,
    limit: number = 10
  ): Promise<MatchResult[]> {
    if (!this.isConfigured() || !this.client) {
      return [];
    }

    try {
      const { data, error } = await this.client
        .from("agent_match_results")
        .select("*")
        .eq("monitoring_id", monitoringId)
        .order("checked_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data || [];
    } catch (error) {
      throw this.handleError(error, "listRecentMatches");
    }
  }

  /**
   * Obtém última execução diária
   */
  async getLastDailyRun(): Promise<DailyRun | null> {
    if (!this.isConfigured() || !this.client) {
      return null;
    }

    try {
      const { data, error } = await this.client
        .from("agent_daily_runs")
        .select("*")
        .order("run_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return data;
    } catch (error) {
      throw this.handleError(error, "getLastDailyRun");
    }
  }
}
