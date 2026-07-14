import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMcqQuestion, getTaskTemplate } from "@/lib/content";
import { OFFICIAL_DISCLAIMER } from "@/lib/content-types";
import { finishTaskAndAdvance } from "@/lib/attempt-engine";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sectionAttemptId, taskTemplateId, mcqQuestionId, selectedChoiceId, timeSpentSeconds } =
    body as {
      sectionAttemptId?: string;
      taskTemplateId?: string;
      mcqQuestionId?: string;
      selectedChoiceId?: string;
      timeSpentSeconds?: number;
    };

  if (
    !sectionAttemptId ||
    !taskTemplateId ||
    !mcqQuestionId ||
    !selectedChoiceId ||
    typeof timeSpentSeconds !== "number"
  ) {
    return NextResponse.json({ error: "Champs manquants ou invalides." }, { status: 400 });
  }

  const taskTemplate = getTaskTemplate(taskTemplateId);
  const question = getMcqQuestion(mcqQuestionId);
  if (!taskTemplate || !question) {
    return NextResponse.json({ error: "Tâche ou question introuvable." }, { status: 404 });
  }

  const sectionAttempt = await prisma.sectionAttempt.findUnique({
    where: { id: sectionAttemptId },
  });
  if (!sectionAttempt) {
    return NextResponse.json({ error: "Tentative de section introuvable." }, { status: 404 });
  }

  const isCorrect = selectedChoiceId === question.correctChoiceId;

  const submission = await prisma.taskSubmission.create({
    data: {
      sectionAttemptId,
      taskTemplateId,
      mcqQuestionId,
      selectedChoiceId,
      timeSpentSeconds,
    },
  });

  const scoringResult = await prisma.scoringResult.create({
    data: {
      taskSubmissionId: submission.id,
      method: "mcq_auto",
      isCorrect,
      confidence: "high",
      feedbackText: isCorrect ? "Bonne réponse !" : "Réponse incorrecte.",
      strengthsHighlighted: "[]",
      improvementAreas: "[]",
      officialDisclaimer: OFFICIAL_DISCLAIMER,
    },
  });

  const { sectionFinished, nextSection } = await finishTaskAndAdvance(sectionAttemptId);

  return NextResponse.json({
    submissionId: submission.id,
    isCorrect,
    correctChoiceId: question.correctChoiceId,
    scoredAt: scoringResult.scoredAt,
    sectionFinished,
    nextSection,
  });
}
