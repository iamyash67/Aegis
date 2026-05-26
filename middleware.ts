import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PROTECTED = ["/review", "/dashboard", "/repos"];
const RATE_LIMITED_APIS = ["/api/review", "/api/feedback", "/api/scans", "/api/ingest"];

const rateLimit = new Map<string, { count: number; resetTime: number }>();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimit.get(ip);
  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return false;
  }
  if (record.count >= MAX_REQUESTS) return true;
  record.count += 1;
  return false;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

  // Rate limit APIs
  if (RATE_LIMITED_APIS.some(r => pathname.startsWith(r))) {
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  // Protect pages
  if (PROTECTED.some(r => pathname.startsWith(r))) {
    if (!req.auth) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }
});

export const config = {
  matcher: ["/review", "/dashboard", "/repos", "/api/review", "/api/feedback", "/api/scans", "/api/ingest"],
};