"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface SubmissionResult {
  id: string;
  taskTemplateId: string;
  taskType?: string;
  wordCount: number | null;
  wordCountMet: boolean;
  scoringResult: {
    linguistic: number;
    pragmatic: number;
    sociolinguistic: number | null;
    estimatedNclc: number;
    confidence: string;
    feedbackText: string;
    strengthsHighlighted: string[];
    improvementAreas: string[];
  } | null;
}

interface AttemptResults {
  attemptId: string;
  examDisplayName?: string;
  status: string;
  overallEstimatedNclc: number | null;
  sectionEstimatedNclc: number | null;
  submissions: SubmissionResult[];
  disclaimer: string;
}

export default function ResultsPage() {
  const params = useParams<{ attemptId: string }>();
  const [data, setData] = useState<AttemptResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/attempts/${params.attemptId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Impossible de charger les résultats.");
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [params.attemptId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Chargement des résultats…</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Résultats — {data.examDisplayName}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Estimation globale : NCLC/CLB{" "}
          <span className="font-semibold text-slate-900">
            {data.overallEstimatedNclc?.toFixed(1) ?? "—"}
          </span>
        </p>
      </div>

      <div className="space-y-4">
        {data.submissions.map((s, i) => (
          <div key={s.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-slate-900">
                Tâche {i + 1} {s.taskType ? `— ${s.taskType}` : ""}
              </h2>
              {s.scoringResult && (
                <span className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">
                  NCLC {s.scoringResult.estimatedNclc.toFixed(1)}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {s.wordCount} mots · minimum {s.wordCountMet ? "atteint" : "non atteint"}
            </p>

            {s.scoringResult && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-md bg-slate-50 p-2">
                    <div className="text-slate-500">Linguistique</div>
                    <div className="font-semibold text-slate-900">
                      {s.scoringResult.linguistic.toFixed(1)}/10
                    </div>
                  </div>
                  <div className="rounded-md bg-slate-50 p-2">
                    <div className="text-slate-500">Pragmatique</div>
                    <div className="font-semibold text-slate-900">
                      {s.scoringResult.pragmatic.toFixed(1)}/10
                    </div>
                  </div>
                  <div className="rounded-md bg-slate-50 p-2">
                    <div className="text-slate-500">Sociolinguistique</div>
                    <div className="font-semibold text-slate-900">
                      {s.scoringResult.sociolinguistic?.toFixed(1) ?? "—"}/10
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-700">{s.scoringResult.feedbackText}</p>

                {s.scoringResult.strengthsHighlighted.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-emerald-700">Points forts</p>
                    <ul className="list-inside list-disc text-sm text-slate-700">
                      {s.scoringResult.strengthsHighlighted.map((str, idx) => (
                        <li key={idx}>{str}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {s.scoringResult.improvementAreas.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-amber-700">Axes d&rsquo;amélioration</p>
                    <ul className="list-inside list-disc text-sm text-slate-700">
                      {s.scoringResult.improvementAreas.map((str, idx) => (
                        <li key={idx}>{str}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-xs text-slate-400">
                  Confiance de l&rsquo;estimation : {s.scoringResult.confidence}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        {data.disclaimer}
      </div>

      <Link href="/" className="inline-block text-sm text-slate-600 underline">
        Recommencer une simulation
      </Link>
    </div>
  );
}
