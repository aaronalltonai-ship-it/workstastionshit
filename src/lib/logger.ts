import fs from "fs/promises";
import path from "path";

type BaseLog = {
  ts: string;
  level: "info" | "error";
  source: string;
  message: string;
  durationMs?: number;
  detail?: unknown;
  stack?: string;
};

const LOG_DIR = path.join(process.cwd(), "workspace", "logs");
const LOG_FILE = path.join(LOG_DIR, "app.log");

async function append(entry: BaseLog) {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(LOG_FILE, `${JSON.stringify(entry)}\n`, "utf8");
  } catch (error) {
    console.error("logger append failed", error);
  }
}

export async function logEvent(payload: {
  source: string;
  message: string;
  durationMs?: number;
  detail?: unknown;
}) {
  const entry: BaseLog = {
    ts: new Date().toISOString(),
    level: "info",
    source: payload.source,
    message: payload.message,
    durationMs: payload.durationMs,
    detail: payload.detail,
  };
  await append(entry);
  return entry;
}

export async function logError(
  source: string,
  message: string,
  metadata?: { durationMs?: number; detail?: unknown; stack?: string },
) {
  const entry: BaseLog = {
    ts: new Date().toISOString(),
    level: "error",
    source,
    message,
    durationMs: metadata?.durationMs,
    detail: metadata?.detail,
    stack: metadata?.stack,
  };
  await append(entry);
  return entry;
}
