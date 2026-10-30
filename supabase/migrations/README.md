# a41 migrations

Shared Supabase project: never run `supabase db push` from this repo; apply a41 migrations individually.

The database (project `dayoneproject`, `pmuryumfyekjwqntcypo`) also holds other products' tables (`cf_*`, `wos_*`).
`supabase db push` works on the whole project's migration history, which this repo does not own.

- Every file here is one applied migration, named `<version>_<name>.sql` with the exact version and name recorded in
  `supabase_migrations.schema_migrations`. Together they rebuild the a41 schema in order.
- Apply a new migration on its own (for example with the Supabase MCP `apply_migration` tool, name starting with `a41_`),
  then save it here under the version the database recorded for it, not a hand-picked timestamp.
- Only create `a41_` objects (helpers go in the `a41_private` schema). Never touch other prefixes.
