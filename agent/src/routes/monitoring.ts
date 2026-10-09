import express, { Router, Request, Response } from "express";
import { MonitoringService } from "../services/monitoringService";
import type { CreateMonitoringRequest } from "../../../shared/src/types/api";

const router = Router();
const monitoringService = new MonitoringService();

/**
 * POST /api/monitoramentos
 * Criar novo monitoramento
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const request = req.body as CreateMonitoringRequest;

    const monitoring = await monitoringService.createMonitoring(request);

    res.status(201).json({
      id: monitoring.id,
      status: monitoring.status,
      criado_em: monitoring.criado_em,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar monitoramento";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/monitoramentos/:id
 * Obter monitoramento com histórico
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const monitoring = await monitoringService.getMonitoringDetail(req.params.id);

    if (!monitoring) {
      return res.status(404).json({ error: "Monitoramento não encontrado" });
    }

    res.json(monitoring);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao buscar monitoramento";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/monitoramentos/:id/executar
 * Força execução imediata do monitoramento
 */
router.post("/:id/executar", async (req: Request, res: Response) => {
  try {
    // TODO: Trigger de execução imediata
    res.json({
      message: "Monitoramento agendado para execução",
      monitoringId: req.params.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao executar monitoramento";
    res.status(500).json({ error: message });
  }
});

export default router;
