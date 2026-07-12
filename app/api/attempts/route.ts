import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getExamDefinition, getWritingSectionForExam, getTaskTemplatesForSection } from "@/lib/content";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { examId, targetLevel, userId } = body as {
    examId?: string;
    targetLevel?: string;
    userId?: string;
  };

  if (!examId || !targetLevel || !userId) {
    return NextResponse.json(
      { error: "examId, targetLevel et userId sont requis." },
      { status: 400 },
    );
  }

  const exam = getExamDefinition(examId);
  if (!exam) {
    return NextResponse.json({ error: "Examen inconnu." }, { status: 404 });
  }

  const section = getWritingSectionForExam(examId);
  if (!section) {
    return NextResponse.json(
      { error: "Section d'expression écrite introuvable pour cet examen." },
      { status: 404 },
    );
  }

  const tasks = getTaskTemplatesForSection(section.id);

  await prisma.user.upsert({
    where: { id: userId },
    update: { targetExam: exam.examType },
    create: { id: userId, targetExam: exam.examType },
  });

  const examAttempt = await prisma.examAttempt.create({
    data: { userId, examId },
  });

  const sectionAttempt = await prisma.sectionAttempt.create({
    data: { examAttemptId: examAttempt.id, sectionId: section.id },
  });

  return NextResponse.json({
    attemptId: examAttempt.id,
    sectionAttemptId: sectionAttempt.id,
    examId,
    sectionId: section.id,
    targetLevel,
    tasks,
  });
}
