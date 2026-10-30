import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/stage/<slug>
 *
 * What the published event's stage LED screen shows: the module on screen, auto-rotate and slide times, the ticker,
 * the door prize on stage with its latest revealed winner, the check-in count and the open trivia game's join code
 * (a41_stage_public). Stage screens poll this every second or two, so the CDN caches it for 1 s (served stale for
 * 2 s while it refreshes). Drafts answer 404 here; organizers read them with their own session.
 */

const CACHE = 'public, s-maxage=1, stale-while-revalidate=2';
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
  const { data, error } = await supabase.rpc('a41_stage_public', { p_slug: slug });
  if (error) {
    console.error('stage feed', slug, error.message);
    return Response.json({ error: 'unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!data) return notFound();
  return Response.json(data, { headers: { 'Cache-Control': CACHE } });
}
