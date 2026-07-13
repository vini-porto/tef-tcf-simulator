import type { TaskTemplate, PromptItem } from "../content-types";
import { OFFICIAL_DISCLAIMER } from "../content-types";
import { anthropicProvider } from "./anthropic-provider";
import { geminiProvider } from "./gemini-provider";
import { ollamaProvider } from "./ollama-provider";
import { buildScoringPrompt } from "./prompt";
import type { ScoringOutput, ScoringProvider } from "./types";

const PROVIDERS: Record<string, ScoringProvider> = {
  anthropic: anthropicProvider,
  gemini: geminiProvider,
  ollama: ollamaProvider,
};

const activeProviderId = process.env.AI_PROVIDER ?? "anthropic";
const activeProvider = PROVIDERS[activeProviderId];
if (!activeProvider) {
  throw new Error(
    `AI_PROVIDER invalide: "${activeProviderId}". Options disponibles: ${Object.keys(PROVIDERS).join(", ")}.`,
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export async function scoreWritingTask(params: {
  taskTemplate: TaskTemplate;
  promptItem: PromptItem;
  textResponse: string;
  wordCount: number;
  wordCountMet: boolean;
}): Promise<ScoringOutput> {
  const { system, userContent } = buildScoringPrompt(params);
  const rawText = await activeProvider.score(system, userContent);
  const parsed = JSON.parse(rawText) as ScoringOutput;

  return {
    linguistic: clamp(parsed.linguistic, 0, 10),
    pragmatic: clamp(parsed.pragmatic, 0, 10),
    sociolinguistic:
      parsed.sociolinguistic == null ? null : clamp(parsed.sociolinguistic, 0, 10),
    estimatedNclc: clamp(parsed.estimatedNclc, 1, 10),
    confidence: parsed.confidence,
    feedbackText: parsed.feedbackText,
    strengthsHighlighted: parsed.strengthsHighlighted,
    improvementAreas: parsed.improvementAreas,
  };
}

export const SCORING_PROVIDER_ID = activeProvider.id;
export const SCORING_MODEL = activeProvider.modelId;
export { OFFICIAL_DISCLAIMER };
