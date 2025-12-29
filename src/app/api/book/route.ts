import { NextResponse } from "next/server";
import { logError, logEvent } from "@/lib/logger";

export const runtime = "nodejs";

const SYSTEM_PROMPT =
  "You are a concise book generator. Produce a clear outline and chapter drafts. " +
  "Output JSON: { outline: string[], chapters: { title: string, content: string }[] }. " +
  "Keep chapters tight, engaging, and avoid repetition.";

type Body = {
  title?: string;
  genre?: string;
  tone?: string;
  chapters?: string[];
  wordsPerChapter?: number;
};

export async function POST(request: Request) {
  const started = Date.now();
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 503 });
    }

    const body = (await request.json()) as Body;
    const title = body.title?.trim() || "Untitled Book";
    const genre = body.genre?.trim() || "General";
    const tone = body.tone?.trim() || "Neutral";
    const chapters = Array.isArray(body.chapters) && body.chapters.length ? body.chapters : ["Chapter 1"];
    const wordsPerChapter = typeof body.wordsPerChapter === "number" && body.wordsPerChapter > 50 ? body.wordsPerChapter : 400;

    await logEvent({
      source: "book",
      message: "POST /api/book start",
      detail: { chapters: chapters.length, wordsPerChapter, title, genre },
    });

    const prompt =
      `Title: ${title}\nGenre: ${genre}\nTone: ${tone}\nChapters:\n` +
      chapters.map((c, i) => `${i + 1}. ${c}`).join("\n") +
      `\nWrite an outline and chapter drafts. Target ${wordsPerChapter} words per chapter. Return JSON only.`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
        max_completion_tokens: 2048,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = data?.error?.message || data?.error || res.statusText;
      await logError("book", "Groq completion failed", {
        durationMs: Date.now() - started,
        status: res.status,
        message: msg,
      });
      return NextResponse.json({ error: msg, detail: data }, { status: res.status || 502 });
    }

    const content = data?.choices?.[0]?.message?.content || "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = null;
    }
    const outline = Array.isArray((parsed as { outline?: unknown })?.outline) ? (parsed as { outline: string[] }).outline : [];
    const chaptersOut =
      Array.isArray((parsed as { chapters?: unknown })?.chapters) && (parsed as { chapters: unknown[] }).chapters.length
        ? (parsed as { chapters: { title?: string; content?: string }[] }).chapters
        : [];

    await logEvent({
      source: "book",
      message: "POST /api/book success",
      durationMs: Date.now() - started,
      detail: { outline: outline.length, chapters: chaptersOut.length },
    });

    return NextResponse.json({
      outline,
      chapters: chaptersOut,
      raw: content,
    });
  } catch (error) {
    await logError("book", "POST /api/book failed", {
      durationMs: Date.now() - started,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "Book generation failed" }, { status: 500 });
  }
}
