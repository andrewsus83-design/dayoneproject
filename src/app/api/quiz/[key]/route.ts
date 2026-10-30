import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * GET /api/quiz/<play key>
 *
 * The live trivia state every guest phone polls about once a second (a41_quiz_public_state: phase, the open
 * question and its answer window, answered counts, the reveal and the top 10). It is the same for every phone,
 * so the CDN keeps it for 1 s and serves it stale for 2 s more while it refreshes: with ~1,500 phones in the
 * room the database still sees about one query per second per CDN region. Personal state (my answer, my
 * score) stays with the guest RPCs, which phones call only when they join, answer, or a reveal lands.
 */

const CACHE = 'public, s-maxage=1, stale-while-revalidate=2';
// a41_game_keys.play_key: a uuid without dashes.
const KEY = /^[0-9a-f]{32}$/;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !PUBLISHABLE_KEY) return null;
  client ??= createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

function notFound() {
  return Response.json({ error: 'not_found' }, { status: 404, headers: { 'Cache-Control': CACHE } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!KEY.test(key)) return notFound();
  const db = supabase();
  if (!db) return Response.json({ error: 'not_configured' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });

  const { data, error } = await db.rpc('a41_quiz_public_state', { p_key: key });
  if (error) {
    console.error('quiz state', error.message);
    return Response.json({ error: 'unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
  // Unknown key, or the event is not published.
  if (!data) return notFound();
  return Response.json(data, { headers: { 'Cache-Control': CACHE } });
}
