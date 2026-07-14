import { NextRequest, NextResponse } from "next/server";
import { pickMcqQuestionForTask } from "@/lib/content";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskTemplateId = searchParams.get("taskTemplateId");
  const targetLevel = searchParams.get("targetLevel");

  if (!taskTemplateId || !targetLevel) {
    return NextResponse.json(
      { error: "taskTemplateId et targetLevel sont requis." },
      { status: 400 },
    );
  }

  const question = pickMcqQuestionForTask(taskTemplateId, targetLevel);
  if (!question) {
    return NextResponse.json(
      { error: "Aucune question approuvée disponible pour cette tâche." },
      { status: 404 },
    );
  }

  // Never send the answer key (or the authoring-only dialogueScript) to the
  // client before submission.
  return NextResponse.json({
    id: question.id,
    taskTemplateId: question.taskTemplateId,
    cecrLevel: question.cecrLevel,
    stimulusType: question.stimulusType,
    stimulusContent: question.stimulusContent,
    questionText: question.questionText,
    choices: question.choices,
  });
}
