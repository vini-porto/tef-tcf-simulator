"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface WritingScoringResult {
  linguistic: number;
  pragmatic: number;
  sociolinguistic: number | null;
  estimatedNclc: number;
  confidence: string;
  feedbackText: string;
  strengthsHighlighted: string[];
  improvementAreas: string[];
}

interface WritingSubmission {
  id: string;
  taskTemplateId: string;
  taskType?: string;
  wordCount: number | null;
  wordCountMet: boolean;
  timeSpentSeconds: number;
  scoringResult: WritingScoringResult | null;
}

interface McqChoice {
  id: string;
  text: string;
}

interface McqSubmission {
  id: string;
  taskTemplateId: string;
  taskType?: string;
  questionText?: string;
  choices?: McqChoice[];
  correctChoiceId?: string;
  selectedChoiceId: string | null;
  stimulusContent?: string;
  isCorrect: boolean | null;
}

type SectionSubmission = WritingSubmission | McqSubmission;

function isMcqSubmission(s: SectionSubmission): s is McqSubmission {
  return "isCorrect" in s;
}

interface SectionResult {
  sectionId: string;
  sectionType?: string;
  sectionEstimatedNclc: number | null;
  submissions: SectionSubmission[];
}

interface AttemptResults {
  attemptId: string;
  examDisplayName?: string;
  status: string;
  overallEstimatedNclc: number | null;
  sections: SectionResult[];
  disclaimer: string;
}

const SECTION_LABELS: Record<string, string> = {
  comprehension_orale: "Compréhension orale",
  expression_ecrite: "Expression écrite",
};

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
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Résultats — {data.examDisplayName}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Estimation globale : NCLC/CLB{" "}
          <span className="font-semibold text-slate-900">
            {data.overallEstimatedNclc?.toFixed(1) ?? "—"}
          </span>
        </p>
      </div>

      {data.sections.map((section) => (
        <div key={section.sectionId} className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {SECTION_LABELS[section.sectionType ?? ""] ?? section.sectionType}
            </h2>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              NCLC {section.sectionEstimatedNclc?.toFixed(1) ?? "—"}
            </span>
          </div>

          <div className="space-y-4">
            {section.submissions.map((s, i) =>
              isMcqSubmission(s) ? (
                <div key={s.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-900">Question {i + 1}</h3>
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                        s.isCorrect
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {s.isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                  {s.stimulusContent && (
                    <audio controls src={s.stimulusContent} className="mt-3 w-full">
                      Votre navigateur ne prend pas en charge la lecture audio.
                    </audio>
                  )}
                  <p className="mt-3 text-sm text-slate-700">{s.questionText}</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {s.choices?.map((choice) => {
                      const isSelected = choice.id === s.selectedChoiceId;
                      const isCorrectChoice = choice.id === s.correctChoiceId;
                      return (
                        <li
                          key={choice.id}
                          className={`rounded-md px-2 py-1 ${
                            isCorrectChoice
                              ? "bg-emerald-50 text-emerald-800"
                              : isSelected
                                ? "bg-red-50 text-red-800"
                                : "text-slate-600"
                          }`}
                        >
                          {choice.text}
                          {isCorrectChoice ? " ✓" : isSelected ? " ✗" : ""}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div key={s.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-900">Tâche {i + 1}</h3>
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
              ),
            )}
          </div>
        </div>
      ))}

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        {data.disclaimer}
      </div>

      <Link href="/" className="inline-block text-sm text-slate-600 underline">
        Recommencer une simulation
      </Link>
    </div>
  );
}
