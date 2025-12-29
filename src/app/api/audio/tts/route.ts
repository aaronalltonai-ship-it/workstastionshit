import { NextResponse } from "next/server";

import { logError, logEvent } from "@/lib/logger";

export const runtime = "nodejs";

const GROQ_TTS_URL = "https://api.groq.com/openai/v1/audio/speech";

function getApiKey() {
  return process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
}

export async function POST(request: Request) {
  const started = Date.now();
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 503 });
    }
    const body = (await request.json()) as {
      input?: string;
      model?: string;
      voice?: string;
      response_format?: string;
      sample_rate?: number;
      speed?: number;
    };
    if (!body?.input || !body?.model || !body?.voice) {
      return NextResponse.json({ error: "input, model, and voice are required" }, { status: 400 });
    }
    const payload = {
      input: body.input,
      model: body.model,
      voice: body.voice,
      response_format: body.response_format || "mp3",
      sample_rate: body.sample_rate,
      speed: body.speed,
    };
    await logEvent({
      source: "audio-tts",
      message: "POST /api/audio/tts start",
      detail: {
        model: payload.model,
        voice: payload.voice,
        responseFormat: payload.response_format,
      },
    });
    const groqRes = await fetch(GROQ_TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!groqRes.ok) {
      const data = await groqRes.json().catch(() => ({}));
      const msg = data?.error?.message || data?.error || data?.msg || groqRes.statusText;
      await logError("audio-tts", "Groq TTS failed", {
        durationMs: Date.now() - started,
        status: groqRes.status,
        message: msg,
      });
      return NextResponse.json({ error: msg, detail: data }, { status: groqRes.status || 502 });
    }
    const arrayBuf = await groqRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuf).toString("base64");
    const fmt = payload.response_format || "mp3";
    const dataUrl = `data:audio/${fmt};base64,${base64}`;
    await logEvent({
      source: "audio-tts",
      message: "POST /api/audio/tts success",
      durationMs: Date.now() - started,
      detail: { responseFormat: fmt },
    });
    return NextResponse.json({ dataUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected TTS error";
    await logError("audio-tts", "POST /api/audio/tts failed", {
      durationMs: Date.now() - started,
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
