import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(
      ({ name }) => name.startsWith("sb-") && name.includes("-auth-token"),
    );
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  if (!isSupabaseConfigured()) {
    return response;
  }

  const pathname = request.nextUrl.pathname;
  const isProtectedRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/settings");
  const hasAuthCookie = hasSupabaseAuthCookie(request);

  // Fast-path anonymous requests without calling Supabase on every click.
  // Authoritative auth/profile checks still happen inside server components and actions.
  if (isProtectedRoute && !hasAuthCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/login"],
};
