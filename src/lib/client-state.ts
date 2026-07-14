"use client";

import type { MCQQuestion, PromptItem, TaskTemplate } from "./content-types";

// Shape returned by GET /api/mcq — the answer key and authoring-only
// dialogueScript are stripped server-side before reaching the client.
export type PublicMcqQuestion = Omit<MCQQuestion, "correctChoiceId" | "dialogueScript">;

const ANON_USER_KEY = "tef-tcf-anon-user-id";

export function getAnonUserId(): string {
  let id = localStorage.getItem(ANON_USER_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_USER_KEY, id);
  }
  return id;
}

const WALKTHROUGH_SEEN_KEY = "tef-tcf-walkthrough-seen";

export function hasSeenWalkthrough(): boolean {
  return localStorage.getItem(WALKTHROUGH_SEEN_KEY) === "true";
}

export function markWalkthroughSeen(): void {
  localStorage.setItem(WALKTHROUGH_SEEN_KEY, "true");
}

export interface AttemptState {
  attemptId: string;
  examId: string;
  targetLevel: string;
  sectionOrder: string[]; // all section ids for this exam, official order
  currentSectionId: string;
  // Everything below is scoped to currentSectionId and gets reset when
  // advancing to the next section (see advanceToSection below).
  sectionAttemptId: string;
  tasks: TaskTemplate[];
  prompts: Record<string, PromptItem>;
  mcqQuestions: Record<string, PublicMcqQuestion>;
  completedTaskIds: string[];
  taskStartedAt: Record<string, number>;
}

export function advanceToSection(
  state: AttemptState,
  next: { sectionId: string; sectionAttemptId: string; tasks: TaskTemplate[] },
): AttemptState {
  return {
    ...state,
    currentSectionId: next.sectionId,
    sectionAttemptId: next.sectionAttemptId,
    tasks: next.tasks,
    completedTaskIds: [],
    taskStartedAt: {},
  };
}

function storageKey(attemptId: string): string {
  return `tef-tcf-attempt:${attemptId}`;
}

export function saveAttemptState(state: AttemptState): void {
  sessionStorage.setItem(storageKey(state.attemptId), JSON.stringify(state));
}

export function loadAttemptState(attemptId: string): AttemptState | null {
  const raw = sessionStorage.getItem(storageKey(attemptId));
  if (!raw) return null;
  return JSON.parse(raw) as AttemptState;
}
