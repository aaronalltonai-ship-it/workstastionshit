import { NextResponse } from "next/server";

const SYSTEM_PROMPT =
  "You are the iLLCo Ai agent builder. Respond with concise, actionable output. " +
  "When possible, return JSON aligned to the provided schema.";

// Only these Groq models support the reasoning_effort flag.
const REASONING_MODELS = new Set(["gpt-oss-120b", "groq-compound"]);
// Structured outputs (response_format / JSON schema) are supported only on these models.
const STRUCTURED_OUTPUT_MODELS = new Set(["gpt-oss-120b", "groq-compound"]);
const DEFAULT_TOOLS = ["web_search", "code_interpreter", "visit_website", "browser_automation"];

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 503 });
    }

    let body: {
      prompt?: string;
      model?: string;
      temperature?: number;
      tools?: unknown;
      schema?: unknown;
      history?: { role?: string; content?: string }[];
      reasoning_effort?: string;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const prompt = body?.prompt?.toString() ?? "";
    if (!prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const model = body?.model?.toString() || "llama-3.1-8b-instant";
    const temperature = typeof body?.temperature === "number" ? body.temperature : 0.5;
    const reasoning = body?.reasoning_effort;
    const normalizeTools = (input: unknown): { type: string; function?: unknown; mcp?: unknown }[] => {
      if (!Array.isArray(input)) return [];
      return input
        .map((entry) => {
          if (entry && typeof entry === "object" && typeof (entry as { type?: unknown }).type === "string") {
            const type = (entry as { type: string }).type;
            if (type === "function" || type === "mcp") return entry as { type: string };
          }
          return null;
        })
        .filter((item): item is { type: string; function?: unknown; mcp?: unknown } => Boolean(item));
    };

    const tools = normalizeTools(
      Array.isArray(body?.tools)
        ? body.tools
        : body?.tools && typeof body.tools === "object" && Array.isArray((body.tools as { enabled_tools?: unknown }).enabled_tools)
          ? (body.tools as { enabled_tools?: unknown[] }).enabled_tools
          : undefined,
    );

    const historyMessages =
      Array.isArray(body?.history)
        ? body.history
            .map((turn) => {
              const role =
                turn?.role === "assistant" ? "assistant" : turn?.role === "user" ? "user" : null;
              if (!role || !turn?.content) return null;
              return { role, content: turn.content.toString() };
            })
            .filter(Boolean) as { role: "user" | "assistant"; content: string }[]
        : [];

    const payload: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...historyMessages,
        { role: "user", content: prompt },
      ],
      temperature,
      max_completion_tokens: 8000,
    };
    if (tools.length) {
      payload.tools = tools;
    }

    if (reasoning && REASONING_MODELS.has(model)) {
      payload.reasoning_effort = reasoning;
    }

    if (body?.schema && STRUCTURED_OUTPUT_MODELS.has(model)) {
      payload.response_format = {
        type: "json_schema",
        json_schema: {
          name: "compound_schema",
          schema: body.schema,
        },
      };
    }

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Groq-Model-Version": "latest",
      },
      body: JSON.stringify(payload),
    });

    if (!groqResponse.ok) {
      const detailText = await groqResponse.text();
      let message = "Groq request failed";
      try {
        const parsed = JSON.parse(detailText);
        message = parsed?.error?.message || parsed?.message || message;
      } catch {
        // ignore parse errors
      }
      return NextResponse.json({ error: message, detail: detailText }, { status: 502 });
    }

    const data = await groqResponse.json();
    const output = data?.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ output });
  } catch (error) {
    console.error("groq-compound error", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
