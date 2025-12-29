import { NextResponse } from "next/server";

import { logError, logEvent } from "@/lib/logger";

const SYSTEM_PROMPT =
  "You are a concise agent for the Nebula Workstation. " +
  'Always respond in JSON: { "reply": string, "actions": Action[] }. ' +
  "Actions: " +
  '{ "type": "add_section", "title": string } | ' +
  '{ "type": "add_project", "name": string, "status"?: "Planned"|"Active"|"Blocked"|"Done", "owner"?: string } | ' +
  '{ "type": "add_task", "title": string, "status"?: "Todo"|"Doing"|"Done", "assignee"?: string, "due"?: string } | ' +
  '{ "type": "add_event", "title": string, "date": string, "time"?: string, "owner"?: string } | ' +
  '{ "type": "add_note", "title": string, "content"?: string } | ' +
  '{ "type": "create_file", "path": string, "content"?: string } | ' +
  '{ "type": "append_file", "path": string, "content": string }. ' +
  "Use only safe relative paths under the /workspace folder. " +
  "Keep replies short, no code fences.";

export async function POST(request: Request) {
  const started = Date.now();
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Assistant is not configured. Missing GROQ_API_KEY.",
          reply:
            "Assistant not configured yet. Tell me what you want to buy and I'll guide you once the agent is connected.",
        },
        { status: 503 },
      );
    }

    const { prompt } = (await request.json()) as { prompt?: string };
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }
    await logEvent({
      source: "assistant",
      message: "POST /api/assistant start",
      detail: { promptLength: prompt.length },
    });

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Groq-Model-Version": "latest",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        temperature: 0.35,
        max_completion_tokens: 512,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      return NextResponse.json(
        { error: "Groq request failed", detail: errorText, reply: "Agent request failed. Try again shortly." },
        { status: 502 },
      );
    }

    const data = await groqResponse.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    let reply = content || "No response.";
    let actions: unknown[] = [];
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") {
        reply = parsed.reply ?? reply;
        if (Array.isArray(parsed.actions)) {
          actions = parsed.actions;
        }
      }
    } catch {
      // fall back to plain text
    }

    await logEvent({
      source: "assistant",
      message: "POST /api/assistant success",
      durationMs: Date.now() - started,
      detail: { actions: Array.isArray(actions) ? actions.length : 0 },
    });

    return NextResponse.json({ reply, actions });
  } catch (error) {
    await logError("assistant", "POST /api/assistant failed", {
      durationMs: Date.now() - started,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Unexpected error",
        reply: "Agent is offline. Outline what you want to buy and I'll respond once connected.",
      },
      { status: 502 },
    );
  }
}

