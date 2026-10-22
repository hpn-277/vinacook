import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { REF_COOKIE } from "@noodle/core/ref";

export async function proxy(request: NextRequest) {
  const ref = /^\/r\/([^/]+)\/?$/.exec(request.nextUrl.pathname)?.[1];
  if (ref) {
    const response = NextResponse.next();
    response.cookies.set(REF_COOKIE, decodeURIComponent(ref).toUpperCase(), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
    return response;
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/r/:code", "/admin/:path*", "/sale/:path*", "/factory/:path*", "/driver/:path*", "/finance/:path*", "/login", "/set-password"],
};
