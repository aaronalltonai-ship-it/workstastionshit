import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE_URL = "https://api.sunoapi.org/api/v1";

function getApiKey() {
  return process.env.SUNO_API_KEY || process.env.NEXT_PUBLIC_SUNO_API_KEY;
}

export async function GET(request: Request) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "Missing SUNO_API_KEY" }, { status: 503 });
    }
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    if (!taskId) {
      return NextResponse.json({ error: "taskId is required" }, { status: 400 });
    }

    const res = await fetch(`${BASE_URL}/generate/record-info?taskId=${encodeURIComponent(taskId)}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json();
    if (!res.ok || data?.code && data.code !== 200) {
      const msg = data?.msg || data?.error || `Suno status failed: ${res.status}`;
      return NextResponse.json({ error: msg, detail: data }, { status: res.status || 502 });
    }
    const status = data?.data?.status || data?.status;
    const tracks =
      (Array.isArray(data?.data?.response?.data) && data.data.response.data) ||
      (Array.isArray(data?.data?.data) && data.data.data) ||
      [];

    return NextResponse.json({ status, tracks, raw: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected Suno error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
