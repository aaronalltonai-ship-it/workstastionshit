import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { validatePasscode } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { passcode } = (await request.json()) as { passcode?: string };
    if (!passcode || typeof passcode !== "string") {
      return NextResponse.json({ error: "Passcode required" }, { status: 400 });
    }
    const result = await validatePasscode(passcode);
    if (!result) {
      return NextResponse.json({ error: "Invalid passcode" }, { status: 401 });
    }
    const cookieStore = await cookies();
    cookieStore.set("auth_session", result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return NextResponse.json({ user: { slug: result.slug, name: result.name } });
  } catch (error) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
