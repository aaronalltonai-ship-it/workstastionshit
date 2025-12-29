import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

type Body = { taskId?: number | string; action?: "start" | "stop" };

export async function POST(request: Request) {
  const started = Date.now();
  try {
    const body = (await request.json()) as Body;
    const taskIdNum = Number(body.taskId);
    const action = body.action;
    if (!Number.isFinite(taskIdNum) || (action !== "start" && action !== "stop")) {
      return NextResponse.json({ error: "taskId (number) and action start|stop are required." }, { status: 400 });
    }

    const task = await prisma.task.findUnique({ where: { id: taskIdNum } });
    if (!task) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    const now = new Date();

    if (action === "start") {
      if (task.runningStart) {
        return NextResponse.json({ task, message: "Already running." });
      }
      const updated = await prisma.task.update({
        where: { id: taskIdNum },
        data: { runningStart: now },
      });
      return NextResponse.json({ task: updated });
    }

    // stop
    let newTimeSpent = task.timeSpentMs;
    if (task.runningStart) {
      const elapsed = Math.max(0, now.getTime() - task.runningStart.getTime());
      newTimeSpent += elapsed;
    }

    const updated = await prisma.task.update({
      where: { id: taskIdNum },
      data: { runningStart: null, timeSpentMs: newTimeSpent },
    });
    return NextResponse.json({ task: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Timer update failed." },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const running = await prisma.task.count({ where: { NOT: { runningStart: null } } });
    const tasks = await prisma.task.count();
    return NextResponse.json({ running, tasks });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Timer status failed." },
      { status: 500 },
    );
  }
}
