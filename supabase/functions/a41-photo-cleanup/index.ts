// dayoneproject.xyz photo wall retention. Deployed to Supabase project dayoneproject (pmuryumfyekjwqntcypo)
// as `a41-photo-cleanup` with verify_jwt off. Woken once a day by the `a41-photo-cleanup` cron job.
//
// Deletes the files a41_expired_photo_paths() lists from the a41_photos bucket — photos guests or organizers
// removed, photos past their 30 days after the event, and uploads that were never registered — then marks
// those photos removed. Anyone may call it: it only ever deletes what the database already says should go,
// returns counts only, and runs at most a few times an hour.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const BUCKET = 'a41_photos';
const CHUNK = 100;
const MAX_PATHS = 5000; // per run; the next run picks up the rest
const RUNS_PER_HOUR = 6;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const errText = (e: unknown) => String(e instanceof Error ? e.message : e).slice(0, 200);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: allowed } = await admin.rpc('a41_svc_hit', { p_key: 'photo-cleanup', p_max: RUNS_PER_HOUR, p_window_seconds: 3600 });
    if (allowed !== true) return json({ busy: true, deleted: 0, marked: 0 });

    const { data: rows, error } = await admin.rpc('a41_expired_photo_paths');
    if (error) throw new Error(error.message);
    const paths = [...new Set(((rows ?? []) as { storage_path: string }[]).map((r) => r.storage_path))].slice(0, MAX_PATHS);

    let deleted = 0;
    let marked = 0;
    let failed = 0;
    for (let i = 0; i < paths.length; i += CHUNK) {
      const chunk = paths.slice(i, i + CHUNK);
      // Removing a file that is already gone is not an error, so a repeated run is harmless.
      const { data: removed, error: removeError } = await admin.storage.from(BUCKET).remove(chunk);
      if (removeError) {
        failed += chunk.length;
        continue;
      }
      deleted += removed?.length ?? 0;
      const { data: count, error: markError } = await admin.rpc('a41_svc_photo_purged', { p_paths: chunk });
      if (markError) throw new Error(markError.message);
      marked += (count as number | null) ?? 0;
    }

    return json({ listed: paths.length, deleted, marked, failed });
  } catch (e) {
    return json({ error: errText(e) }, 500);
  }
});
