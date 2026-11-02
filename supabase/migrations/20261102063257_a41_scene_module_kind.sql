-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) as a41_scene_module_kind (version 20261102063257).
-- The shape check below let a module scene without options.module through (a NULL check result passes); the next
-- migration, a41_scene_module_shape_strict, closes that.
--
-- A stage module can be opened in the screen editor like a custom screen: moved or zoomed, with text, pictures and the
-- logo added on top, and effects. That is a scene of kind 'module': options.module names the stage module (the same
-- seven ids a screen's program may name) and it has no media of its own. The output page draws the live module and the
-- editor's changes over it. Programs that name the scene use the existing "scene:<uuid>" source, so the screens
-- trigger and the feed need no change.
alter table public.a41_scenes drop constraint a41_scenes_kind_check;
alter table public.a41_scenes
  add constraint a41_scenes_kind_check check (kind in ('slides', 'images', 'video', 'web', 'module'));
alter table public.a41_scenes
  add constraint a41_scenes_module_shape check (
    case when kind = 'module'
      then jsonb_typeof(media) = 'array' and jsonb_array_length(media) = 0
        and (options->>'module') = any (array['welcome', 'photowall', 'quiz', 'raffle', 'rundown', 'menu', 'sponsors'])
      else true
    end
  );
