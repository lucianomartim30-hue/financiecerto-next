import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const host = request.headers.get('host') || '';

  // Bloqueia indexação no domínio Vercel — todo tráfego deve ir para financiecerto.com.br
  if (host.includes('vercel.app')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
