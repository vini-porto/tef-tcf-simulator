"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { TaskTemplate } from "@/lib/content-types";
import { type AttemptState, advanceToSection, loadAttemptState, saveAttemptState } from "@/lib/client-state";
import { WritingTaskView } from "@/components/WritingTaskView";
import { ListeningTaskView } from "@/components/ListeningTaskView";
import type { SubmitResult, TaskViewHandle } from "@/components/task-view-types";

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TaskPage() {
  const router = useRouter();
  const params = useParams<{ attemptId: string; sectionId: string; order: string }>();
  const attemptId = params.attemptId;
  const sectionId = params.sectionId;
  const order = Number(params.order);

  const [state, setState] = useState<AttemptState | null>(null);
  const [taskTemplate, setTaskTemplate] = useState<TaskTemplate | null>(null);
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const viewRef = useRef<TaskViewHandle>(null);

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

    if (loaded.currentSectionId !== sectionId) {
      const correctOrder = loaded.completedTaskIds.length + 1;
      router.replace(`/attempt/${attemptId}/section/${loaded.currentSectionId}/task/${correctOrder}`);
      return;
    }

    const nextOrder = loaded.completedTaskIds.length + 1;
    if (nextOrder > loaded.tasks.length) {
      router.replace(`/attempt/${attemptId}/results`);
      return;
    }
    if (order !== nextOrder) {
      router.replace(`/attempt/${attemptId}/section/${sectionId}/task/${nextOrder}`);
      return;
    }

    const foundTask = loaded.tasks.find((t) => t.order === order);
    if (!foundTask) {
      router.replace(`/attempt/${attemptId}/results`);
      return;
    }

    setState(loaded);
    setTaskTemplate(foundTask);

    let startedAt = loaded.taskStartedAt[foundTask.id];
    if (!startedAt) {
      startedAt = Date.now();
      loaded.taskStartedAt[foundTask.id] = startedAt;
      saveAttemptState(loaded);
    }
    setDeadlineAt(startedAt + foundTask.durationMin * 60 * 1000);
  }, [attemptId, sectionId, order, router]);

  function handleSubmitted(taskId: string, result: SubmitResult) {
    setState((current) => {
      if (!current) return current;
      const updated: AttemptState = {
        ...current,
        completedTaskIds: [...current.completedTaskIds, taskId],
      };

      if (result.nextSection) {
        const advanced = advanceToSection(updated, result.nextSection);
        saveAttemptState(advanced);
        router.push(`/attempt/${attemptId}/section/${result.nextSection.sectionId}/task/1`);
        return advanced;
      }

      saveAttemptState(updated);
      if (result.sectionFinished) {
        router.push(`/attempt/${attemptId}/results`);
      } else {
        const nextOrder = updated.completedTaskIds.length + 1;
        router.push(`/attempt/${attemptId}/section/${sectionId}/task/${nextOrder}`);
      }
      return updated;
    });
  }

  const submitRef = useRef<() => void>(() => {});
  submitRef.current = () => viewRef.current?.submit();

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

  if (!state || !taskTemplate || secondsLeft === null) {
    return <p className="text-sm text-slate-500">Chargement de la tâche…</p>;
  }

  const isListening = taskTemplate.type === "listening_mcq";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Tâche {taskTemplate.order} — {taskTemplate.type}
          </p>
          <p className="text-xs text-slate-400">
            {isListening
              ? "Compréhension orale — question à choix multiple"
              : `Registre attendu : ${taskTemplate.register} · ${taskTemplate.minWords}-${taskTemplate.maxWords} mots`}
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

      {isListening ? (
        <ListeningTaskView
          key={taskTemplate.id}
          ref={viewRef}
          state={state}
          taskTemplate={taskTemplate}
          onCacheUpdate={setState}
          onSubmitted={(result) => handleSubmitted(taskTemplate.id, result)}
        />
      ) : (
        <WritingTaskView
          key={taskTemplate.id}
          ref={viewRef}
          state={state}
          taskTemplate={taskTemplate}
          onCacheUpdate={setState}
          onSubmitted={(result) => handleSubmitted(taskTemplate.id, result)}
        />
      )}

      <p className="text-xs text-slate-400">
        Aucun retour en arrière possible, conformément au format réel de l&rsquo;examen.
      </p>
    </div>
  );
}
