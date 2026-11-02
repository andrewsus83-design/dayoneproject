-- Applied to Supabase project dayoneproject (pmuryumfyekjwqntcypo) as a41_scene_module_shape_strict (version 20261102063330).
-- The first version of a41_scenes_module_shape treated a module scene with no options.module as passing, because a
-- CHECK that evaluates to NULL passes. A module scene must name one of the stage modules: anything else is refused.
alter table public.a41_scenes drop constraint a41_scenes_module_shape;
alter table public.a41_scenes
  add constraint a41_scenes_module_shape check (
    case when kind = 'module'
      then coalesce(
        jsonb_typeof(media) = 'array' and jsonb_array_length(media) = 0
          and (options->>'module') = any (array['welcome', 'photowall', 'quiz', 'raffle', 'rundown', 'menu', 'sponsors']),
        false)
      else true
    end
  );
