import { NextResponse } from "next/server";

import { logError, logEvent } from "@/lib/logger";

export async function POST(request: Request) {
  const started = Date.now();
  const { password } = (await request.json()) as { password?: string };
  const expected = process.env.STAFF_PASSWORD || "password123";

  if (!password || password !== expected) {
    await logEvent({
      source: "staff-login",
      level: "warn",
      message: "Invalid staff password",
      durationMs: Date.now() - started,
    });
    return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("staff_auth", "true", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12, // 12 hours
  });
  await logEvent({
    source: "staff-login",
    message: "Login success",
    durationMs: Date.now() - started,
  });
  return response;
}
