import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { appRole, assignedRole, canOpenStaffPage, canUseDashboard, homePath, isPlatformAdmin } from '@/lib/auth';

// The dashboard lives on app.<root>; each event on <slug>.<root>. The root itself is the Day One Project website.
const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dayoneproject.xyz').toLowerCase();
// Retired domain: old links keep working by redirecting to the same page on the new domain.
const LEGACY_DOMAIN = 'all41.app';
const RESERVED = new Set(['www', 'app', 'admin', 'api']);

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const rawHost = request.headers.get('host') || '';
  // Strip port from hostname for clean domain comparison (e.g. "app.dayoneproject.xyz:3000" -> "app.dayoneproject.xyz")
  const host = rawHost.split(':')[0].toLowerCase();

  // 0. all41.app is retired: send every old link to the same page on app.dayoneproject.xyz.
  // Event subdomains (popverse.all41.app/pass) become app.dayoneproject.xyz/events/popverse/pass.
  if (host === LEGACY_DOMAIN || host.endsWith(`.${LEGACY_DOMAIN}`)) {
    const sub = host === LEGACY_DOMAIN ? '' : host.slice(0, -(LEGACY_DOMAIN.length + 1));
    const path = !sub || RESERVED.has(sub) || url.pathname.startsWith(`/events/${sub}`)
      ? url.pathname
      : `/events/${sub}${url.pathname === '/' ? '' : url.pathname}`;
    return NextResponse.redirect(new URL(path + url.search, `https://app.${ROOT_DOMAIN}`), 308);
  }

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

  // 1. Main application: app.dayoneproject.xyz, Vercel preview URLs, localhost or a LAN IP (e.g. 192.168.88.112)
  const isDirectRoot =
    host === ROOT_DOMAIN ||
    host === `www.${ROOT_DOMAIN}` ||
    host === `app.${ROOT_DOMAIN}` ||
    host.endsWith('.vercel.app') ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    host.startsWith('172.');

  if (isDirectRoot) {
    if (['/dashboard', '/admin', '/desk', '/screen'].some((p) => url.pathname.startsWith(p))) {
      return guard(request);
    }
    return NextResponse.next();
  }

  // 2. Subdomain check: <clientname>.dayoneproject.xyz or <clientname>.localhost
  let subdomain: string | null = null;

  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    // Client subdomain: clientname.dayoneproject.xyz (only reaches this app if pointed here)
    subdomain = host.slice(0, -(ROOT_DOMAIN.length + 1));
  } else if (host.endsWith('.localhost')) {
    // Local development client subdomain: clientname.localhost(:3000)
    subdomain = host.slice(0, -'.localhost'.length);
  }

  // Ignore reserved system subdomains
  if (subdomain && !RESERVED.has(subdomain)) {
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
    response.headers.set('x-client-subdomain', `${subdomain}.${ROOT_DOMAIN}`);
    response.headers.set('x-event-slug', subdomain);
    return response;
  }

  // 3. Any other host pointed at this app (custom domains are not offered yet): send it to the app.
  return NextResponse.redirect(new URL(url.pathname + url.search, `https://app.${ROOT_DOMAIN}`), 307);
}

/**
 * /dashboard needs a signed-in organizer or admin, /desk an organizer or the register desk, /screen an organizer
 * or a screen manager, /admin a platform admin.
 * Platform-admin rights come from the database (a41_whoami().isAdmin: the admin email signed in with the
 * authenticator), never from the email alone. Also refreshes the Supabase session cookie on the way through.
 */
async function guard(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname, search } = request.nextUrl;

  const redirect = (to: string) => {
    const res = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  const next = encodeURIComponent(pathname + search);
  if (!user) return redirect(`/login?next=${next}`);
  if (!appRole(user)) return redirect('/login?error=no_access');

  // /admin, and accounts whose only access is the platform-admin email, need an authenticator session.
  if (pathname.startsWith('/admin') || !assignedRole(user)) {
    const { data: me } = await supabase.rpc('a41_whoami');
    if (!me?.isAdmin) {
      if (isPlatformAdmin(user)) return redirect(`/login?as=owner&error=authenticator&next=${next}`);
      return redirect(homePath(user));
    }
  }
  // Register-desk staff only see the desk, and screen managers only the screen switcher.
  if (pathname.startsWith('/dashboard') && !canUseDashboard(user)) return redirect(homePath(user));
  if ((pathname.startsWith('/desk') || pathname.startsWith('/screen')) && !canOpenStaffPage(user, pathname)) return redirect(homePath(user));
  return response;
}

export const config = {
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico).*)'],
};
