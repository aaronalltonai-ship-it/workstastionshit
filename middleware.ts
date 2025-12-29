import { NextResponse, type NextRequest } from "next/server";
import { parseSession } from "@/lib/auth";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/api/auth/login",
  "/api/auth/me",
  "/api/products",
  "/_next",
  "/favicon.ico",
  "/manifest.webmanifest",
  "/file.svg",
  "/globe.svg",
  "/window.svg",
  "/icons",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = await parseSession(request.cookies.get("auth_session")?.value);
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
