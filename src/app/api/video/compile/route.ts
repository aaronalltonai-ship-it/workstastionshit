import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

type ClipInput = { url: string; start?: number; end?: number; id?: string };

const MAX_CLIPS = 24;
const MAX_BYTES = 80 * 1024 * 1024; // 80MB guardrail

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeClipToDisk(clip: ClipInput, dir: string) {
  const fileName = `${clip.id || "clip"}-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;
  const filePath = path.join(dir, fileName);
  if (clip.url.startsWith("data:")) {
    const base64 = clip.url.split(",")[1] || "";
    const buf = Buffer.from(base64, "base64");
    if (buf.byteLength > MAX_BYTES) throw new Error("Clip too large");
    await fs.writeFile(filePath, buf);
  } else {
    const res = await fetch(clip.url);
    if (!res.ok) throw new Error(`Failed to fetch clip: ${clip.url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) throw new Error("Clip too large");
    await fs.writeFile(filePath, buf);
  }
  return filePath;
}

async function trimClipIfNeeded(filePath: string, clip: ClipInput) {
  const hasStart = typeof clip.start === "number" && clip.start > 0;
  const hasEnd = typeof clip.end === "number" && clip.end > 0;
  if (!hasStart && !hasEnd) return filePath;
  const duration = hasStart && hasEnd && clip.end! > clip.start! ? clip.end! - clip.start! : undefined;
  const trimmedPath = filePath.replace(/\.mp4$/, `-trim.mp4`);
  const args = ["-y"];
  if (hasStart) args.push("-ss", `${clip.start}`);
  args.push("-i", filePath);
  if (typeof duration === "number") args.push("-t", `${duration}`);
  else if (hasEnd && !hasStart) args.push("-to", `${clip.end}`);
  args.push("-c", "copy", trimmedPath);
  await runFfmpeg(args);
  await fs.rm(filePath).catch(() => {});
  return trimmedPath;
}

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
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
  const tempFiles: string[] = [];
  try {
    const body = (await request.json()) as { clips?: ClipInput[] };
    if (!Array.isArray(body?.clips) || body.clips.length === 0) {
      return NextResponse.json({ error: "clips array is required" }, { status: 400 });
    }
    if (body.clips.length > MAX_CLIPS) {
      return NextResponse.json({ error: `Too many clips (max ${MAX_CLIPS}).` }, { status: 400 });
    }

    const clips = body.clips;
    const workingDir = path.join(process.cwd(), "workspace", "compiled");
    await ensureDir(workingDir);

    const inputPaths: string[] = [];
    for (const clip of clips) {
      if (!clip?.url) continue;
      const rawPath = await writeClipToDisk(clip, workingDir);
      tempFiles.push(rawPath);
      const maybeTrimmed = await trimClipIfNeeded(rawPath, clip);
      if (maybeTrimmed !== rawPath) tempFiles.push(maybeTrimmed);
      inputPaths.push(maybeTrimmed);
    }

    if (inputPaths.length === 0) {
      return NextResponse.json({ error: "No valid clips to compile." }, { status: 400 });
    }

    const listPath = path.join(workingDir, `concat-${Date.now()}.txt`);
    const listContents = inputPaths
      .map((p, idx) => {
        const start = typeof clips[idx]?.start === "number" && clips[idx].start > 0 ? clips[idx].start : null;
        const end =
          typeof clips[idx]?.end === "number" && clips[idx].end && start !== null && clips[idx].end > start
            ? clips[idx].end
            : typeof clips[idx]?.end === "number"
              ? clips[idx].end
              : null;
        // We apply trims via -ss/-to on input as separate filters per file is complex; use -ss/-t per file via concat filter.
        // Instead, we rely on pre-trimmed inputs; if start/end provided, we trim to a temp file first.
        return `file '${p.replace(/'/g, "'\\''")}'`;
      })
      .join("\n");
    await fs.writeFile(listPath, listContents, "utf8");

    const outputPath = path.join(workingDir, `storyboard-${Date.now()}.mp4`);
    try {
      await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outputPath]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ffmpeg failed";
      if (msg.includes("ENOENT") || msg.toLowerCase().includes("ffmpeg")) {
        return NextResponse.json({ error: "ffmpeg not available on server" }, { status: 503 });
      }
      throw err;
    }

    const fileBuf = await fs.readFile(outputPath);
    const dataUrl = `data:video/mp4;base64,${fileBuf.toString("base64")}`;

    return NextResponse.json({
      outputPath,
      dataUrl,
      fileName: path.basename(outputPath),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Compile failed";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    await Promise.all(
      tempFiles.map((p) =>
        fs.rm(p).catch(() => {
          // ignore cleanup errors
        }),
      ),
    );
  }
}
