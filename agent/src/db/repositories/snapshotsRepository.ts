import { BaseRepository, RepositoryError } from "./base";
import type { Database } from "../../../shared/src/types/database";

type MonitoringSnapshot = Database["public"]["Tables"]["agent_monitoring_snapshots"]["Row"];
type MonitoringSnapshotInsert = Database["public"]["Tables"]["agent_monitoring_snapshots"]["Insert"];

/**
 * Repository para Snapshots de Monitoramento
 * Alimenta o dashboard do frontend com status atualizado do agente
 */
export class SnapshotsRepository extends BaseRepository {
  /**
   * Upsert (insert ou update) do snapshot de um monitoramento
   * best-effort: logs apenas, não retorna erro
   */
  async upsertSnapshot(data: MonitoringSnapshotInsert): Promise<void> {
    if (!this.isConfigured() || !this.client) {
      this.log("warn", "Supabase não configurado — skipping upsert snapshot");
      return;
    }

    try {
      const { error } = await this.client
        .from("agent_monitoring_snapshots")
        .upsert(data);

      if (error) {
        throw error;
      }

      this.log("info", `Snapshot atualizado para monitoring ${data.monitoring_id}`);
    } catch (error) {
      const err = this.handleError(error, "upsertSnapshot");
      // best-effort: não relança, apenas loga
      this.log("error", `Falha ao gravar snapshot: ${err.message}`);
    }
  }

  /**
   * Busca snapshot atual de um monitoramento
   */
  async getSnapshot(monitoringId: string): Promise<MonitoringSnapshot | null> {
    if (!this.isConfigured() || !this.client) {
      return null;
    }

    try {
      const { data, error } = await this.client
        .from("agent_monitoring_snapshots")
        .select("*")
        .eq("monitoring_id", monitoringId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Não encontrado
        }
        throw error;
      }

      return data;
    } catch (error) {
      throw this.handleError(error, "getSnapshot");
    }
  }

  /**
   * Lista todos os snapshots ativos
   */
  async listActiveSnapshots(): Promise<MonitoringSnapshot[]> {
    if (!this.isConfigured() || !this.client) {
      return [];
    }

    try {
      const { data, error } = await this.client
        .from("agent_monitoring_snapshots")
        .select("*")
        .eq("active", true)
        .order("last_checked_at", { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      throw this.handleError(error, "listActiveSnapshots");
    }
  }
}
