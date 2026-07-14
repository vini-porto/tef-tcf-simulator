"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { TaskTemplate } from "@/lib/content-types";
import { type AttemptState, type PublicMcqQuestion, saveAttemptState } from "@/lib/client-state";
import type { SubmitResult, TaskViewHandle } from "./task-view-types";

interface ListeningTaskViewProps {
  state: AttemptState;
  taskTemplate: TaskTemplate;
  onCacheUpdate: (state: AttemptState) => void;
  onSubmitted: (result: SubmitResult) => void;
}

export const ListeningTaskView = forwardRef<TaskViewHandle, ListeningTaskViewProps>(
  function ListeningTaskView({ state, taskTemplate, onCacheUpdate, onSubmitted }, ref) {
    const [question, setQuestion] = useState<PublicMcqQuestion | null>(
      state.mcqQuestions[taskTemplate.id] ?? null,
    );
    const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const submittedRef = useRef(false);
    const selectedRef = useRef(selectedChoiceId);
    selectedRef.current = selectedChoiceId;

    useEffect(() => {
      if (question) return;
      let cancelled = false;
      fetch(`/api/mcq?taskTemplateId=${taskTemplate.id}&targetLevel=${state.targetLevel}`)
        .then(async (res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((q: PublicMcqQuestion) => {
          if (cancelled) return;
          setQuestion(q);
          const updated = { ...state, mcqQuestions: { ...state.mcqQuestions, [taskTemplate.id]: q } };
          saveAttemptState(updated);
          onCacheUpdate(updated);
        })
        .catch(() => {
          if (!cancelled) setError("Impossible de charger la question de cette tâche.");
        });
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskTemplate.id]);

    async function submitTask() {
      if (submittedRef.current || !question) return;
      // A timer expiry can call submit() with no choice selected — that's a
      // valid, scored-as-incorrect submission, same as leaving a writing task blank.
      submittedRef.current = true;
      setSubmitting(true);
      setError(null);

      const startedAt = state.taskStartedAt[taskTemplate.id] ?? Date.now();
      const timeSpentSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const choice = selectedRef.current;

      try {
        const res = await fetch("/api/mcq-submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionAttemptId: state.sectionAttemptId,
            taskTemplateId: taskTemplate.id,
            mcqQuestionId: question.id,
            selectedChoiceId: choice ?? "",
            timeSpentSeconds,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Échec de la soumission.");
        }
        const data = await res.json();
        onSubmitted({ sectionFinished: data.sectionFinished, nextSection: data.nextSection ?? null });
      } catch (e) {
        submittedRef.current = false;
        setSubmitting(false);
        setError(e instanceof Error ? e.message : "Erreur inconnue.");
      }
    }

    useImperativeHandle(ref, () => ({ submit: submitTask }));

    if (!question) {
      return <p className="text-sm text-slate-500">Chargement de la question…</p>;
    }

    return (
      <>
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-xs text-slate-500">{taskTemplate.instructionsTemplate}</p>
          <audio controls src={question.stimulusContent} className="w-full">
            Votre navigateur ne prend pas en charge la lecture audio.
          </audio>
          <h2 className="font-medium text-slate-900">{question.questionText}</h2>
        </div>

        <div className="space-y-2">
          {question.choices.map((choice) => (
            <label
              key={choice.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition ${
                selectedChoiceId === choice.id
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white hover:border-slate-400"
              } ${submitting ? "pointer-events-none opacity-60" : ""}`}
            >
              <input
                type="radio"
                name="mcq-choice"
                value={choice.id}
                checked={selectedChoiceId === choice.id}
                onChange={() => setSelectedChoiceId(choice.id)}
                disabled={submitting}
                className="sr-only"
              />
              {choice.text}
            </label>
          ))}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <button
          type="button"
          onClick={submitTask}
          disabled={submitting || !selectedChoiceId}
          className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {submitting ? "Envoi…" : "Valider et continuer"}
        </button>
      </>
    );
  },
);
