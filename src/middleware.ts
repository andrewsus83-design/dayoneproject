import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Get root domain from environment (defaults to all41.app or localhost:3000)
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';

  // Exclude internal Next.js paths, static files, and APIs that shouldn't be rewritten
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/static') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Normalize hostname (remove port for clean comparison if needed, or keep for localhost)
  const isLocalhost = hostname.includes('localhost');
  const isRootDomain =
    hostname === rootDomain ||
    hostname === `www.${rootDomain}` ||
    (isLocalhost && !hostname.includes('.localhost'));

  // 1. Root Domain -> Main App & Marketing & Dashboard
  if (isRootDomain) {
    return NextResponse.next();
  }

  // 2. Subdomain routing (e.g. wedding-dina-budi.all41.app or demo.localhost:3000)
  let subdomain: string | null = null;
  if (isLocalhost && hostname.endsWith('.localhost:3000')) {
    subdomain = hostname.replace('.localhost:3000', '');
  } else if (!isLocalhost && hostname.endsWith(`.${rootDomain}`)) {
    subdomain = hostname.replace(`.${rootDomain}`, '');
  }

  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    // Rewrite to the event page route: /events/[slug]/...
    url.pathname = `/events/${subdomain}${url.pathname === '/' ? '' : url.pathname}`;
    const response = NextResponse.rewrite(url);
    response.headers.set('x-event-slug', subdomain);
    return response;
  }

  // 3. Custom Domain (Bring Your Own Domain - White Label)
  // Rewrite to custom domain handler
  url.pathname = `/custom/${hostname}${url.pathname === '/' ? '' : url.pathname}`;
  const response = NextResponse.rewrite(url);
  response.headers.set('x-custom-domain', hostname);
  return response;
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico).*)'],
};
