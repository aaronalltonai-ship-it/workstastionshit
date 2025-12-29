import { NextResponse } from "next/server";

const VERSION = "2025-09-03";
export const runtime = "nodejs";

type Body = {
  dataSourceId?: string;
  query?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const token = process.env.NOTION_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "NOTION_TOKEN missing" }, { status: 500 });
    }
    const body = (await request.json()) as Body;
    const dataSourceId = body.dataSourceId?.trim();
    if (!dataSourceId) {
      return NextResponse.json({ error: "dataSourceId is required" }, { status: 400 });
    }

    const res = await fetch(`https://api.notion.com/v1/data_sources/${dataSourceId}/query`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body.query || {}),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text?.slice(0, 400) || res.statusText },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json({ results: data?.results ?? [], raw: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to query data source" },
      { status: 500 },
    );
  }
}
