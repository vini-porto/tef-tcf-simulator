import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getExamDefinition, getExamSection, getMcqQuestion, getTaskTemplate } from "@/lib/content";
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
        orderBy: { startedAt: "asc" },
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

  const sections = examAttempt.sectionAttempts.map((sectionAttempt) => {
    const section = getExamSection(sectionAttempt.sectionId);

    const submissions = sectionAttempt.taskSubmissions.map((s) => {
      if (section?.type === "comprehension_orale") {
        const question = s.mcqQuestionId ? getMcqQuestion(s.mcqQuestionId) : undefined;
        return {
          id: s.id,
          taskTemplateId: s.taskTemplateId,
          taskType: getTaskTemplate(s.taskTemplateId)?.type,
          questionText: question?.questionText,
          choices: question?.choices,
          correctChoiceId: question?.correctChoiceId,
          selectedChoiceId: s.selectedChoiceId,
          stimulusContent: question?.stimulusContent,
          isCorrect: s.scoringResult?.isCorrect ?? null,
        };
      }

      return {
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
      };
    });

    return {
      sectionId: sectionAttempt.sectionId,
      sectionType: section?.type,
      sectionEstimatedNclc: sectionAttempt.sectionEstimatedNclc,
      submissions,
    };
  });

  return NextResponse.json({
    attemptId: examAttempt.id,
    examId: examAttempt.examId,
    examDisplayName: exam?.displayName,
    status: examAttempt.status,
    overallEstimatedNclc: examAttempt.overallEstimatedNclc,
    sections,
    disclaimer: OFFICIAL_DISCLAIMER,
  });
}
