import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getExamDefinition, getTaskTemplatesForSection, getTaskTemplate } from "@/lib/content";
import { OFFICIAL_DISCLAIMER } from "@/lib/content-types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await params;

  const examAttempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      sectionAttempts: {
        include: {
          taskSubmissions: {
            include: { scoringResult: true },
            orderBy: { submittedAt: "asc" },
          },
        },
      },
    },
  });

  if (!examAttempt) {
    return NextResponse.json({ error: "Tentative introuvable." }, { status: 404 });
  }

  const exam = getExamDefinition(examAttempt.examId);
  const sectionAttempt = examAttempt.sectionAttempts[0];
  const tasks = sectionAttempt ? getTaskTemplatesForSection(sectionAttempt.sectionId) : [];

  const submissions = (sectionAttempt?.taskSubmissions ?? []).map((s) => ({
    id: s.id,
    taskTemplateId: s.taskTemplateId,
    taskType: getTaskTemplate(s.taskTemplateId)?.type,
    wordCount: s.wordCount,
    wordCountMet: s.wordCountMet,
    timeSpentSeconds: s.timeSpentSeconds,
    scoringResult: s.scoringResult
      ? {
          linguistic: s.scoringResult.linguisticScore,
          pragmatic: s.scoringResult.pragmaticScore,
          sociolinguistic: s.scoringResult.sociolinguisticScore,
          estimatedNclc: s.scoringResult.estimatedNclc,
          confidence: s.scoringResult.confidence,
          feedbackText: s.scoringResult.feedbackText,
          strengthsHighlighted: JSON.parse(s.scoringResult.strengthsHighlighted),
          improvementAreas: JSON.parse(s.scoringResult.improvementAreas),
        }
      : null,
  }));

  return NextResponse.json({
    attemptId: examAttempt.id,
    examId: examAttempt.examId,
    examDisplayName: exam?.displayName,
    status: examAttempt.status,
    overallEstimatedNclc: examAttempt.overallEstimatedNclc,
    sectionAttemptId: sectionAttempt?.id,
    sectionEstimatedNclc: sectionAttempt?.sectionEstimatedNclc,
    tasks,
    submissions,
    disclaimer: OFFICIAL_DISCLAIMER,
  });
}
