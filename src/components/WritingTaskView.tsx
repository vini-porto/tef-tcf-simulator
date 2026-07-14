"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { PromptItem, TaskTemplate } from "@/lib/content-types";
import { type AttemptState, saveAttemptState } from "@/lib/client-state";
import type { SubmitResult, TaskViewHandle } from "./task-view-types";

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

interface WritingTaskViewProps {
  state: AttemptState;
  taskTemplate: TaskTemplate;
  onCacheUpdate: (state: AttemptState) => void;
  onSubmitted: (result: SubmitResult) => void;
}

export const WritingTaskView = forwardRef<TaskViewHandle, WritingTaskViewProps>(
  function WritingTaskView({ state, taskTemplate, onCacheUpdate, onSubmitted }, ref) {
    const [prompt, setPrompt] = useState<PromptItem | null>(state.prompts[taskTemplate.id] ?? null);
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const submittedRef = useRef(false);
    const textRef = useRef(text);
    textRef.current = text;

    useEffect(() => {
      if (prompt) return;
      let cancelled = false;
      fetch(`/api/prompt?taskTemplateId=${taskTemplate.id}&targetLevel=${state.targetLevel}`)
        .then(async (res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((p: PromptItem) => {
          if (cancelled) return;
          setPrompt(p);
          const updated = { ...state, prompts: { ...state.prompts, [taskTemplate.id]: p } };
          saveAttemptState(updated);
          onCacheUpdate(updated);
        })
        .catch(() => {
          if (!cancelled) setError("Impossible de charger le sujet de cette tâche.");
        });
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskTemplate.id]);

    async function submitTask() {
      if (submittedRef.current || !prompt) return;
      submittedRef.current = true;
      setSubmitting(true);
      setError(null);

      const startedAt = state.taskStartedAt[taskTemplate.id] ?? Date.now();
      const timeSpentSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const finalText = textRef.current;
      const wc = wordCount(finalText);

      try {
        const res = await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionAttemptId: state.sectionAttemptId,
            taskTemplateId: taskTemplate.id,
            promptItemId: prompt.id,
            textResponse: finalText,
            wordCount: wc,
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

    if (!prompt) {
      return <p className="text-sm text-slate-500">Chargement du sujet…</p>;
    }

    const wc = wordCount(text);
    const wordCountOk = wc >= taskTemplate.minWords && wc <= taskTemplate.maxWords;

    return (
      <>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-medium text-slate-900">{prompt.title}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{prompt.promptText}</p>
          {prompt.contextDocuments?.map((doc, i) => (
            <div key={i} className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-medium text-slate-600">{doc.label}</p>
              <p className="mt-1 whitespace-pre-wrap">{doc.text}</p>
            </div>
          ))}
          <p className="mt-3 text-xs text-slate-500">{taskTemplate.instructionsTemplate}</p>
        </div>

        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={submitting}
            rows={14}
            placeholder="Rédigez votre réponse ici…"
            className="w-full rounded-lg border border-slate-300 p-4 font-serif text-sm leading-relaxed focus:border-slate-500 focus:outline-none disabled:bg-slate-50"
          />
          <div className="flex items-center justify-between text-xs">
            <span className={wordCountOk ? "text-emerald-600" : "text-slate-500"}>
              {wc} mots (min. {taskTemplate.minWords}, max. {taskTemplate.maxWords})
            </span>
            {error && <span className="text-red-600">{error}</span>}
          </div>
        </div>

        <button
          type="button"
          onClick={submitTask}
          disabled={submitting}
          className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {submitting ? "Correction en cours…" : "Soumettre et continuer"}
        </button>
      </>
    );
  },
);
