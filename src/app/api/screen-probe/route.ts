import { createServerSupabaseClient } from '@/lib/supabase/server';
import { appRole } from '@/lib/auth';
import { probeUrl } from '@/lib/server/probeLink';
import type { ProbeResult } from '@/lib/screenUrl';

/**
 * POST /api/screen-probe  { url }
 *
 * Answers whether a pasted link can be shown on a big screen (see lib/server/probeLink.ts for what is checked and
 * how it stays on the public internet). Only signed-in organizers and screen managers may ask.
 */

export const runtime = 'nodejs';

const json = (body: ProbeResult | { error: string }, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !appRole(user)) return json({ error: 'sign_in_required' }, 401);

  let target: URL;
  try {
    const body = (await request.json()) as { url?: unknown };
    if (typeof body.url !== 'string' || body.url.length > 2000) throw new Error('bad');
    target = new URL(body.url);
  } catch {
    return json({ ok: false, problem: { code: 'invalid', message: 'That does not look like a web address.', hard: true } });
  }

  return json(await probeUrl(target, request.headers.get('origin') || new URL(request.url).origin));
}
