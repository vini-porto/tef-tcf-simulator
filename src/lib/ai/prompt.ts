import type { TaskTemplate, PromptItem } from "../content-types";

export function buildScoringPrompt(params: {
  taskTemplate: TaskTemplate;
  promptItem: PromptItem;
  textResponse: string;
  wordCount: number;
  wordCountMet: boolean;
}): { system: string; userContent: string } {
  const { taskTemplate, promptItem, textResponse, wordCount, wordCountMet } = params;

  const system = `Tu es un correcteur expert des examens de français TEF Canada et TCF Canada, utilisé dans un simulateur non officiel et indépendant.
Tu évalues des productions écrites de candidats selon les critères officiels d'évaluation (linguistique, pragmatique, sociolinguistique) et tu estimes un niveau NCLC/CLB (1 à 10+).
Sois rigoureux, bienveillant et concret dans tes retours. Le feedback doit être rédigé en français.
Si le nombre de mots minimum n'a pas été atteint, cela doit fortement pénaliser le score, en particulier le score pragmatique.
Ne dépasse jamais 10 pour les sous-scores. Auto-évalue ta confiance ("low"/"medium"/"high") selon la longueur et la clarté du texte fourni.
Réponds uniquement avec un objet JSON conforme au schéma fourni, sans texte additionnel.`;

  const userContent = `Type de tâche: ${taskTemplate.type}
Niveau CECR visé: ${taskTemplate.cecrLevelRange[0]} à ${taskTemplate.cecrLevelRange[1]}
Registre attendu: ${taskTemplate.register}
Critères d'évaluation: ${taskTemplate.evaluationCriteria.join(", ")}

Consigne de la tâche: ${taskTemplate.instructionsTemplate}

Sujet proposé au candidat: ${promptItem.title}
${promptItem.promptText}
${
  promptItem.contextDocuments?.map((doc) => `\n${doc.label}: ${doc.text}`).join("") ?? ""
}

Nombre de mots requis: entre ${taskTemplate.minWords} et ${taskTemplate.maxWords} (obtenu: ${wordCount}, minimum atteint: ${wordCountMet ? "oui" : "non"})

--- Réponse du candidat ---
${textResponse}
--- Fin de la réponse ---`;

  return { system, userContent };
}
