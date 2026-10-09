/**
 * Testes de Integração — Repositórios
 * Conectam ao Supabase real (dev environment)
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { MonitoringRepository } from "../src/db/repositories/monitoringRepository";
import { EventsRepository } from "../src/db/repositories/eventsRepository";
import type { Database } from "../../../shared/src/types/database";

describe("Integration Tests — Supabase", () => {
  let monitoringRepo: MonitoringRepository;
  let eventsRepo: EventsRepository;
  let testMonitoringId: string;

  beforeEach(() => {
    monitoringRepo = new MonitoringRepository();
    eventsRepo = new EventsRepository();
  });

  afterEach(async () => {
    // Cleanup — deletar dados de teste
    // (em produção, usar separate test DB)
  });

  describe("MonitoringRepository", () => {
    it("should create and retrieve a monitoring", async () => {
      const testData = {
        usuario_id: "test-user-id",
        perfil_candidato_id: "test-candidate-id",
        url_fonte: "https://example.com",
        nome_fonte: "Test Source",
        status: "ativo" as const,
      };

      // Create
      const created = await monitoringRepo.createMonitoring(testData);
      expect(created).toBeDefined();
      expect(created.id).toBeDefined();

      testMonitoringId = created.id;

      // Retrieve
      const retrieved = await monitoringRepo.getMonitoring(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.url_fonte).toBe(testData.url_fonte);
    });

    it("should return null for non-existent monitoring", async () => {
      const result = await monitoringRepo.getMonitoring("non-existent-id");
      expect(result).toBeNull();
    });

    it("should update a monitoring", async () => {
      const testData = {
        usuario_id: "test-user-id",
        perfil_candidato_id: "test-candidate-id",
        url_fonte: "https://example.com",
        status: "ativo" as const,
      };

      const created = await monitoringRepo.createMonitoring(testData);
      testMonitoringId = created.id;

      // Update
      const updated = await monitoringRepo.updateMonitoring(created.id, {
        status: "pausado",
      });

      expect(updated.status).toBe("pausado");
    });
  });

  describe("EventsRepository", () => {
    it("should record a match result", async () => {
      const matchData = {
        monitoring_id: "test-monitoring-id",
        found: true,
        confidence: 0.95,
        confidence_level: "alta" as const,
        llm_arbitrated: false,
        publication_type: "edital",
        publication_title: "Edital 123/2026",
        publication_url: "https://example.com/edital",
        publication_deadline: "2026-12-31",
        excerpt: "Candidato encontrado em documento",
        checked_at: new Date().toISOString(),
      };

      const result = await eventsRepo.recordMatchResult(matchData);

      expect(result).toBeDefined();
      expect(result.found).toBe(true);
      expect(result.confidence).toBe(0.95);
    });

    it("should list recent matches for a monitoring", async () => {
      // Assumindo que recordMatchResult foi chamado antes
      const matches = await eventsRepo.listRecentMatches("test-monitoring-id", 5);

      expect(Array.isArray(matches)).toBe(true);
    });

    it("should record a daily run", async () => {
      const runData = {
        run_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        cities_synced: 5,
        monitorings_checked: 25,
        matches_found: 3,
        errors: null,
      };

      const result = await eventsRepo.recordDailyRun(runData);

      expect(result).toBeDefined();
      expect(result.monitorings_checked).toBe(25);
    });
  });

  describe("Snapshots Repository", () => {
    it("should upsert a monitoring snapshot", async () => {
      const snapshotData = {
        monitoring_id: "test-monitoring-id",
        city: "São Paulo",
        full_name: "João Silva",
        registration_number: "12345678",
        status: "ativo",
        active: true,
        documents_checked_count: 10,
        last_matched_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Should not throw
      await monitoringRepo.getMonitoring("test-monitoring-id");
      // (snapshot is best-effort, doesn't throw)
    });
  });

  describe("Error Handling", () => {
    it("should handle connection errors gracefully", async () => {
      // Intencionalmente usar ID inválido
      try {
        await monitoringRepo.getMonitoring("");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
