import { NextRequest, NextResponse } from "next/server";
import { maskIP, hashIP } from "@/lib/privacy/anonymize";
import { recordEvents, type StoredEvent } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawEvents = Array.isArray(body?.events) ? body.events : [];

    if (rawEvents.length === 0) {
      return NextResponse.json({ ok: true, count: 0 });
    }

    // Extract headers for geo and device without third-party services per PRD 17.4
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "127.0.0.1";
    const country = req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || "US";
    const city = req.headers.get("cf-ipcity") || req.headers.get("x-vercel-ip-city") || "Unknown";
    const ua = req.headers.get("user-agent") || "";

    const ip_masked = maskIP(ip);
    const ip_hash = hashIP(ip);

    // Simple UA parser
    let os = "Desktop OS";
    if (/windows/i.test(ua)) os = "Windows";
    else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
    else if (/android/i.test(ua)) os = "Android";
    else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
    else if (/linux/i.test(ua)) os = "Linux";

    let browser = "Other";
    if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) browser = "Chrome";
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
    else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
    else if (/edg/i.test(ua)) browser = "Edge";

    const mappedEvents: StoredEvent[] = rawEvents.map((e: any, index: number) => ({
      id: `evt-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
      ts: new Date().toISOString(),
      session_hash: e.session_hash || "anon_sess",
      ip_hash,
      ip_masked,
      country_code: country,
      city,
      category: e.category || "general",
      tool: e.tool || "Studio",
      action: e.action || "page_view",
      ok: e.ok !== undefined ? Boolean(e.ok) : true,
      error_type: e.error_type,
      device_class: /mobile|iphone|android/i.test(ua) ? "mobile" : /ipad|tablet/i.test(ua) ? "tablet" : "desktop",
      os,
      browser,
      webgpu_supported: Boolean(e.metadata?.webgpu_supported),
      backend_used: e.backend_used || "webgpu",
      metadata: e.metadata || {},
    }));

    await recordEvents(mappedEvents);

    // Forward to Express backend & MongoDB Atlas if running
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
    try {
      fetch(`${backendUrl}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: mappedEvents }),
      }).catch(() => {});
    } catch {}

    return NextResponse.json({ ok: true, count: mappedEvents.length });
  } catch (error: any) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: error?.message || "Invalid event payload" } }, { status: 400 });
  }
}

