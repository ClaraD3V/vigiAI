import express from "express";
import { config } from "./config";
import { logger, errorHandler, requireSupabase } from "./middleware";
import monitoringRoutes from "./routes/monitoring";

const app = express();

// Middleware
app.use(express.json());
app.use(logger);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    environment: config.environment,
  });
});

// Routes
app.use("/api/monitoramentos", requireSupabase, monitoringRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler (deve ser o último)
app.use(errorHandler);

// Start server
const PORT = config.port;

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`[Agent] Rodando em http://localhost:${PORT}`);
    console.log(`[Environment] ${config.environment}`);
    console.log(
      `[Supabase] ${config.supabase.url ? "Configurado" : "Não configurado"}`
    );
  });
}

export default app;
