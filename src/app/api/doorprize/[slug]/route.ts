import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/doorprize/<slug>
 *
 * The published event's door prizes and their revealed winners, for the big screens and every guest watching on a
 * phone. Names, or guest numbers for anonymous door prizes; never contacts or guest ids (a41_door_prize_public).
 * Every viewer polls this every few seconds, so the CDN caches it for 2 s (served stale for 5 s while it refreshes):
 * the database sees about one query per event every couple of seconds, however many people are watching.
 * Drafts answer 404 here; organizers read them with their own session.
 */

const CACHE = 'public, s-maxage=2, stale-while-revalidate=5';
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function notFound() {
  return Response.json({ error: 'not_found' }, { status: 404, headers: { 'Cache-Control': CACHE } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG.test(slug) || slug.length > 120) return notFound();
  if (!SUPABASE_URL || !PUBLISHABLE_KEY) {
    return Response.json({ error: 'not_configured' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc('a41_door_prize_public', { p_slug: slug });
  if (error) {
    console.error('doorprize feed', slug, error.message);
    return Response.json({ error: 'unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!data) return notFound();
  return Response.json(data, { headers: { 'Cache-Control': CACHE } });
}
