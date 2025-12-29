import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE_URL = "https://api.sunoapi.org/api/v1";

function getApiKey() {
  return process.env.SUNO_API_KEY || process.env.NEXT_PUBLIC_SUNO_API_KEY;
}

export async function POST(request: Request) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "Missing SUNO_API_KEY" }, { status: 503 });
    }
    const body = (await request.json()) as {
      prompt?: string;
      model?: string;
      customMode?: boolean;
      instrumental?: boolean;
      style?: string;
      title?: string;
      callBackUrl?: string;
    };
    const prompt = body?.prompt?.trim();
    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }
    const payload = {
      prompt,
      model: body?.model || "V4_5ALL",
      customMode: Boolean(body?.customMode),
      instrumental: Boolean(body?.instrumental),
      style: body?.style,
      title: body?.title,
      callBackUrl: body?.callBackUrl,
    };
    const res = await fetch(`${BASE_URL}/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || data?.code && data.code !== 200) {
      const msg = data?.msg || data?.error || `Suno generate failed: ${res.status}`;
      return NextResponse.json({ error: msg, detail: data }, { status: res.status || 502 });
    }
    const taskId = data?.data?.taskId || data?.data?.task_id || "";
    return NextResponse.json({ taskId, raw: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected Suno error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
