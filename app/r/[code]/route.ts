import { NextResponse } from "next/server";
import { REF_COOKIE } from "@/lib/orders";

export async function GET(request: Request, ctx: RouteContext<"/r/[code]">) {
  const { code } = await ctx.params;
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(REF_COOKIE, code.toUpperCase(), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
  return response;
}
