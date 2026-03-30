import { NextRequest, NextResponse } from "next/server";

const rateLimit = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20;

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(ip: string): { limited: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimit.get(ip);

  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return { limited: false, remaining: MAX_REQUESTS - 1, resetIn: WINDOW_MS };
  }

  if (record.count >= MAX_REQUESTS) {
    return {
      limited: true,
      remaining: 0,
      resetIn: record.resetTime - now,
    };
  }

  record.count += 1;
  return {
    limited: false,
    remaining: MAX_REQUESTS - record.count,
    resetIn: record.resetTime - now,
  };
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only rate limit API routes, not the UI
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Skip rate limiting for webhook — GitHub needs unrestricted access
  if (pathname.startsWith("/api/webhook/")) {
    return NextResponse.next();
  }

  const ip = getIP(req);
  const { limited, remaining, resetIn } = isRateLimited(ip);

  if (limited) {
    return NextResponse.json(
      {
        error: "Too many requests. Please wait before trying again.",
        retryAfter: Math.ceil(resetIn / 1000),
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(resetIn / 1000)),
          "Retry-After": String(Math.ceil(resetIn / 1000)),
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(MAX_REQUESTS));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  return response;
}

export const config = {
  matcher: "/api/:path*",
};