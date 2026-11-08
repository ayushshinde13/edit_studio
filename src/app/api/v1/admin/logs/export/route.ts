import { NextRequest, NextResponse } from "next/server";
import { getEventsList } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "csv";
  const { items } = await getEventsList({ page: 1, pageSize: 5000 });

  if (format === "json") {
    return new NextResponse(JSON.stringify(items, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="edito_analytics_logs.json"',
      },
    });
  }

  // Generate CSV
  const headers = ["Timestamp", "IP_Masked", "Country", "City", "Category", "Tool", "Action", "Status", "Device", "OS", "Browser", "Backend"];
  const rows = items.map((e) => [
    `"${e.ts}"`,
    `"${e.ip_masked}"`,
    `"${e.country_code}"`,
    `"${e.city}"`,
    `"${e.category}"`,
    `"${e.tool}"`,
    `"${e.action}"`,
    `"${e.ok ? "Success" : e.error_type || "Failed"}"`,
    `"${e.device_class}"`,
    `"${e.os}"`,
    `"${e.browser}"`,
    `"${e.backend_used || "webgpu"}"`,
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="edito_analytics_logs.csv"',
    },
  });
}

