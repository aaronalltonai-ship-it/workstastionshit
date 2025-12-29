import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

type Body = {
  clientId?: number | string;
  name?: string;
  status?: string;
  owner?: string;
  due?: string;
  notes?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const clientId = Number(body.clientId);
    const name = body.name?.trim();
    if (!name || !Number.isFinite(clientId)) {
      return NextResponse.json({ error: "clientId (number) and name are required." }, { status: 400 });
    }
    const status = body.status?.trim() || null;
    const owner = body.owner?.trim() || null;
    const notes = body.notes?.trim() || null;
    let due: Date | null = null;
    if (body.due?.trim()) {
      const d = new Date(body.due);
      if (!Number.isNaN(d.getTime())) due = d;
    }

    const project = await prisma.project.create({
      data: { clientId, name, status, owner, notes, due },
    });
    return NextResponse.json({ project });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create project." },
      { status: 500 },
    );
  }
}
