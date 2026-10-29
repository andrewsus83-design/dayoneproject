import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const rawHost = request.headers.get('host') || '';
  // Strip port from hostname for clean domain comparison (e.g. "techunite.all41.app:3000" -> "techunite.all41.app")
  const host = rawHost.split(':')[0].toLowerCase();

  // Root domain default (e.g. "all41.app")
  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'all41.app').toLowerCase();

  // Exclude static assets, internal Next.js paths, favicons, and APIs from proxy rewriting
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/static') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/favicon.ico' ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 1. Check if the request is for the main application root:
  // (e.g. all41.app, www.all41.app, localhost, 127.0.0.1, or local LAN IP like 192.168.88.112)
  const isDirectRoot =
    host === rootDomain ||
    host === `www.${rootDomain}` ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.startsWith('172.');

  if (isDirectRoot) {
    return NextResponse.next();
  }

  // 2. Subdomain check: <clientname>.all41.app or <clientname>.localhost
  let subdomain: string | null = null;

  if (host.endsWith(`.${rootDomain}`)) {
    // Production client subdomain: clientname.all41.app
    subdomain = host.slice(0, -(rootDomain.length + 1));
  } else if (host.endsWith('.localhost')) {
    // Local development client subdomain: clientname.localhost(:3000)
    subdomain = host.slice(0, -'.localhost'.length);
  }

  // Ignore reserved system subdomains
  if (subdomain && subdomain !== 'www' && subdomain !== 'app' && subdomain !== 'admin' && subdomain !== 'api') {
    // If the path already starts with /events/[subdomain], avoid duplicating the prefix
    let targetPath = url.pathname;
    if (!targetPath.startsWith(`/events/${subdomain}`)) {
      targetPath = `/events/${subdomain}${url.pathname === '/' ? '' : url.pathname}`;
    }

    // Alias /games to /play
    if (targetPath.endsWith('/games')) {
      targetPath = targetPath.replace(/\/games$/, '/play');
    }

    url.pathname = targetPath;

    const response = NextResponse.rewrite(url);
    response.headers.set('x-client-subdomain', `${subdomain}.${rootDomain}`);
    response.headers.set('x-event-slug', subdomain);
    return response;
  }

  // 3. Custom Domain Support (Bring Your Own Domain - White Label Add-on)
  // e.g. wedding.ariadaniel.com -> rewrites to custom domain handler
  url.pathname = `/custom/${host}${url.pathname === '/' ? '' : url.pathname}`;
  const response = NextResponse.rewrite(url);
  response.headers.set('x-custom-domain', host);
  return response;
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico).*)'],
};
