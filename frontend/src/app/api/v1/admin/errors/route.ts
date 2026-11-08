import { NextRequest, NextResponse } from "next/server";
import { getErrorLogs } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("edito_admin_auth")?.value;
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

  try {
    const res = await fetch(`${backendUrl}/admin/errors`, {
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

  const errors = await getErrorLogs();
  return NextResponse.json(errors);
}
