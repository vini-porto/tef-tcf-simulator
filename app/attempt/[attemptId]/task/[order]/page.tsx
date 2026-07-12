"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { PromptItem, TaskTemplate } from "@/lib/content-types";
import { type AttemptState, loadAttemptState, saveAttemptState } from "@/lib/client-state";

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TaskPage() {
  const router = useRouter();
  const params = useParams<{ attemptId: string; order: string }>();
  const attemptId = params.attemptId;
  const order = Number(params.order);

  const [state, setState] = useState<AttemptState | null>(null);
  const [taskTemplate, setTaskTemplate] = useState<TaskTemplate | null>(null);
  const [prompt, setPrompt] = useState<PromptItem | null>(null);
  const [text, setText] = useState("");
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const textRef = useRef(text);
  textRef.current = text;

  // Block browser back navigation — the real exam never allows going back.
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const onPopState = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const loaded = loadAttemptState(attemptId);
    if (!loaded) {
      router.replace("/");
      return;
    }

    const nextOrder = loaded.completedTaskIds.length + 1;
    if (nextOrder > loaded.tasks.length) {
      router.replace(`/attempt/${attemptId}/results`);
      return;
    }
    if (order !== nextOrder) {
      router.replace(`/attempt/${attemptId}/task/${nextOrder}`);
      return;
    }

    const foundTask = loaded.tasks.find((t) => t.order === order);
    if (!foundTask) {
      router.replace(`/attempt/${attemptId}/results`);
      return;
    }
    const task: TaskTemplate = foundTask;

    setState(loaded);
    setTaskTemplate(task);

    async function ensurePrompt(current: AttemptState) {
      let p = current.prompts[task.id];
      if (!p) {
        const res = await fetch(
          `/api/prompt?taskTemplateId=${task.id}&targetLevel=${current.targetLevel}`,
        );
        if (!res.ok) {
          setError("Impossible de charger le sujet de cette tâche.");
          return;
        }
        p = await res.json();
        current.prompts[task.id] = p;
        saveAttemptState(current);
      }
      setPrompt(p);

      let startedAt = current.taskStartedAt[task.id];
      if (!startedAt) {
        startedAt = Date.now();
        current.taskStartedAt[task.id] = startedAt;
        saveAttemptState(current);
      }
      setDeadlineAt(startedAt + task.durationMin * 60 * 1000);
    }

    ensurePrompt(loaded);
  }, [attemptId, order, router]);

  async function submitTask() {
    if (submittedRef.current || !state || !taskTemplate || !prompt) return;
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

      const updated: AttemptState = {
        ...state,
        completedTaskIds: [...state.completedTaskIds, taskTemplate.id],
      };
      saveAttemptState(updated);

      const nextOrder = updated.completedTaskIds.length + 1;
      if (nextOrder > updated.tasks.length) {
        router.push(`/attempt/${attemptId}/results`);
      } else {
        router.push(`/attempt/${attemptId}/task/${nextOrder}`);
      }
    } catch (e) {
      submittedRef.current = false;
      setSubmitting(false);
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
    }
  }

  const submitRef = useRef(submitTask);
  submitRef.current = submitTask;

  useEffect(() => {
    if (deadlineAt === null) return;
    const tick = () => {
      const remaining = Math.max(0, Math.round((deadlineAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        submitRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineAt]);

  if (!taskTemplate || !prompt || secondsLeft === null) {
    return <p className="text-sm text-slate-500">Chargement de la tâche…</p>;
  }

  const wc = wordCount(text);
  const wordCountOk = wc >= taskTemplate.minWords && wc <= taskTemplate.maxWords;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Tâche {taskTemplate.order} — {taskTemplate.type}
          </p>
          <p className="text-xs text-slate-400">
            Registre attendu : {taskTemplate.register} · {taskTemplate.minWords}-
            {taskTemplate.maxWords} mots
          </p>
        </div>
        <div
          className={`rounded-md px-3 py-1.5 font-mono text-sm ${
            secondsLeft < 30 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
          }`}
        >
          {formatTime(secondsLeft)}
        </div>
      </div>

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
      <p className="text-xs text-slate-400">
        Aucun retour en arrière possible, conformément au format réel de l&rsquo;examen.
      </p>
    </div>
  );
}
