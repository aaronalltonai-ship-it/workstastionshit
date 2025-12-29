import { NextResponse } from "next/server";
import { parseSession } from "@/lib/auth";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const SYSTEM_PROMPT =
  "You are a concise song analyst. Given lyrics and optional context, return JSON: " +
  '{ "summary": string, "strengths": string[], "issues": string[], "recommendations": string[], "score": number }. ' +
  "Score is 0-100 (higher is better) and must be a number. Be specific (structure, rhyme, meter, melody cues, vocal phrasing) and keep bullets tight.";

export async function POST(request: Request) {
  const started = Date.now();
  const cookieStore = await cookies();
  const session = await parseSession(cookieStore.get("auth_session")?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 503 });
    }
    const body = (await request.json()) as { lyrics?: string; style?: string; reference?: string };
    const lyrics = body.lyrics?.trim() || "";
    if (!lyrics) {
      return NextResponse.json({ error: "Lyrics are required." }, { status: 400 });
    }
    const style = body.style?.trim() || "general";
    const reference = body.reference?.trim() || "";
    const userPrompt =
      `Lyrics:\n${lyrics}\n\nStyle: ${style}\nReference: ${reference}\n` +
      "Analyze and return JSON only.";

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Groq-Model-Version": "latest",
      },
      body: JSON.stringify({
        model: "groq/compound",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.35,
        max_completion_tokens: 512,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = data?.error?.message || data?.error || res.statusText;
      return NextResponse.json({ error: msg, detail: data }, { status: res.status || 502 });
    }

    let parsed;
    try {
      parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
    } catch {
      parsed = null;
    }
    return NextResponse.json({
      summary: parsed?.summary || "No summary",
      strengths: Array.isArray(parsed?.strengths) ? parsed.strengths : [],
      issues: Array.isArray(parsed?.issues) ? parsed.issues : [],
      recommendations: Array.isArray(parsed?.recommendations) ? parsed.recommendations : [],
      score: typeof parsed?.score === "number" ? parsed.score : null,
      raw: data?.choices?.[0]?.message?.content || "",
      durationMs: Date.now() - started,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Song analysis failed" },
      { status: 500 },
    );
  }
}
