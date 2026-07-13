"use client";

import type { PromptItem, TaskTemplate } from "./content-types";

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
  sectionAttemptId: string;
  examId: string;
  targetLevel: string;
  tasks: TaskTemplate[];
  prompts: Record<string, PromptItem>;
  completedTaskIds: string[];
  taskStartedAt: Record<string, number>;
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
