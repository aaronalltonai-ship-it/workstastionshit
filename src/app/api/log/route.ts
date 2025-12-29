import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { source?: string; level?: string; message?: string; detail?: unknown };
    const line = {
      ts: new Date().toISOString(),
      source: body?.source || "app",
      level: body?.level || "info",
      message: body?.message || "",
      detail: body?.detail,
    };
    const logDir = path.join(process.cwd(), "workspace", "logs");
    await ensureDir(logDir);
    const logPath = path.join(logDir, "app.log");
    await fs.appendFile(logPath, JSON.stringify(line) + "\n", "utf8");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Log append failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
