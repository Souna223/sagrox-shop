import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const ADMIN_ROLES = new Set(["ADMIN", "MANAGER", "EMPLOYEE"]);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const isBlocked = req.auth?.user?.isBlocked;

  const isAdminArea = nextUrl.pathname.startsWith("/admin");
  const isAccountArea = nextUrl.pathname.startsWith("/conta");

  if (isBlocked) {
    return NextResponse.redirect(new URL("/login?error=blocked", nextUrl));
  }

  if (isAdminArea) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", nextUrl);
      loginUrl.searchParams.set("callbackUrl", "/admin");
      return NextResponse.redirect(loginUrl);
    }
    if (!role || !ADMIN_ROLES.has(role)) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  if (isAccountArea && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/conta/:path*"],
};
