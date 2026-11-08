import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Inject required Cross-Origin Isolation headers for WebAssembly / SharedArrayBuffer
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");

  // Admin Route Protection per PRD 17.1
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const adminSession = request.cookies.get("edito_admin_auth")?.value;
    
    // In production, check signed session or Supabase auth session
    if (!adminSession) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Admin API Route Protection
  if (pathname.startsWith("/api/v1/admin")) {
    const adminSession = request.cookies.get("edito_admin_auth")?.value;
    const authHeader = request.headers.get("authorization");
    
    // Allow either cookie session or bearer token (or dev bypass when in dev mode if cookie present)
    if (!adminSession && !authHeader) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin privileges required." } },
        { status: 401 }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/v1/admin/:path*",
    "/stems/:path*",
    "/audio/:path*",
    "/creative/:path*",
  ],
};

