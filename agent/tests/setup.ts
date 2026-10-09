/**
 * Jest Setup — executado antes dos testes
 */

// Carregar .env
import "dotenv/config";

// Mock de variáveis de ambiente para testes
beforeAll(() => {
  process.env.NODE_ENV = "test";
});
