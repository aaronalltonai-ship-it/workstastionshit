import { Sandbox } from "@e2b/code-interpreter";
import { NextResponse } from "next/server";

import { logError, logEvent } from "@/lib/logger";

const SYSTEM_PROMPT =
  "You are a Python data scientist. Generate concise Python code that can be executed in an isolated notebook. " +
  "Do not include markdown or fences, return only runnable code.";

const smartDashRegex = /[\u2010-\u2015\u2212]/g; // various unicode dashes/minus
const smartQuoteRegex = /[\u2018\u2019\u201C\u201D]/g; // curly quotes
const smartSpaceRegex = /[\u00A0\u2007\u202F]/g; // non-breaking spaces
const zeroWidthRegex = /[\u200B-\u200D\uFEFF]/g; // zero width chars

function sanitizeCode(code: string) {
  return code
    .replace(smartDashRegex, "-")
    .replace(smartQuoteRegex, "'")
    .replace(smartSpaceRegex, " ")
    .replace(zeroWidthRegex, "");
}

const SUPPORTED_MODELS = new Set([
  "groq/compound",
  "groq/compound-mini",
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "meta-llama/llama-guard-4-12b",
]);

export async function POST(request: Request) {
  const started = Date.now();
  const groqKey = process.env.GROQ_API_KEY;
  const e2bKey = process.env.E2B_API_KEY;

  if (!groqKey || !e2bKey) {
    return NextResponse.json(
      { error: "Missing GROQ_API_KEY or E2B_API_KEY. Please set both environment variables." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    prompt?: string;
    code?: string;
    model?: string;
    history?: { role?: string; content?: string }[];
  };
  const prompt = body?.prompt?.trim() || "";
  const codeOverride = body?.code?.trim() || "";
  const requestedModel = body?.model || "groq/compound";
  const model = SUPPORTED_MODELS.has(requestedModel) ? requestedModel : "groq/compound";

  await logEvent({
    source: "e2b-run",
    message: "POST /api/e2b/run start",
    detail: { model, hasPrompt: Boolean(prompt), hasCode: Boolean(codeOverride) },
  });

  if (!prompt && !codeOverride) {
    await logError("e2b-run", "Missing prompt and code");
    return NextResponse.json({ error: "Prompt or code is required." }, { status: 400 });
  }

  let code = codeOverride;
  try {
    if (!code) {
      const historyMessages =
        Array.isArray(body?.history)
          ? body.history
              .map((turn) => {
                const role = turn?.role === "assistant" ? "assistant" : turn?.role === "user" ? "user" : null;
                if (!role || !turn?.content) return null;
                return { role, content: turn.content.toString() };
              })
              .filter(Boolean) as { role: "user" | "assistant"; content: string }[]
          : [];

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
          "Groq-Model-Version": "latest",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...historyMessages,
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_completion_tokens: 800,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!groqResponse.ok) {
        const detail = await groqResponse.text();
        const parsed = (() => {
          try {
            return JSON.parse(detail);
          } catch {
            return null;
          }
        })();
        const message =
          parsed?.error?.message ||
          detail ||
          "Groq request failed. Try another model (e.g., groq/compound).";
        await logError("e2b-run", "Groq completion failed", {
          durationMs: Date.now() - started,
          status: groqResponse.status,
          message,
        });
        return NextResponse.json({ error: message, detail }, { status: 502 });
      }
      const data = await groqResponse.json();
      code = sanitizeCode(data?.choices?.[0]?.message?.content?.trim() || "");
    }

    if (!code) {
      return NextResponse.json({ error: "No code generated." }, { status: 400 });
    }

    const sandbox = await Sandbox.create({ apiKey: e2bKey });
    try {
      const execution = await sandbox.runCode(sanitizeCode(code));
      const outputText =
        execution.text ||
        execution.results?.map((r) => r.text || r.markdown || r.html).filter(Boolean).join("\n") ||
        "";
      const stdout = execution.logs?.stdout?.join("\n") || "";
      const stderr = execution.logs?.stderr?.join("\n") || "";
      const combined = [outputText, stdout, stderr].filter(Boolean).join("\n").trim();

      if (execution.error) {
        await logError("e2b-run", "E2B execution error", {
          durationMs: Date.now() - started,
          message: execution.error.value,
          traceback: execution.error.traceback,
        });
        return NextResponse.json(
          { error: execution.error.value || "Execution error", detail: execution.error.traceback },
          { status: 500 },
        );
      }

      await logEvent({
        source: "e2b-run",
        message: "POST /api/e2b/run success",
        durationMs: Date.now() - started,
        detail: { model, hadStdout: Boolean(stdout), hadStderr: Boolean(stderr) },
      });

      return NextResponse.json({
        output: combined || "Execution completed with no stdout.",
      });
    } finally {
      await sandbox.kill().catch(() => undefined);
    }
  } catch (error) {
    await logError("e2b-run", "POST /api/e2b/run failed", {
      durationMs: Date.now() - started,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "Unexpected error in E2B run." }, { status: 500 });
  }
}
