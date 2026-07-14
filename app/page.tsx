"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CECR_LEVELS } from "@/lib/content-types";
import {
  getAnonUserId,
  hasSeenWalkthrough,
  markWalkthroughSeen,
  saveAttemptState,
} from "@/lib/client-state";
import { WalkthroughModal } from "@/components/WalkthroughModal";

const EXAMS = [
  {
    id: "tef-canada",
    label: "TEF Canada",
    description:
      "Compréhension orale (6 questions, ~6 min) puis expression écrite — message court (20 min) + essai argumentatif (40 min)",
  },
  {
    id: "tcf-canada",
    label: "TCF Canada",
    description:
      "Compréhension orale (6 questions, ~6 min) puis expression écrite — message court (10 min) + récit (20 min) + synthèse et opinion (30 min)",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [examId, setExamId] = useState<string>("tef-canada");
  const [targetLevel, setTargetLevel] = useState<string>("B1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const selectedExam = EXAMS.find((exam) => exam.id === examId) ?? EXAMS[0];

  function handleStartClick() {
    if (hasSeenWalkthrough()) {
      void startAttempt();
    } else {
      setShowWalkthrough(true);
    }
  }

  function handleWalkthroughChoice() {
    markWalkthroughSeen();
    setShowWalkthrough(false);
    void startAttempt();
  }

  async function startAttempt() {
    setLoading(true);
    setError(null);
    try {
      const userId = getAnonUserId();
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, targetLevel, userId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Impossible de démarrer la simulation.");
      }
      const data = await res.json();
      saveAttemptState({
        attemptId: data.attemptId,
        examId: data.examId,
        targetLevel: data.targetLevel,
        sectionOrder: data.sectionOrder,
        currentSectionId: data.sectionId,
        sectionAttemptId: data.sectionAttemptId,
        tasks: data.tasks,
        prompts: {},
        mcqQuestions: {},
        completedTaskIds: [],
        taskStartedAt: {},
      });
      const firstTask = data.tasks[0];
      router.push(`/attempt/${data.attemptId}/section/${data.sectionId}/task/${firstTask.order}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Simulateur TEF/TCF Canada — Compréhension orale &amp; Expression écrite
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Choisissez votre examen et votre niveau cible pour démarrer une simulation
          chronométrée, sans retour en arrière, fidèle au format réel. La compréhension
          orale est corrigée automatiquement ; un modèle IA évalue ensuite votre
          expression écrite selon les critères officiels.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-slate-700">Examen</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {EXAMS.map((exam) => (
            <button
              key={exam.id}
              type="button"
              onClick={() => setExamId(exam.id)}
              className={`rounded-lg border p-4 text-left transition ${
                examId === exam.id
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <div className="font-medium">{exam.label}</div>
              <div
                className={`mt-1 text-xs ${
                  examId === exam.id ? "text-slate-200" : "text-slate-500"
                }`}
              >
                {exam.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-slate-700">Niveau cible (CECR)</h2>
        <div className="flex flex-wrap gap-2">
          {CECR_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setTargetLevel(level)}
              className={`rounded-md border px-3 py-1.5 text-sm transition ${
                targetLevel === level
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleStartClick}
        disabled={loading}
        className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {loading ? "Préparation…" : "Commencer la simulation"}
      </button>

      {showWalkthrough && (
        <WalkthroughModal
          examLabel={selectedExam.label}
          examDescription={selectedExam.description}
          loading={loading}
          onStart={handleWalkthroughChoice}
          onSkip={handleWalkthroughChoice}
        />
      )}

      <p className="text-xs text-slate-400">
        Simulation non officielle, à visée d&rsquo;entraînement uniquement. Aucune
        affiliation avec le CCIP, France Éducation International ou le gouvernement
        du Canada.
      </p>
    </div>
  );
}
