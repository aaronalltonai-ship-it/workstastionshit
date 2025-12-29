import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

import { logError, logEvent } from "@/lib/logger";

export const runtime = "nodejs";

function getThreshold() {
  const envVal = process.env.DB_MAX_BYTES;
  const parsed = envVal ? Number(envVal) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50 * 1024 * 1024; // default 50MB
}

export async function GET() {
  const started = Date.now();
  try {
    const dbPath = path.join(process.cwd(), "prisma", "dev.db");
    let stats;
    try {
      stats = await fs.stat(dbPath);
    } catch {
      await logError("db-health", "Database file not found", { path: dbPath });
      return NextResponse.json({ error: "Database file not found", path: dbPath }, { status: 404 });
    }

    const sizeBytes = stats.size;
    const thresholdBytes = getThreshold();
    const percent = Math.round((sizeBytes / thresholdBytes) * 1000) / 10; // one decimal
    const status = percent >= 100 ? "full" : percent >= 80 ? "warn" : "ok";

    await logEvent({
      source: "db-health",
      message: "GET /api/db/health success",
      durationMs: Date.now() - started,
      detail: { status, sizeBytes, thresholdBytes, percent },
    });

    return NextResponse.json({
      path: dbPath,
      sizeBytes,
      thresholdBytes,
      percent,
      status,
      hint:
        status === "full"
          ? "DB is at or over limit. Migrate to Postgres or prune data."
          : status === "warn"
            ? "DB nearing limit. Consider pruning or migrating to Postgres."
            : "OK",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "DB health check failed";
    await logError("db-health", "GET /api/db/health failed", {
      durationMs: Date.now() - started,
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
