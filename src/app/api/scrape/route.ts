import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 500_000; // cap downloaded bytes to avoid huge pages
const TIMEOUT_MS = 12000;

function safeUrl(input: string) {
  try {
    const url = new URL(input);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function extractBetween(html: string, start: string, end: string) {
  const s = html.indexOf(start);
  if (s === -1) return "";
  const e = html.indexOf(end, s + start.length);
  if (e === -1) return "";
  return html.slice(s + start.length, e);
}

function parseMeta(html: string, name: string) {
  const regex = new RegExp(`<meta[^>]+(?:name|property)=[\"']${name}[\"'][^>]*>`, "i");
  const match = html.match(regex);
  if (!match) return "";
  const contentMatch = match[0].match(/content=[\"']([^\"']+)[\"']/i);
  return contentMatch ? contentMatch[1] : "";
}

function stripTags(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
}

export async function POST(request: Request) {
  const started = Date.now();
  try {
    const body = (await request.json()) as { url?: string };
    const normalized = body?.url ? safeUrl(body.url.trim()) : null;
    if (!normalized) {
      return NextResponse.json({ error: "Valid http/https URL is required." }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(normalized, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: `Request failed with status ${res.status}` }, { status: 502 });
    }

    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      let received = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        received += chunk.value.length;
        if (received > MAX_BYTES) break;
        html += new TextDecoder().decode(chunk.value);
      }
    } else {
      html = (await res.text()).slice(0, MAX_BYTES);
    }

    const title = extractBetween(html, "<title>", "</title>").trim();
    const description = parseMeta(html, "description");
    const ogTitle = parseMeta(html, "og:title");
    const ogDescription = parseMeta(html, "og:description");
    const ogImage = parseMeta(html, "og:image");
    const h1s = (html.match(/<h1[^>]*>/gi) || []).length;
    const h2s = (html.match(/<h2[^>]*>/gi) || []).length;
    const links = (html.match(/<a\s+[^>]*href=/gi) || []).length;
    const text = stripTags(html).replace(/\s+/g, " ").trim();
    const words = text ? text.split(" ").filter(Boolean).length : 0;

    return NextResponse.json({
      url: normalized,
      fetchedMs: Date.now() - started,
      title,
      description,
      ogTitle,
      ogDescription,
      ogImage,
      counts: { h1s, h2s, links, words },
      snippet: text.slice(0, 1000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scrape failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
