import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

type FileAction = "create" | "append" | "read" | "list";

type FileRequest = {
  action: FileAction;
  path?: string;
  content?: string;
};

const WORKSPACE_ROOT = path.join(process.cwd(), "workspace");

function resolveSafePath(targetPath?: string) {
  const safePath = path.resolve(WORKSPACE_ROOT, targetPath || ".");
  if (!safePath.startsWith(WORKSPACE_ROOT)) {
    throw new Error("Path must stay within /workspace");
  }
  return safePath;
}

async function ensureWorkspace() {
  await fs.mkdir(WORKSPACE_ROOT, { recursive: true });
}

export async function POST(request: Request) {
  try {
    await ensureWorkspace();
    const body = (await request.json()) as FileRequest;
    const action = body.action;
    const targetPath = body.path;

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    if ((action === "create" || action === "append" || action === "read") && !targetPath) {
      return NextResponse.json({ error: "path is required for this action" }, { status: 400 });
    }

    if ((action === "create" || action === "append") && typeof body.content !== "string") {
      return NextResponse.json({ error: "content is required for create/append" }, { status: 400 });
    }

    if (action === "create") {
      const filePath = resolveSafePath(targetPath);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, body.content ?? "", "utf8");
      return NextResponse.json({ ok: true, message: `Created ${path.relative(WORKSPACE_ROOT, filePath)}` });
    }

    if (action === "append") {
      const filePath = resolveSafePath(targetPath);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.appendFile(filePath, body.content ?? "", "utf8");
      return NextResponse.json({ ok: true, message: `Appended to ${path.relative(WORKSPACE_ROOT, filePath)}` });
    }

    if (action === "read") {
      const filePath = resolveSafePath(targetPath);
      const content = await fs.readFile(filePath, "utf8");
      return NextResponse.json({
        ok: true,
        path: path.relative(WORKSPACE_ROOT, filePath),
        content,
      });
    }

    if (action === "list") {
      const dirPath = resolveSafePath(targetPath || ".");
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const files = entries.map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? "dir" : "file",
      }));
      return NextResponse.json({
        ok: true,
        path: path.relative(WORKSPACE_ROOT, dirPath) || ".",
        files,
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("File API error", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
