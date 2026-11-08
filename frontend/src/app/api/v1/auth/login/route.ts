import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Email and password are required." } },
        { status: 400 }
      );
    }

    // Call backend API if running
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
    try {
      const backendRes = await fetch(`${backendUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (backendRes.ok) {
        const data = await backendRes.json();
        const response = NextResponse.json(data);
        if (data.token) {
          response.cookies.set("edito_admin_auth", data.token, {
            path: "/",
            maxAge: 86400,
            sameSite: "strict",
            httpOnly: false,
          });
        }
        return response;
      }
    } catch {
      // Fallback if backend is starting or offline
    }

    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid email or password." } },
      { status: 401 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: err.message || "Authentication failed." } },
      { status: 500 }
    );
  }
}

