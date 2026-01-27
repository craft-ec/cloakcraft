import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Production domain (cloak.craft.ec) - show coming soon page
  if (hostname === 'cloak.craft.ec') {
    // Don't redirect if already on coming-soon or static assets
    if (
      pathname === '/coming-soon' ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.includes('.')
    ) {
      return NextResponse.next();
    }

    // Redirect all other routes to coming soon
    const url = request.nextUrl.clone();
    url.pathname = '/coming-soon';
    return NextResponse.rewrite(url);
  }

  // Demo domain (demo.cloak.craft.ec) or localhost - show full app
  // No restrictions, let everything through
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
