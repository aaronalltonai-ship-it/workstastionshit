import { NextResponse } from "next/server";

const VERSION = "2025-09-03";

function parseIds(raw: string | undefined) {
  return (raw || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export const runtime = "nodejs";

export async function GET() {
  const token = process.env.NOTION_TOKEN;
  const databaseIds = parseIds(process.env.NOTION_DATABASE_IDS);

  if (!token) {
    return NextResponse.json({ error: "NOTION_TOKEN missing" }, { status: 500 });
  }
  if (!databaseIds.length) {
    return NextResponse.json({ databaseIds: [], results: [], version: VERSION, message: "Add NOTION_DATABASE_IDS to .env.local" });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Notion-Version": VERSION,
    "Content-Type": "application/json",
  };

  const results = await Promise.all(
    databaseIds.map(async (id) => {
      try {
        const res = await fetch(`https://api.notion.com/v1/databases/${id}`, {
          headers,
          cache: "no-store",
        });
        if (!res.ok) {
          const text = await res.text();
          return { databaseId: id, status: "error" as const, dataSources: [], error: text?.slice(0, 300) || res.statusText };
        }
        const data = await res.json();
        const title = Array.isArray(data?.title) ? data.title.map((t: any) => t?.plain_text).filter(Boolean).join(" ").trim() : undefined;
        const dataSources = Array.isArray(data?.data_sources)
          ? data.data_sources.map((ds: any) => ({ id: ds?.id, name: ds?.name })).filter((ds) => ds.id)
          : [];
        return { databaseId: id, title, status: "ok" as const, dataSources };
      } catch (error) {
        return {
          databaseId: id,
          status: "error" as const,
          dataSources: [],
          error: error instanceof Error ? error.message : "Request failed",
        };
      }
    }),
  );

  return NextResponse.json({
    databaseIds,
    results,
    version: VERSION,
    message: "Fetched data_sources using Notion-Version 2025-09-03",
  });
}
