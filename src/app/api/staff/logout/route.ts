import { NextResponse } from "next/server";

import { logEvent } from "@/lib/logger";

export async function POST() {
  const started = Date.now();
  const response = NextResponse.json({ ok: true });
  response.cookies.set("staff_auth", "", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
  });
  await logEvent({
    source: "staff-logout",
    message: "Logout success",
    durationMs: Date.now() - started,
  });
  return response;
}
