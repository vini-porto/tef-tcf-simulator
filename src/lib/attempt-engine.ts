// Shared "did this section just finish, and if so what's next" logic — used by
// both the writing (ai_estimate) and MCQ (mcq_auto) submission endpoints so the
// two scoring methods stay in sync on how sections/attempts advance and aggregate.

import { prisma } from "./prisma";
import {
  estimateNclcFromRawScore,
  getExamDefinition,
  getExamSection,
  getNextSection,
  getTaskTemplatesForSection,
} from "./content";
import type { TaskTemplate } from "./content-types";

export interface NextSectionInfo {
  sectionId: string;
  sectionAttemptId: string;
  tasks: TaskTemplate[];
}

export interface AdvanceResult {
  sectionFinished: boolean;
  nextSection: NextSectionInfo | null;
}

export async function finishTaskAndAdvance(sectionAttemptId: string): Promise<AdvanceResult> {
  const sectionAttempt = await prisma.sectionAttempt.findUniqueOrThrow({
    where: { id: sectionAttemptId },
    include: {
      examAttempt: true,
      taskSubmissions: { include: { scoringResult: true } },
    },
  });

  const totalTasks = getTaskTemplatesForSection(sectionAttempt.sectionId).length;
  const scoredSubmissions = sectionAttempt.taskSubmissions.filter((s) => s.scoringResult);

  if (scoredSubmissions.length < totalTasks) {
    return { sectionFinished: false, nextSection: null };
  }

  const { examAttempt } = sectionAttempt;
  const section = getExamSection(sectionAttempt.sectionId);
  const exam = getExamDefinition(examAttempt.examId);

  let sectionEstimatedNclc: number | undefined;
  if (section?.type === "comprehension_orale") {
    const correctCount = scoredSubmissions.filter((s) => s.scoringResult?.isCorrect).length;
    sectionEstimatedNclc = exam
      ? estimateNclcFromRawScore(exam.examType, section.type, correctCount)
      : undefined;
  } else {
    const nclcValues = scoredSubmissions
      .map((s) => s.scoringResult?.estimatedNclc)
      .filter((n): n is number => n != null);
    sectionEstimatedNclc = nclcValues.length
      ? nclcValues.reduce((sum, n) => sum + n, 0) / nclcValues.length
      : undefined;
  }

  await prisma.sectionAttempt.update({
    where: { id: sectionAttemptId },
    data: { finishedAt: new Date(), sectionEstimatedNclc },
  });

  const nextSectionContent = getNextSection(examAttempt.examId, sectionAttempt.sectionId);

  if (!nextSectionContent) {
    const allSectionAttempts = await prisma.sectionAttempt.findMany({
      where: { examAttemptId: examAttempt.id },
    });
    const finishedEstimates = allSectionAttempts
      .map((s) => s.sectionEstimatedNclc)
      .filter((n): n is number => n != null);
    const overallEstimatedNclc = finishedEstimates.length
      ? finishedEstimates.reduce((sum, n) => sum + n, 0) / finishedEstimates.length
      : undefined;

    await prisma.examAttempt.update({
      where: { id: examAttempt.id },
      data: { finishedAt: new Date(), status: "completed", overallEstimatedNclc },
    });

    return { sectionFinished: true, nextSection: null };
  }

  const nextSectionAttempt = await prisma.sectionAttempt.create({
    data: { examAttemptId: examAttempt.id, sectionId: nextSectionContent.id },
  });

  return {
    sectionFinished: true,
    nextSection: {
      sectionId: nextSectionContent.id,
      sectionAttemptId: nextSectionAttempt.id,
      tasks: getTaskTemplatesForSection(nextSectionContent.id),
    },
  };
}
