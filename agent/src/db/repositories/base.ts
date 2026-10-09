import { SupabaseClientService } from "./client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../shared/src/types/database";

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}

/**
 * Base Repository — Padrão abstrato para acesso a dados
 * Fornece tratamento de erro centralizado e logging
 */
export abstract class BaseRepository {
  protected client: SupabaseClient<Database> | null;

  constructor() {
    this.client = SupabaseClientService.getInstance();
  }

  /**
   * Verifica se Supabase está configurado
   */
  protected isConfigured(): boolean {
    return SupabaseClientService.isConfigured();
  }

  /**
   * Trata erros comuns de repositório
   */
  protected handleError(error: unknown, context: string): RepositoryError {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido no repositório";

    console.error(`[${this.constructor.name}/${context}] ${message}`, error);

    return new RepositoryError(`Falha ao executar ${context}`, context, error);
  }

  /**
   * Log estruturado
   */
  protected log(level: "info" | "warn" | "error", message: string, data?: unknown): void {
    const prefix = `[${this.constructor.name}]`;
    switch (level) {
      case "info":
        console.log(prefix, message, data);
        break;
      case "warn":
        console.warn(prefix, message, data);
        break;
      case "error":
        console.error(prefix, message, data);
        break;
    }
  }
}
