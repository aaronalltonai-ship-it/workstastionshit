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
          include: {
            tasks: { orderBy: { id: "asc" } },
          },
        },
      },
    });
    return NextResponse.json({ clients });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load clients." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; contact?: string };
    const name = body.name?.trim();
    const contact = body.contact?.trim() || null;
    if (!name) {
      return NextResponse.json({ error: "Client name is required." }, { status: 400 });
    }
    const client = await prisma.client.create({ data: { name, contact } });
    return NextResponse.json({ client });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create client." },
      { status: 500 },
    );
  }
}
