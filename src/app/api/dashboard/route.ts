import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { id: "asc" },
      include: {
        projects: {
          orderBy: { id: "asc" },
          include: { tasks: { orderBy: { id: "asc" } } },
        },
      },
    });

    const projects = clients.flatMap((client) =>
      client.projects.map((project) => ({
        ...project,
        clientName: client.name,
      })),
    );

    const tasks = projects.flatMap((project) =>
      project.tasks.map((task) => ({
        ...task,
        projectName: project.name,
        clientName: project.clientName,
      })),
    );

    return NextResponse.json({
      clients,
      projects,
      tasks,
      counts: {
        clients: clients.length,
        projects: projects.length,
        tasks: tasks.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dashboard." },
      { status: 500 },
    );
  }
}
