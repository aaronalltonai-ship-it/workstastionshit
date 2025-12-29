import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { parseSession } from "@/lib/auth";
import { cookies } from "next/headers";

export const runtime = "nodejs";
const LOG_PATH = path.join(process.cwd(), "workspace", "logs", "app.log");

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const session = await parseSession(cookieStore.get("auth_session")?.value);
  if (!session) {
    const url = new URL(request.url);
    const pass = url.searchParams.get("passcode") || request.headers.get("x-passcode") || "";
    if (!pass || pass !== process.env.PASSCODE_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const url = new URL(request.url);
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") || 120) || 120));
    const raw = await fs.readFile(LOG_PATH, "utf8").catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return "";
      throw error;
    });

    if (!raw.trim()) {
      return NextResponse.json({ entries: [] });
    }

    const lines = raw.trim().split("\n").filter(Boolean);
    const recentLines = lines.slice(-limit);

    const entries = recentLines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return { ts: new Date().toISOString(), level: "error", source: "logs", message: line };
        }
      })
      .filter(Boolean);

    return NextResponse.json({ entries, total: lines.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read logs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
