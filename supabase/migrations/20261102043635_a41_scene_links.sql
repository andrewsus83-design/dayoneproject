-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) as a41_scene_links.
-- Live screens can show a link: a custom screen of kind 'web' is one web page or embed (a YouTube video, Google
-- Slides, any page that allows framing) that the output page shows inside the screen's frame. Its address is the
-- scene's one media url and must be https (the output page frames it, so no other scheme may ever get there).
-- Pictures and video files from a link keep using the 'images' and 'video' kinds.
alter table public.a41_scenes drop constraint a41_scenes_kind_check;
alter table public.a41_scenes
  add constraint a41_scenes_kind_check check (kind in ('slides', 'images', 'video', 'web'));
alter table public.a41_scenes
  add constraint a41_scenes_web_https check (
    case when kind = 'web'
      then jsonb_typeof(media) = 'array' and jsonb_array_length(media) = 1 and (media->0->>'url') ~* '^https://[^[:space:]]+$'
      else true
    end
  );
