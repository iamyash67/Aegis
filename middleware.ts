import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

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
    return { limited: true, remaining: 0, resetIn: record.resetTime - now };
  }

  record.count += 1;
  return { limited: false, remaining: MAX_REQUESTS - record.count, resetIn: record.resetTime - now };
}

// Public routes that don't need auth
const PUBLIC_ROUTES = ["/", "/login", "/api/auth", "/api/webhook"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Rate limit API routes
  if (pathname.startsWith("/api/")) {
    const ip = getIP(req);
    const { limited, remaining, resetIn } = isRateLimited(ip);

    if (limited) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before trying again.", retryAfter: Math.ceil(resetIn / 1000) },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(MAX_REQUESTS),
            "X-RateLimit-Remaining": "0",
            "Retry-After": String(Math.ceil(resetIn / 1000)),
          },
        }
      );
    }
  }

  // Check auth for protected routes
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/review",
    "/dashboard",
    "/repos",
    "/api/review",
    "/api/feedback",
    "/api/scans",
    "/api/ingest",
    "/api/ingest-repo",
  ],
};