-- Once a day, wake the a41-photo-cleanup edge function, but only when there is something to delete:
-- photos removed by guests or organizers, photos past their 30 days after the event, and stray uploads.
select cron.schedule(
  'a41-photo-cleanup',
  '20 19 * * *',
  $cron$
  select net.http_post(
    url := 'https://pmuryumfyekjwqntcypo.supabase.co/functions/v1/a41-photo-cleanup',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"action": "run"}'::jsonb,
    timeout_milliseconds := 5000
  )
  where exists (select 1 from public.a41_expired_photo_paths())
  $cron$
);
