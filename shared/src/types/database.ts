/**
 * Database types - Gerado baseado no schema.sql
 * Alinhado com Supabase Auto-Generated Types
 */

export interface Database {
  public: {
    Tables: {
      perfis: {
        Row: {
          id: string;
          nome_completo: string | null;
          email: string | null;
          telefone: string | null;
          cpf: string | null;
          data_nascimento: string | null; // date
          criado_em: string; // timestamptz
          atualizado_em: string; // timestamptz
        };
        Insert: Omit<Database["public"]["Tables"]["perfis"]["Row"], "criado_em" | "atualizado_em">;
        Update: Partial<Database["public"]["Tables"]["perfis"]["Row"]>;
        Relationships: [];
      };

      planos: {
        Row: {
          id: string;
          nome: string;
          identificador: string;
          descricao: string | null;
          preco: number;
          periodo_cobranca: string;
          max_canais_notificacao: number;
          ativo: boolean;
          criado_em: string;
        };
        Insert: Omit<Database["public"]["Tables"]["planos"]["Row"], "id" | "criado_em">;
        Update: Partial<Database["public"]["Tables"]["planos"]["Row"]>;
        Relationships: [];
      };

      assinaturas: {
        Row: {
          id: string;
          usuario_id: string;
          plano_id: string;
          status: "teste" | "ativa" | "pausada" | "cancelada" | "expirada";
          iniciada_em: string;
          expira_em: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: Omit<Database["public"]["Tables"]["assinaturas"]["Row"], "id" | "criado_em" | "atualizado_em">;
        Update: Partial<Database["public"]["Tables"]["assinaturas"]["Row"]>;
        Relationships: [];
      };

      perfis_candidatos: {
        Row: {
          id: string;
          usuario_id: string;
          nome_completo: string;
          numero_inscricao: string | null;
          cpf: string | null;
          data_nascimento: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: Omit<Database["public"]["Tables"]["perfis_candidatos"]["Row"], "id" | "criado_em" | "atualizado_em">;
        Update: Partial<Database["public"]["Tables"]["perfis_candidatos"]["Row"]>;
        Relationships: [];
      };

      monitoramentos: {
        Row: {
          id: string;
          usuario_id: string;
          perfil_candidato_id: string;
          url_fonte: string;
          nome_fonte: string | null;
          status: "pendente" | "ativo" | "pausado" | "concluido" | "erro";
          verificado_em: string | null;
          ultima_ocorrencia_em: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: Omit<Database["public"]["Tables"]["monitoramentos"]["Row"], "id" | "criado_em" | "atualizado_em">;
        Update: Partial<Database["public"]["Tables"]["monitoramentos"]["Row"]>;
        Relationships: [];
      };

      canais_notificacao: {
        Row: {
          id: string;
          usuario_id: string;
          tipo: "whatsapp" | "telegram" | "instagram";
          destino: string;
          verificado: boolean;
          ativo: boolean;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: Omit<Database["public"]["Tables"]["canais_notificacao"]["Row"], "id" | "criado_em" | "atualizado_em">;
        Update: Partial<Database["public"]["Tables"]["canais_notificacao"]["Row"]>;
        Relationships: [];
      };

      monitoramentos_canais_notificacao: {
        Row: {
          monitoramento_id: string;
          canal_notificacao_id: string;
          criado_em: string;
        };
        Insert: Omit<Database["public"]["Tables"]["monitoramentos_canais_notificacao"]["Row"], "criado_em">;
        Update: Partial<Database["public"]["Tables"]["monitoramentos_canais_notificacao"]["Row"]>;
        Relationships: [];
      };

      eventos_monitoramento: {
        Row: {
          id: string;
          monitoramento_id: string;
          tipo_evento: "ocorrencia_encontrada" | "nova_publicacao" | "status_alterado" | "erro";
          titulo: string | null;
          descricao: string | null;
          url_fonte: string | null;
          valor_correspondente: string | null;
          detectado_em: string;
          notificado_em: string | null;
          criado_em: string;
        };
        Insert: Omit<Database["public"]["Tables"]["eventos_monitoramento"]["Row"], "id" | "criado_em">;
        Update: Partial<Database["public"]["Tables"]["eventos_monitoramento"]["Row"]>;
        Relationships: [];
      };

      logs_auditoria: {
        Row: {
          id: string;
          usuario_id: string;
          acao: string;
          tipo_recurso: string | null;
          id_recurso: string | null;
          metadados: Record<string, unknown>;
          criado_em: string;
        };
        Insert: Omit<Database["public"]["Tables"]["logs_auditoria"]["Row"], "id" | "criado_em">;
        Update: Partial<Database["public"]["Tables"]["logs_auditoria"]["Row"]>;
        Relationships: [];
      };

      // Agent tables (dashboard leitura)
      agent_daily_runs: {
        Row: {
          id: string;
          run_at: string;
          finished_at: string | null;
          cities_synced: number | null;
          monitorings_checked: number | null;
          matches_found: number | null;
          errors: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["agent_daily_runs"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["agent_daily_runs"]["Row"]>;
        Relationships: [];
      };

      agent_monitoring_snapshots: {
        Row: {
          monitoring_id: string;
          city: string | null;
          full_name: string | null;
          registration_number: string | null;
          status: string | null;
          active: boolean | null;
          documents_checked_count: number | null;
          last_matched_at: string | null;
          last_checked_at: string | null;
          updated_at: string | null;
        };
        Insert: Database["public"]["Tables"]["agent_monitoring_snapshots"]["Row"];
        Update: Partial<Database["public"]["Tables"]["agent_monitoring_snapshots"]["Row"]>;
        Relationships: [];
      };

      agent_match_results: {
        Row: {
          id: string;
          monitoring_id: string;
          found: boolean;
          confidence: number;
          confidence_level: "baixa" | "media" | "alta" | null;
          llm_arbitrated: boolean;
          publication_type: string | null;
          publication_title: string | null;
          publication_url: string | null;
          publication_deadline: string | null;
          excerpt: string | null;
          checked_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["agent_match_results"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["agent_match_results"]["Row"]>;
        Relationships: [];
      };
    };

    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, unknown>;
    CompositeTypes: Record<string, unknown>;
  };
}
