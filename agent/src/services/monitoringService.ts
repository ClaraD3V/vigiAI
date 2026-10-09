import { MonitoringRepository, EventsRepository, SnapshotsRepository } from "../db";
import type { Database } from "../../../shared/src/types/database";
import type { CreateMonitoringRequest, MatchResultPayload } from "../../../shared/src/types/api";

type Monitoring = Database["public"]["Tables"]["monitoramentos"]["Row"];

/**
 * Service de Monitoramento
 * Orquestra lógica de negócio entre repositórios
 */
export class MonitoringService {
  private monitoringRepo: MonitoringRepository;
  private eventsRepo: EventsRepository;
  private snapshotsRepo: SnapshotsRepository;

  constructor() {
    this.monitoringRepo = new MonitoringRepository();
    this.eventsRepo = new EventsRepository();
    this.snapshotsRepo = new SnapshotsRepository();
  }

  /**
   * Cria novo monitoramento
   */
  async createMonitoring(request: CreateMonitoringRequest): Promise<Monitoring> {
    return this.monitoringRepo.createMonitoring({
      usuario_id: request.usuarioId,
      perfil_candidato_id: request.perfilCandidatoId,
      url_fonte: request.urlFonte,
      nome_fonte: request.nomeFonte,
      status: "pendente",
    });
  }

  /**
   * Obtém monitoramento com histórico recente
   */
  async getMonitoringDetail(monitoringId: string) {
    const monitoring = await this.monitoringRepo.getMonitoring(monitoringId);
    if (!monitoring) return null;

    const candidato = await this.monitoringRepo.getCandidateProfile(
      monitoring.perfil_candidato_id
    );
    const recentMatches = await this.eventsRepo.listRecentMatches(monitoringId, 5);

    return {
      id: monitoring.id,
      usuarioId: monitoring.usuario_id,
      perfilCandidato: candidato
        ? {
            id: candidato.id,
            nomeCompleto: candidato.nome_completo,
            numeroInscricao: candidato.numero_inscricao || undefined,
          }
        : undefined,
      urlFonte: monitoring.url_fonte,
      nomeFonte: monitoring.nome_fonte || undefined,
      status: monitoring.status,
      ultimaOcorrencia: monitoring.ultima_ocorrencia_em || undefined,
      recentMatches: recentMatches.map((m) => ({
        id: m.id || "",
        encontrado: m.found,
        confianca: m.confidence,
        titulo: m.publication_title || undefined,
      })),
    };
  }

  /**
   * Lista monitoramentos ativos para processamento
   */
  async listActiveMonitorings() {
    return this.monitoringRepo.listActiveMonitorings();
  }

  /**
   * Atualiza snapshot de monitoramento
   */
  async updateSnapshot(monitoringId: string, data: {
    cidade?: string;
    nomeCompleto?: string;
    status?: string;
    ativo?: boolean;
    documentosChecados?: number;
    ultimoMatchEm?: string;
  }) {
    await this.snapshotsRepo.upsertSnapshot({
      monitoring_id: monitoringId,
      city: data.cidade,
      full_name: data.nomeCompleto,
      status: data.status,
      active: data.ativo,
      documents_checked_count: data.documentosChecados,
      last_matched_at: data.ultimoMatchEm || null,
      last_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Registra resultado de matching
   */
  async recordMatchResult(payload: MatchResultPayload) {
    const result = await this.eventsRepo.recordMatchResult({
      monitoring_id: payload.monitoringId,
      found: payload.encontrado,
      confidence: payload.confianca,
      confidence_level: payload.nivelConfianca,
      llm_arbitrated: payload.arbitradoPorLLM || false,
      publication_type: payload.publicacao.tipo,
      publication_title: payload.publicacao.titulo,
      publication_url: payload.publicacao.url,
      publication_deadline: payload.publicacao.prazo || null,
      excerpt: payload.evidencia?.trecho || null,
      checked_at: new Date().toISOString(),
    });

    // Se encontrou match, atualiza ultima_ocorrencia
    if (payload.encontrado) {
      await this.monitoringRepo.updateMonitoring(payload.monitoringId, {
        ultima_ocorrencia_em: new Date().toISOString(),
      });
    }

    return result;
  }
}
