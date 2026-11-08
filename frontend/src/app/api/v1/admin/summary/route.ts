import { NextRequest, NextResponse } from "next/server";
import { getSummaryKPIs } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("edito_admin_auth")?.value;
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

  try {
    const res = await fetch(`${backendUrl}/admin/summary`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        totalVisits: data.totalVisitors ?? 0,
        uniqueUsers: data.uniqueUsers ?? 0,
        totalOperations: data.totalOperations ?? 0,
        successfulExports: data.successfulExports ?? 0,
        exportRate: `${data.exportRatePercent ?? 0.0}%`,
        activeLast24h: data.activeLast24Hours ?? 0,
        trendVsPrev: data.totalVisitors > 0 ? "+100%" : "0%",
      });
    }
  } catch {
    // Backend offline or unreachable, fall back to Next.js in-memory store
  }

  const summary = await getSummaryKPIs();
  return NextResponse.json(summary);
}
