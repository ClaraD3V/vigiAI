import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../shared/src/types/database";
import { config } from "../config";

/**
 * Singleton Supabase Client para backend (service role)
 * Nunca deve ser exposto no frontend
 */
export class SupabaseClientService {
  private static instance: SupabaseClient<Database> | null = null;

  static getInstance(): SupabaseClient<Database> | null {
    if (!SupabaseClientService.isConfigured()) {
      return null;
    }

    if (!this.instance) {
      this.instance = createClient<Database>(
        config.supabase.url,
        config.supabase.serviceRoleKey
      );
    }

    return this.instance;
  }

  static isConfigured(): boolean {
    return Boolean(config.supabase.url && config.supabase.serviceRoleKey);
  }

  /**
   * Reset para testes
   */
  static reset(): void {
    this.instance = null;
  }
}

export const supabase = SupabaseClientService.getInstance();
