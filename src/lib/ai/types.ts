// Provider-agnostic scoring types. Every AI provider (Anthropic, Gemini, ...)
// implements ScoringProvider and returns raw JSON text matching SCORING_SCHEMA
// (see ./schema.ts) — parsing/validation/clamping happens once in ./index.ts.

export interface ScoringOutput {
  linguistic: number;
  pragmatic: number;
  sociolinguistic: number | null;
  estimatedNclc: number;
  confidence: "low" | "medium" | "high";
  feedbackText: string;
  strengthsHighlighted: string[];
  improvementAreas: string[];
}

export interface ScoringProvider {
  id: string;
  modelId: string;
  /** Sends the rubric (system) + submission (userContent) and returns raw JSON text. */
  score(system: string, userContent: string): Promise<string>;
}
