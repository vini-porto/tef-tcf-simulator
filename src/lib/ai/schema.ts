// JSON Schema shared by every provider for structured scoring output.
// Kept as plain JSON Schema so it works unchanged as Anthropic's
// output_config.format.schema and Gemini's config.responseJsonSchema.

export const SCORING_SCHEMA = {
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
