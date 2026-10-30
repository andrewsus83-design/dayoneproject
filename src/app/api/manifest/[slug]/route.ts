import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/manifest/<slug>
 *
 * The web app manifest for one event's guest app, so "Add to Home Screen" installs that event and opens straight
 * on the guest's pass (/events/<slug>/pass) instead of the platform's home page. The name comes from the published
 * event (a41_public_event); sample events and drafts fall back to the slug. Cached for 5 minutes.
 */

const CACHE = 'public, s-maxage=300, stale-while-revalidate=3600';
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const titleCase = (slug: string) => slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

async function eventName(slug: string): Promise<string | null> {
  if (!SUPABASE_URL || !PUBLISHABLE_KEY) return null;
  const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc('a41_public_event', { p_slug: slug });
  if (error || !data) return null;
  return (data as { name?: string }).name?.trim() || null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG.test(slug) || slug.length > 120) {
    return Response.json({ error: 'not_found' }, { status: 404, headers: { 'Cache-Control': CACHE } });
  }

  const name = (await eventName(slug)) ?? titleCase(slug);
  const base = `/events/${slug}`;
  const manifest = {
    id: `${base}/pass`,
    name: `${name} · Guest`,
    short_name: name.length > 12 ? 'Day One' : name,
    description: `Your QR pass, games, door prizes and camera for ${name}.`,
    start_url: `${base}/pass`,
    scope: `${base}/`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#09090B',
    theme_color: '#09090B',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': CACHE },
  });
}
