import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/photowall/<slug>/<wall key>
 *
 * Approved photos for the live wall and the guests' album. Every screen and phone polls this every few
 * seconds, so the response is cached at the CDN for 3 s (and served stale for 10 s while it refreshes):
 * the database sees about one query per event every few seconds, however many people are watching.
 * The key sits in the path so every CDN keeps one cached copy per wall.
 */

const CACHE = 'public, s-maxage=3, stale-while-revalidate=10';
const LIMIT = 120;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const KEY = /^[A-Za-z0-9_-]{32,128}$/;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface FeedRow {
  event: { name: string; slug: string };
  enabled: boolean;
  captions?: boolean;
  total: number;
  photos: { id: string; storage_path: string; approved_at: string; caption?: string | null; name?: string | null }[];
}

function notFound() {
  return Response.json({ error: 'not_found' }, { status: 404, headers: { 'Cache-Control': CACHE } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; key: string }> }) {
  const { slug, key } = await params;
  if (!SLUG.test(slug) || !KEY.test(key)) return notFound();
  if (!SUPABASE_URL || !PUBLISHABLE_KEY) {
    return Response.json({ error: 'not_configured' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc('a41_wall_feed', { p_slug: slug, p_key: key, p_limit: LIMIT });
  if (error) {
    console.error('photowall feed', slug, error.message);
    return Response.json({ error: 'unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
  const feed = data as FeedRow | null;
  if (!feed) return notFound();

  const base = `${SUPABASE_URL}/storage/v1/object/public/a41_photos/`;
  return Response.json(
    {
      event: { name: feed.event.name, slug: feed.event.slug },
      enabled: feed.enabled,
      captions: feed.captions ?? true,
      total: feed.total,
      photos: feed.photos.map((p) => ({
        id: p.id,
        url: base + p.storage_path,
        caption: p.caption ?? null,
        name: p.name ?? null,
        approved_at: p.approved_at,
      })),
    },
    { headers: { 'Cache-Control': CACHE } },
  );
}
