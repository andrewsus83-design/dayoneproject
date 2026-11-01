import { createClient } from '@supabase/supabase-js';
import { frameDocument, type PageFile } from '@/lib/customHtml';

/**
 * GET /events/<slug>/site
 *
 * The event's uploaded landing page (Landing Page → Custom HTML), as the sandboxed frame on /events/<slug> loads it.
 * Only a published event's saved page is served (a41_public_event). next.config.ts gives this path its own security
 * header: the page runs sandboxed, cut off from the app's cookies and storage, and may load its own scripts, fonts
 * and pictures. Cached for 30 seconds; the page address carries a revision, so a new upload is fetched at once.
 */

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface PublicLanding {
  mode?: string;
  html?: string;
  htmlFiles?: PageFile[];
}

const text = (body: string, status: number) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=30' } });

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG.test(slug) || slug.length > 120 || !SUPABASE_URL || !PUBLISHABLE_KEY) return text('Not found', 404);

  const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc('a41_public_event', { p_slug: slug });
  if (error) return text('This page could not be loaded.', 502);
  const landing = (data as { site?: { landing?: PublicLanding } } | null)?.site?.landing;
  if (!landing || landing.mode !== 'html' || !landing.html) return text('Not found', 404);

  return new Response(frameDocument(landing.html, landing.htmlFiles ?? []), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=120' },
  });
}
