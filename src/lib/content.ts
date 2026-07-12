// Loads the static content layer (versioned JSON under /content) — see docs/data-schema.md.
// No database involved here; these files are what community PRs touch.

import tefExamDefinitionJson from "../../content/tef/exam-definition.json";
import tefSectionJson from "../../content/tef/expression_ecrite/section.json";
import tefTaskTemplatesJson from "../../content/tef/expression_ecrite/task-templates.json";
import tefPromptsJson from "../../content/tef/expression_ecrite/prompts.json";

import tcfExamDefinitionJson from "../../content/tcf/exam-definition.json";
import tcfSectionJson from "../../content/tcf/expression_ecrite/section.json";
import tcfTaskTemplatesJson from "../../content/tcf/expression_ecrite/task-templates.json";
import tcfPromptsJson from "../../content/tcf/expression_ecrite/prompts.json";

import clbConversionTableJson from "../../content/clb-conversion-table.json";

import {
  CECR_LEVELS,
  type CLBConversionTable,
  type ExamDefinition,
  type ExamSection,
  type PromptItem,
  type TaskTemplate,
} from "./content-types";

const examDefinitions: Record<string, ExamDefinition> = {
  "tef-canada": tefExamDefinitionJson as ExamDefinition,
  "tcf-canada": tcfExamDefinitionJson as ExamDefinition,
};

const examSections: Record<string, ExamSection> = {
  "tef-expression-ecrite": tefSectionJson as ExamSection,
  "tcf-expression-ecrite": tcfSectionJson as ExamSection,
};

const taskTemplatesBySection: Record<string, TaskTemplate[]> = {
  "tef-expression-ecrite": tefTaskTemplatesJson as TaskTemplate[],
  "tcf-expression-ecrite": tcfTaskTemplatesJson as TaskTemplate[],
};

const allTaskTemplates: TaskTemplate[] = [
  ...(tefTaskTemplatesJson as TaskTemplate[]),
  ...(tcfTaskTemplatesJson as TaskTemplate[]),
];

const allPrompts: PromptItem[] = [
  ...(tefPromptsJson as PromptItem[]),
  ...(tcfPromptsJson as PromptItem[]),
];

const clbConversionTable = clbConversionTableJson as CLBConversionTable;

export function getExamDefinition(examId: string): ExamDefinition | undefined {
  return examDefinitions[examId];
}

export function listExamDefinitions(): ExamDefinition[] {
  return Object.values(examDefinitions);
}

export function getExamSection(sectionId: string): ExamSection | undefined {
  return examSections[sectionId];
}

export function getWritingSectionForExam(examId: string): ExamSection | undefined {
  const exam = getExamDefinition(examId);
  if (!exam) return undefined;
  return exam.sections.map(getExamSection).find((s) => s?.type === "expression_ecrite");
}

export function getTaskTemplatesForSection(sectionId: string): TaskTemplate[] {
  return [...(taskTemplatesBySection[sectionId] ?? [])].sort((a, b) => a.order - b.order);
}

export function getTaskTemplate(taskTemplateId: string): TaskTemplate | undefined {
  return allTaskTemplates.find((t) => t.id === taskTemplateId);
}

export function getApprovedPromptsForTask(taskTemplateId: string): PromptItem[] {
  return allPrompts.filter(
    (p) => p.taskTemplateId === taskTemplateId && p.reviewStatus === "approved",
  );
}

export function getPromptItem(promptItemId: string): PromptItem | undefined {
  return allPrompts.find((p) => p.id === promptItemId);
}

/**
 * Picks an approved prompt for a task template matching the target CECR level as
 * closely as possible (exact match preferred, otherwise nearest level, otherwise any).
 */
export function pickPromptForTask(
  taskTemplateId: string,
  targetLevel: string,
): PromptItem | undefined {
  const candidates = getApprovedPromptsForTask(taskTemplateId);
  if (candidates.length === 0) return undefined;

  const exact = candidates.filter((p) => p.cecrLevel === targetLevel);
  if (exact.length > 0) {
    return exact[Math.floor(Math.random() * exact.length)];
  }

  const targetIndex = CECR_LEVELS.indexOf(targetLevel as (typeof CECR_LEVELS)[number]);
  if (targetIndex === -1) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  const sorted = [...candidates].sort((a, b) => {
    const aDist = Math.abs(CECR_LEVELS.indexOf(a.cecrLevel as (typeof CECR_LEVELS)[number]) - targetIndex);
    const bDist = Math.abs(CECR_LEVELS.indexOf(b.cecrLevel as (typeof CECR_LEVELS)[number]) - targetIndex);
    return aDist - bDist;
  });

  return sorted[0];
}

export function getClbConversionTable(): CLBConversionTable {
  return clbConversionTable;
}
