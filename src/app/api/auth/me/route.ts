import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const session = await parseSession(cookieStore.get("auth_session")?.value);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({ authenticated: true, user: session });
}
