import { NextResponse } from "next/server";
import { COOKIE } from "./lib/session.js";

export const config = { matcher: ["/admin/:path*"] };

// Quick first gate: no sign-in cookie means go to the login page. (The pages and actions check the cookie properly against the database.)
export function middleware(req) {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/admin/login" || pathname === "/admin/setup") return NextResponse.next();
  if (req.cookies.get(COOKIE)?.value) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}
