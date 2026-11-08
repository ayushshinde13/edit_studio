import { NextResponse } from "next/server";
import { AI_MODELS } from "@/config/models";

export async function GET() {
  return NextResponse.json(
    {
      models: AI_MODELS,
      updated_at: new Date().toISOString(),
      cache_ttl_seconds: 86400,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    }
  );
}

