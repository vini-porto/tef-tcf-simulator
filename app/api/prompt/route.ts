import { NextRequest, NextResponse } from "next/server";
import { pickPromptForTask } from "@/lib/content";

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

  const prompt = pickPromptForTask(taskTemplateId, targetLevel);
  if (!prompt) {
    return NextResponse.json(
      { error: "Aucun sujet approuvé disponible pour cette tâche." },
      { status: 404 },
    );
  }

  return NextResponse.json(prompt);
}
