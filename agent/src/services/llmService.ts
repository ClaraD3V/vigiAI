import { config } from "../config";

/**
 * Service para LLM (OpenRouter)
 * Classifica publicações e arbitra confiança de matching
 */
export class LLMService {
  /**
   * Classifica se uma publicação pode ser relevante para um candidato
   */
  async classifyPublication(candidateName: string, publicationText: string): Promise<{
    relevant: boolean;
    confidence: number;
    explanation: string;
  }> {
    if (!config.openrouter.apiKey) {
      return {
        relevant: false,
        confidence: 0,
        explanation: "LLM não configurado",
      };
    }

    // TODO: Implementar chamada a OpenRouter
    // Por enquanto, placeholder
    return {
      relevant: false,
      confidence: 0,
      explanation: "Placeholder — implementar OpenRouter integration",
    };
  }

  /**
   * Arbitra confiança entre multiple matching strategies
   */
  async arbitrateMatchConfidence(
    candidateName: string,
    publicationText: string,
    initialConfidence: number
  ): Promise<number> {
    if (!config.openrouter.apiKey) {
      return initialConfidence;
    }

    // TODO: Implementar arbitration via LLM
    return initialConfidence;
  }
}
