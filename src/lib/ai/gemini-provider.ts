import { GoogleGenAI } from "@google/genai";
import { SCORING_SCHEMA } from "./schema";
import type { ScoringProvider } from "./types";

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY manquant — requis quand AI_PROVIDER=gemini.");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

const modelId = process.env.GEMINI_SCORING_MODEL ?? "gemini-flash-latest";

export const geminiProvider: ScoringProvider = {
  id: "gemini",
  modelId,
  async score(system, userContent) {
    const response = await getClient().models.generateContent({
      model: modelId,
      contents: userContent,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        responseJsonSchema: SCORING_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Aucune réponse de correction reçue (Gemini).");
    }
    return text;
  },
};
