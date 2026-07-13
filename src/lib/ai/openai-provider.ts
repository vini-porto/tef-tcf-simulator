import OpenAI from "openai";
import { SCORING_SCHEMA } from "./schema";
import type { ScoringProvider } from "./types";

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) client = new OpenAI();
  return client;
}

const modelId = process.env.OPENAI_SCORING_MODEL ?? "gpt-5";

export const openaiProvider: ScoringProvider = {
  id: "openai",
  modelId,
  async score(system, userContent) {
    const response = await getClient().chat.completions.create({
      model: modelId,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "scoring_result", strict: true, schema: SCORING_SCHEMA },
      },
    });

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new Error("Aucune réponse de correction reçue (OpenAI).");
    }
    return text;
  },
};
