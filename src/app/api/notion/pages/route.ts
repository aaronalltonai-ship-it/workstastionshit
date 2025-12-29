import { NextResponse } from "next/server";

const VERSION = "2025-09-03";

export const runtime = "nodejs";

type Body = {
  title?: string;
  dataSourceId?: string;
  properties?: Record<string, unknown>;
  children?: unknown[];
};

export async function POST(request: Request) {
  try {
    const token = process.env.NOTION_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "NOTION_TOKEN missing" }, { status: 500 });
    }

    const body = (await request.json()) as Body;
    const title = body.title?.trim();
    const dataSourceId = body.dataSourceId?.trim();
    if (!title || !dataSourceId) {
      return NextResponse.json(
        { error: "title and dataSourceId are required" },
        { status: 400 },
      );
    }

    const parent = { type: "data_source_id", data_source_id: dataSourceId };

    const properties: Record<string, unknown> = {
      Title: { title: [{ text: { content: title } }] },
      ...(body.properties || {}),
    };

    const payload: Record<string, unknown> = { parent, properties };
    if (Array.isArray(body.children) && body.children.length) {
      payload.children = body.children;
    }

    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text?.slice(0, 400) || res.statusText },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json({ page: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create Notion page" },
      { status: 500 },
    );
  }
}
