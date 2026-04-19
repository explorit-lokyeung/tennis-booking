import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiter (per-IP)
// For production scale, use Redis/Upstash instead
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS: Record<string, number> = {
  '/api/': 60,        // general API
  '/login': 10,        // login attempts
  '/forgot-password': 5, // password reset
  '/api/auth': 10,     // auth endpoints
};

function getLimit(pathname: string): number {
  for (const [prefix, limit] of Object.entries(MAX_REQUESTS)) {
    if (pathname.startsWith(prefix)) return limit;
  }
  return 120; // default
}

function cleanupExpired() {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}

export function middleware(request: NextRequest) {
  // Only rate limit POST requests and auth pages
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // Skip static assets and GET requests (except auth pages)
  const shouldLimit = method === 'POST' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/api/');

  if (!shouldLimit) return NextResponse.next();

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') || 'unknown';
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const limit = getLimit(pathname);

  // Cleanup periodically
  if (Math.random() < 0.01) cleanupExpired();

  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  entry.count++;
  if (entry.count > limit) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(limit - entry.count));
  return response;
}

export const config = {
  matcher: ['/api/:path*', '/login', '/forgot-password'],
};
