// HB Bank — Supabase configuration.
//
// These two values are PUBLIC by design. The anon / publishable key is meant to
// ship in the browser; data security is enforced by Row-Level Security in the
// database (see supabase/migrations/0001_init.sql), not by hiding this key.
//
// They will be filled in automatically when the Supabase project is provisioned.
// To set them yourself: Supabase Dashboard → Project Settings → API →
//   • Project URL          → SUPABASE_URL
//   • Project API key (anon / publishable) → SUPABASE_ANON_KEY
export const SUPABASE_URL = "https://ofqmqzyetpozwxucjbfe.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_iS71KeJKXCIW4BUUJ0u9Cg_mfh5QGX2";
