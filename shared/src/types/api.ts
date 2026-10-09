/**
 * Tipos de API para serviços
 */

export interface CreateMonitoringRequest {
  usuarioId: string;
  perfilCandidatoId: string;
  urlFonte: string;
  nomeFonte?: string;
}

export interface CreateMonitoringResponse {
  id: string;
  status: "pendente" | "ativo";
  criado_em: string;
}

export interface MonitoringDetail {
  id: string;
  usuarioId: string;
  perfilCandidato: {
    id: string;
    nomeCompleto: string;
    numeroInscricao?: string;
  };
  urlFonte: string;
  nomeFonte?: string;
  status: string;
  ultimaOcorrencia?: string;
  recentMatches?: Array<{
    id: string;
    encontrado: boolean;
    confianca: number;
    titulo?: string;
  }>;
}

export interface MatchResultPayload {
  monitoringId: string;
  encontrado: boolean;
  confianca: number;
  nivelConfianca: "baixa" | "media" | "alta";
  publicacao: {
    tipo: string;
    titulo: string;
    url: string;
    prazo?: string;
  };
  arbitradoPorLLM?: boolean;
  evidencia?: {
    trecho: string;
  };
}
