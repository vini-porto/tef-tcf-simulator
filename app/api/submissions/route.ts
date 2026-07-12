import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTaskTemplate, getPromptItem, getTaskTemplatesForSection } from "@/lib/content";
import { scoreWritingTask, SCORING_MODEL, OFFICIAL_DISCLAIMER } from "@/lib/ai";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    sectionAttemptId,
    taskTemplateId,
    promptItemId,
    textResponse,
    wordCount,
    timeSpentSeconds,
  } = body as {
    sectionAttemptId?: string;
    taskTemplateId?: string;
    promptItemId?: string;
    textResponse?: string;
    wordCount?: number;
    timeSpentSeconds?: number;
  };

  if (
    !sectionAttemptId ||
    !taskTemplateId ||
    !promptItemId ||
    typeof textResponse !== "string" ||
    typeof wordCount !== "number" ||
    typeof timeSpentSeconds !== "number"
  ) {
    return NextResponse.json({ error: "Champs manquants ou invalides." }, { status: 400 });
  }

  const taskTemplate = getTaskTemplate(taskTemplateId);
  const promptItem = getPromptItem(promptItemId);
  if (!taskTemplate || !promptItem) {
    return NextResponse.json({ error: "Tâche ou sujet introuvable." }, { status: 404 });
  }

  const sectionAttempt = await prisma.sectionAttempt.findUnique({
    where: { id: sectionAttemptId },
  });
  if (!sectionAttempt) {
    return NextResponse.json({ error: "Tentative de section introuvable." }, { status: 404 });
  }

  const wordCountMet = wordCount >= taskTemplate.minWords;

  const submission = await prisma.taskSubmission.create({
    data: {
      sectionAttemptId,
      taskTemplateId,
      promptItemId,
      textResponse,
      wordCount,
      timeSpentSeconds,
      wordCountMet,
    },
  });

  const scoring = await scoreWritingTask({
    taskTemplate,
    promptItem,
    textResponse,
    wordCount,
    wordCountMet,
  });

  const scoringResult = await prisma.scoringResult.create({
    data: {
      taskSubmissionId: submission.id,
      method: "ai_estimate",
      modelUsed: SCORING_MODEL,
      linguisticScore: scoring.linguistic,
      pragmaticScore: scoring.pragmatic,
      sociolinguisticScore: scoring.sociolinguistic,
      estimatedNclc: scoring.estimatedNclc,
      confidence: scoring.confidence,
      feedbackText: scoring.feedbackText,
      strengthsHighlighted: JSON.stringify(scoring.strengthsHighlighted),
      improvementAreas: JSON.stringify(scoring.improvementAreas),
      officialDisclaimer: OFFICIAL_DISCLAIMER,
    },
  });

  const totalTasks = getTaskTemplatesForSection(sectionAttempt.sectionId).length;
  const allSubmissions = await prisma.taskSubmission.findMany({
    where: { sectionAttemptId },
    include: { scoringResult: true },
  });

  let sectionFinished = false;
  if (allSubmissions.length >= totalTasks && allSubmissions.every((s) => s.scoringResult)) {
    sectionFinished = true;
    const avgNclc =
      allSubmissions.reduce((sum, s) => sum + (s.scoringResult?.estimatedNclc ?? 0), 0) /
      allSubmissions.length;

    await prisma.sectionAttempt.update({
      where: { id: sectionAttemptId },
      data: { finishedAt: new Date(), sectionEstimatedNclc: avgNclc },
    });

    await prisma.examAttempt.update({
      where: { id: sectionAttempt.examAttemptId },
      data: { finishedAt: new Date(), status: "completed", overallEstimatedNclc: avgNclc },
    });
  }

  return NextResponse.json({
    submissionId: submission.id,
    scoringResult: {
      linguistic: scoringResult.linguisticScore,
      pragmatic: scoringResult.pragmaticScore,
      sociolinguistic: scoringResult.sociolinguisticScore,
      estimatedNclc: scoringResult.estimatedNclc,
      confidence: scoringResult.confidence,
      feedbackText: scoringResult.feedbackText,
      strengthsHighlighted: scoring.strengthsHighlighted,
      improvementAreas: scoring.improvementAreas,
      officialDisclaimer: OFFICIAL_DISCLAIMER,
    },
    sectionFinished,
  });
}
