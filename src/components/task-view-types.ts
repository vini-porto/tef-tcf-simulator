import type { TaskTemplate } from "@/lib/content-types";

export interface SubmitResult {
  sectionFinished: boolean;
  nextSection: { sectionId: string; sectionAttemptId: string; tasks: TaskTemplate[] } | null;
}

// Lets the parent task page force a submit when the timer runs out, regardless
// of which view (writing editor / listening MCQ) is currently rendered.
export interface TaskViewHandle {
  submit: () => void;
}
