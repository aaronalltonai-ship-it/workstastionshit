import crypto from "crypto";
import { NextResponse } from "next/server";

// Notion webhooks deliver JSON with an optional signature header. We log the
// event and, if a signing secret is configured, compute an HMAC for visibility.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    const notionSignature = request.headers.get("Notion-Signature") || request.headers.get("X-Notion-Signature");
    const signingSecret = process.env.NOTION_SIGNING_SECRET;

    let computedSignature: string | null = null;
    if (signingSecret && rawBody) {
      // HMAC-SHA256 of the raw body. Notion expects a hex digest.
      computedSignature = crypto.createHmac("sha256", signingSecret).update(rawBody, "utf8").digest("hex");
    }

    let payload: unknown = null;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      // Leave payload null if JSON is invalid; still acknowledge.
    }

    console.log("Notion webhook received", {
      signatureHeader: notionSignature,
      computedSignature,
      hasSigningSecret: Boolean(signingSecret),
      payload,
    });

    if (signingSecret && notionSignature && computedSignature && notionSignature !== computedSignature) {
      return NextResponse.json({ ok: false, error: "Signature mismatch" }, { status: 401 });
    }

    return NextResponse.json({ ok: true, received: Boolean(payload) });
  } catch (error) {
    console.error("Notion webhook error", error);
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 });
  }
}
