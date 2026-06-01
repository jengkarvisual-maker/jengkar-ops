import { NextResponse, type NextRequest } from "next/server";

import { OPS_SESSION_COOKIE } from "@/lib/session";

function hasLocalSessionCookie(request: NextRequest) {
  return Boolean(request.cookies.get(OPS_SESSION_COOKIE)?.value);
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;
  const isProtectedRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/settings");
  const hasAuthCookie = hasLocalSessionCookie(request);

  // Fast-path anonymous requests without doing database work on every click.
  // Authoritative auth/profile checks still happen inside server components and actions.
  if (isProtectedRoute && !hasAuthCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/login"],
};
