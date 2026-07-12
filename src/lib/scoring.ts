import Anthropic from "@anthropic-ai/sdk";
import { OFFICIAL_DISCLAIMER, type TaskTemplate, type PromptItem } from "./content-types";

const client = new Anthropic();

const SCORING_MODEL = process.env.ANTHROPIC_SCORING_MODEL ?? "claude-opus-4-8";

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

const SCORING_SCHEMA = {
  type: "object",
  properties: {
    linguistic: { type: "number", description: "0-10 score: vocabulary, grammar, spelling" },
    pragmatic: { type: "number", description: "0-10 score: coherence, task adequacy" },
    sociolinguistic: {
      type: "number",
      description: "0-10 score: tu/vous register, social adequacy",
    },
    estimatedNclc: { type: "number", description: "Estimated NCLC/CLB level, 1-10" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    feedbackText: { type: "string", description: "Qualitative feedback in French, 2-4 sentences" },
    strengthsHighlighted: { type: "array", items: { type: "string" } },
    improvementAreas: { type: "array", items: { type: "string" } },
  },
  required: [
    "linguistic",
    "pragmatic",
    "sociolinguistic",
    "estimatedNclc",
    "confidence",
    "feedbackText",
    "strengthsHighlighted",
    "improvementAreas",
  ],
  additionalProperties: false,
} as const;

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
  const { taskTemplate, promptItem, textResponse, wordCount, wordCountMet } = params;

  const system = `Tu es un correcteur expert des examens de français TEF Canada et TCF Canada, utilisé dans un simulateur non officiel et indépendant.
Tu évalues des productions écrites de candidats selon les critères officiels d'évaluation (linguistique, pragmatique, sociolinguistique) et tu estimes un niveau NCLC/CLB (1 à 10+).
Sois rigoureux, bienveillant et concret dans tes retours. Le feedback doit être rédigé en français.
Si le nombre de mots minimum n'a pas été atteint, cela doit fortement pénaliser le score, en particulier le score pragmatique.
Ne dépasse jamais 10 pour les sous-scores. Auto-évalue ta confiance ("low"/"medium"/"high") selon la longueur et la clarté du texte fourni.`;

  const userContent = `Type de tâche: ${taskTemplate.type}
Niveau CECR visé: ${taskTemplate.cecrLevelRange[0]} à ${taskTemplate.cecrLevelRange[1]}
Registre attendu: ${taskTemplate.register}
Critères d'évaluation: ${taskTemplate.evaluationCriteria.join(", ")}

Consigne de la tâche: ${taskTemplate.instructionsTemplate}

Sujet proposé au candidat: ${promptItem.title}
${promptItem.promptText}
${
  promptItem.contextDocuments
    ?.map((doc) => `\n${doc.label}: ${doc.text}`)
    .join("") ?? ""
}

Nombre de mots requis: entre ${taskTemplate.minWords} et ${taskTemplate.maxWords} (obtenu: ${wordCount}, minimum atteint: ${wordCountMet ? "oui" : "non"})

--- Réponse du candidat ---
${textResponse}
--- Fin de la réponse ---`;

  const response = await client.messages.create({
    model: SCORING_MODEL,
    max_tokens: 2048,
    system,
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: SCORING_SCHEMA },
    },
    messages: [{ role: "user", content: userContent }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("La correction a été refusée par le modèle.");
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Aucune réponse de correction reçue.");
  }

  const parsed = JSON.parse(textBlock.text) as ScoringOutput;

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

export { SCORING_MODEL, OFFICIAL_DISCLAIMER };
