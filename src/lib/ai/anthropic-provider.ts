import Anthropic from "@anthropic-ai/sdk";
import { SCORING_SCHEMA } from "./schema";
import type { ScoringProvider } from "./types";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

const modelId = process.env.ANTHROPIC_SCORING_MODEL ?? "claude-opus-4-8";

export const anthropicProvider: ScoringProvider = {
  id: "anthropic",
  modelId,
  async score(system, userContent) {
    const response = await getClient().messages.create({
      model: modelId,
      max_tokens: 2048,
      system,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: SCORING_SCHEMA },
      },
      messages: [{ role: "user", content: userContent }],
    });

    if (response.stop_reason === "refusal") {
      throw new Error("La correction a été refusée par le modèle (Anthropic).");
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Aucune réponse de correction reçue (Anthropic).");
    }
    return textBlock.text;
  },
};
