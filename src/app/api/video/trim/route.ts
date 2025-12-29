import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function runFfmpeg(input: string, output: string, start: number, end?: number) {
  return new Promise<void>((resolve, reject) => {
    const args = ["-y"];
    if (!Number.isNaN(start) && start > 0) args.push("-ss", String(start));
    args.push("-i", input);
    if (end && end > start) args.push("-t", String(end - start));
    args.push("-c", "copy", output);
    const proc = spawn("ffmpeg", args);
    let stderr = "";
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
    });
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string; start?: number; end?: number; id?: string };
    const url = body?.url;
    if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });
    const start = typeof body?.start === "number" ? Math.max(body.start, 0) : 0;
    const end = typeof body?.end === "number" ? body.end : undefined;

    const outputDir = path.join(process.cwd(), "workspace", "trimmed");
    await ensureDir(outputDir);
    const fileName = `${body?.id || "clip"}-${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, fileName);

    try {
      await runFfmpeg(url, outputPath, start, end);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ffmpeg failed";
      if (msg.includes("ENOENT") || msg.toLowerCase().includes("ffmpeg")) {
        return NextResponse.json({ error: "ffmpeg not available on server" }, { status: 503 });
      }
      throw err;
    }
    const fileBuf = await fs.readFile(outputPath);
    const dataUrl = `data:video/mp4;base64,${fileBuf.toString("base64")}`;

    return NextResponse.json({ outputPath, dataUrl, fileName });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Trim failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
