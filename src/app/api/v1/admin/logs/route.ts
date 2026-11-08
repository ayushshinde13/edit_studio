import { NextRequest, NextResponse } from "next/server";
import { getEventsList } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = req.cookies.get("edito_admin_auth")?.value;
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

  try {
    const res = await fetch(`${backendUrl}/admin/logs?${searchParams.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Backend offline or unreachable, fall back to Next.js in-memory store
  }

  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
  const tool = searchParams.get("tool") || undefined;
  const category = searchParams.get("category") || undefined;
  const action = searchParams.get("action") || undefined;
  const country = searchParams.get("country") || undefined;
  const ipSearch = searchParams.get("ipSearch") || undefined;

  const result = await getEventsList({
    page,
    pageSize,
    tool,
    category,
    action,
    country,
    ipSearch,
  });

  return NextResponse.json(result);
}
