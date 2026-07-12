// Static content types — mirrors docs/data-schema.md section 1.
// These describe the JSON files versioned under /content, not database rows.

export type ExamType = "TEF" | "TCF";

export interface ExamDefinition {
  id: string; // "tef-canada" | "tcf-canada"
  examType: ExamType;
  displayName: string;
  version: string;
  totalDurationMin: number;
  sections: string[]; // ExamSection ids, official order
  officialSource?: string;
  disclaimer: string;
}

export type SectionType =
  | "comprehension_orale"
  | "comprehension_ecrite"
  | "expression_ecrite"
  | "expression_orale";

export interface ExamSection {
  id: string;
  examId: string;
  type: SectionType;
  durationMin: number;
  taskTemplateIds: string[];
  allowBacktrack: boolean;
  toolsAllowed: {
    dictionary: boolean;
    spellcheck: boolean;
  };
}

export type TaskType =
  | "message"
  | "narrative"
  | "argumentative_synthesis"
  | "argumentative_essay";

export type Register = "tu" | "vous" | "either";

export interface TaskTemplate {
  id: string;
  sectionId: string;
  order: number;
  type: TaskType;
  durationMin: number;
  minWords: number;
  maxWords: number;
  register: Register;
  cecrLevelRange: [string, string];
  instructionsTemplate: string;
  evaluationCriteria: string[];
}

export type CreatedBy = "ai-generated" | "community" | "maintainer";
export type ReviewStatus = "draft" | "approved" | "flagged";

export interface PromptItem {
  id: string;
  taskTemplateId: string;
  cecrLevel: string;
  title: string;
  promptText: string;
  contextDocuments?: {
    label: string;
    text: string;
  }[];
  tags: string[];
  createdBy: CreatedBy;
  reviewStatus: ReviewStatus;
  contributionId?: string;
}

export interface MCQChoice {
  id: string;
  text: string;
}

export interface MCQQuestion {
  id: string;
  taskTemplateId: string;
  cecrLevel: string;
  stimulusType: "text" | "audio";
  stimulusContent: string;
  questionText: string;
  choices: MCQChoice[];
  correctChoiceId: string;
  createdBy: CreatedBy;
  reviewStatus: ReviewStatus;
}

export interface CLBConversionEntry {
  examType: ExamType;
  sectionType: SectionType;
  rawScoreMin: number;
  rawScoreMax: number;
  nclcLevel: number;
  clbLevel: number;
}

export type CLBConversionTable = CLBConversionEntry[];

// CECR levels used across the app, ordered lowest to highest.
export const CECR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CecrLevel = (typeof CECR_LEVELS)[number];

export const OFFICIAL_DISCLAIMER =
  "Estimation non officielle. Ne remplace pas l'évaluation officielle de l'examen.";
