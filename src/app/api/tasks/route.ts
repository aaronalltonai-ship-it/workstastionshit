import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

type Body = {
  projectId?: number | string;
  title?: string;
  status?: string;
  owner?: string;
  due?: string;
  prompt?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const projectId = Number(body.projectId);
    const title = body.title?.trim();
    if (!title || !Number.isFinite(projectId)) {
      return NextResponse.json({ error: "projectId (number) and title are required." }, { status: 400 });
    }
    const status = body.status?.trim() || null;
    const owner = body.owner?.trim() || null;
    const prompt = body.prompt?.trim() || null;
    let due: Date | null = null;
    if (body.due?.trim()) {
      const d = new Date(body.due);
      if (!Number.isNaN(d.getTime())) due = d;
    }

    const task = await prisma.task.create({
      data: { projectId, title, status, owner, prompt, due },
    });
    return NextResponse.json({ task });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create task." },
      { status: 500 },
    );
  }
}
