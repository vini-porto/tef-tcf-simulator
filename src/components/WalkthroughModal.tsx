"use client";

import { useState } from "react";
import { OFFICIAL_DISCLAIMER } from "@/lib/content-types";

interface WalkthroughModalProps {
  examLabel: string;
  examDescription: string;
  loading: boolean;
  onStart: () => void;
  onSkip: () => void;
}

const STEPS = [
  {
    title: "Bienvenue",
    body: (examLabel: string) =>
      `Ce simulateur vous entraîne à l'épreuve d'expression écrite du ${examLabel}, dans des conditions proches de l'examen réel : temps limité, pas de retour en arrière, et correction automatique par IA selon les critères officiels.`,
  },
  {
    title: "Déroulement",
    body: (_examLabel: string, examDescription: string) =>
      `Votre simulation : ${examDescription}. Chaque tâche a sa propre limite de temps : une fois le temps écoulé ou la tâche soumise, vous ne pouvez plus y revenir. Un compteur de mots vous indique en temps réel si vous respectez la longueur demandée.`,
  },
  {
    title: "Correction et résultat",
    body: () =>
      `À la fin, un modèle d'intelligence artificielle évalue votre texte selon les critères linguistique, pragmatique et sociolinguistique utilisés dans l'examen réel, puis vous propose un niveau NCLC/CLB estimé accompagné de retours qualitatifs. ${OFFICIAL_DISCLAIMER}`,
  },
];

export function WalkthroughModal({
  examLabel,
  examDescription,
  loading,
  onStart,
  onSkip,
}: WalkthroughModalProps) {
  // -1 = initial offer screen, 0..STEPS.length-1 = walkthrough content.
  const [stepIndex, setStepIndex] = useState(-1);

  const isOffer = stepIndex === -1;
  const isLastStep = stepIndex === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-lg">
        {isOffer ? (
          <>
            <h2 className="text-lg font-semibold text-slate-900">
              C&rsquo;est votre première simulation ?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Nous pouvons vous expliquer en quelques étapes comment se déroule la
              simulation avant de commencer.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onSkip}
                disabled={loading}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 disabled:opacity-50"
              >
                Non, commencer directement
              </button>
              <button
                type="button"
                onClick={() => setStepIndex(0)}
                disabled={loading}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                Oui, montrez-moi
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Étape {stepIndex + 1} sur {STEPS.length}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {STEPS[stepIndex].title}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {STEPS[stepIndex].body(examLabel, examDescription)}
            </p>
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={onSkip}
                disabled={loading}
                className="text-xs text-slate-400 hover:text-slate-600 disabled:opacity-50"
              >
                Passer
              </button>
              <div className="flex gap-2">
                {stepIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setStepIndex((i) => i - 1)}
                    disabled={loading}
                    className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 disabled:opacity-50"
                  >
                    Précédent
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => (isLastStep ? onStart() : setStepIndex((i) => i + 1))}
                  disabled={loading}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {isLastStep ? (loading ? "Préparation…" : "C'est parti !") : "Suivant"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
