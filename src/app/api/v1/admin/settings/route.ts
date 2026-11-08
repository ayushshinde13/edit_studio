import { NextRequest, NextResponse } from "next/server";
import { getAdminSettings, updateAdminSettings } from "@/lib/supabase/server";

export async function GET() {
  const settings = await getAdminSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await updateAdminSettings(body);
    return NextResponse.json({ ok: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error.message } }, { status: 500 });
  }
}

