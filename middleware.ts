import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

import { JWT_SECRET } from '@/lib/env';
const secretKey = new TextEncoder().encode(JWT_SECRET);

const PUBLIC_ROUTES = ['/login', '/api/auth/login', '/api/auth/verify'];
const PROTECTED_ROUTES = ['/dashboard', '/transactions'];

async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secretKey);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow public API routes
  if (pathname.startsWith('/api/') && PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Check token for protected routes
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const isValid = await verifyToken(token);
    if (!isValid) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
  }

  // Redirect logged-in users from login page to dashboard
  if (pathname === '/login') {
    const token = request.cookies.get('auth-token')?.value;
    if (token) {
      const isValid = await verifyToken(token);
      if (isValid) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
