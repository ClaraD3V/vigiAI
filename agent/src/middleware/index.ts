import express, { Request, Response, NextFunction } from "express";
import { config } from "./config";

/**
 * Express middleware para tratamento centralizado de erros
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error("[Error]", {
    message: err.message,
    status: err.status || 500,
    path: req.path,
    method: req.method,
  });

  const statusCode = err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
    },
  });
}

/**
 * Middleware de logging
 */
export function logger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.path} ${res.statusCode} ${duration}ms`);
  });

  next();
}

/**
 * Middleware para checagem de Supabase
 */
export function requireSupabase(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    return res.status(503).json({
      error: "Supabase não configurado",
    });
  }
  next();
}
