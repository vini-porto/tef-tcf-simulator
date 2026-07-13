import { SCORING_SCHEMA } from "./schema";
import type { ScoringProvider } from "./types";

const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const modelId = process.env.OLLAMA_SCORING_MODEL ?? "llama3.1";

export const ollamaProvider: ScoringProvider = {
  id: "ollama",
  modelId,
  async score(system, userContent) {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelId,
        stream: false,
        format: SCORING_SCHEMA,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Erreur du serveur Ollama (${response.status}) à ${baseUrl} — vérifiez qu'Ollama est lancé et que le modèle "${modelId}" est disponible (ollama pull ${modelId}). ${detail}`,
      );
    }

    const data = (await response.json()) as { message?: { content?: string } };
    const text = data.message?.content;
    if (!text) {
      throw new Error("Aucune réponse de correction reçue (Ollama).");
    }
    return text;
  },
};
