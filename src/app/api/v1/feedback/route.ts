import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, deviceInfo } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: { code: "VALIDATION_FAILED", message: "Message is required." } }, { status: 400 });
    }

    // In production, this saves to supabase `feedback` table
    return NextResponse.json({
      ok: true,
      id: `fb-${Date.now()}`,
      message: "Thank you for your feedback! It helps keep Edito completely free.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: error?.message || "Failed to submit feedback." } }, { status: 500 });
  }
}

