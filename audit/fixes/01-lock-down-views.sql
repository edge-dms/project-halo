-- DRAFT — NOT APPLIED. Review before running on AKL_Master_Base (uemcenvotzcebbyiypju).
-- Anonymous (and any signed-in) users can currently read these admin views via SECURITY DEFINER.

-- Minimal, reversible: remove anonymous access.
revoke select on public.rep_health_summary     from anon;
revoke select on public.mrr_rollup_by_tier     from anon;
revoke select on public.duplicate_profile_flags from anon;

-- Stronger: also stop ordinary signed-in reps from reading them (admin dashboards
-- should then read via an edge function using the service role, or add a
-- super_admin check). Only do this after confirming how Reps Manager reads them.
-- revoke select on public.rep_health_summary, public.mrr_rollup_by_tier,
--   public.duplicate_profile_flags from authenticated;

-- Alternative: make views respect the caller's RLS (Postgres 15+).
-- alter view public.rep_health_summary     set (security_invoker = true);
-- alter view public.mrr_rollup_by_tier     set (security_invoker = true);
-- alter view public.duplicate_profile_flags set (security_invoker = true);

-- Low-risk extras
alter table public.spatial_ref_sys enable row level security;
create policy "spatial_ref_sys read" on public.spatial_ref_sys for select using (true);

-- Rollback for the revokes:
-- grant select on public.rep_health_summary, public.mrr_rollup_by_tier,
--   public.duplicate_profile_flags to anon;
