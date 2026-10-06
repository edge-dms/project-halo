# Alomar / AKL LocaList / Cooky AI — Readiness Audit (2026-10-06)

Scope: read-only. Lovable workspace "Edge Digital Marketing Systems" + Supabase project `AKL_Master_Base` (uemcenvotzcebbyiypju).
Not tested: live UI flows, Stripe/Mailgun/Resend plan limits, GHL API rate limits, edge-function code outside the two admin functions read.

## Verdict
Capacity is fine for +20 reps. Fix the 3 "Before onboarding" items first (1 is a real data exposure).

## Capacity snapshot
- DB 59 MB, 13/60 connections, 23 auth users (+20 = 43).
- ~8 real active reps with a GHL location (rest of the 19 "active" profiles are Smoke Test / AKL TestRunner accounts).
- Last 7d: 94/95 inbound emails matched; 88 pushes ok, 5 failed (`ghl_api_400`, last Oct 5), 2 skipped. Failure `detail` is null, so the cause is not recoverable from the log.
- Cooky AI: own Lovable DB (3 profiles, 95 posts, 1,531 cached recipes); its auth/GHL functions live in AKL_Master_Base.

## Corrections to the first-pass audit
- "16/19 expired GHL tokens" is NOT a defect. Location tokens are ~24h with no refresh token by design; `getGhlAccessToken` re-mints from the agency token on every push. The dependency that matters is the agency token (`agency_oauth_tokens`), currently valid and refreshed 08:00 UTC today. If it ever fails to refresh, the agency owner must reinstall the marketplace app and ALL reps stop syncing.
- "85+ active reps" on the Alomar landing page vs ~8 real active reps in the DB is still a marketing-claim mismatch.

## Before onboarding (priority order)

### 1. Anonymous read access to admin views (real exposure)
`rep_health_summary`, `mrr_rollup_by_tier`, `duplicate_profile_flags` are SECURITY DEFINER views with SELECT granted to `anon`. Anyone with the public anon key can read MRR by tier, rep health, and duplicate-profile flags.
Draft fix: `fixes/01-lock-down-views.sql`. Confirm no public page reads these views before applying.

### 2. `admin-create-rep` duplicate-email check breaks past 50 users
It calls `auth.admin.listUsers()` with no pagination (default page = 50) and searches that list. Today 23 users, so safe; once past 50 the duplicate check silently misses users. Creating the 20 reps puts you at ~43, so this bites soon after. Fix: use a paginated loop or look up by email via `profiles`/`auth.users`.
Also: rep numbers validate as 6-12 digits here but LocaList signup requires exactly 8 digits. Pick one rule.

### 3. Each new rep needs a GHL location + app install
Pushes need `profiles.ghl_location_id` AND the Alomar marketplace app installed on that sub-account. `admin-mint-location-tokens` returns `mint_400/404/401/403` when either is missing. Run it after onboarding as the verification step.

## Onboarding runbook for 20 reps
1. Collect per rep: email, 8-digit rep number, phone (10+ digits), first/last name, plan (`free` = comp "ALOMAR" tier, `gated` = trial).
2. Create GHL sub-accounts and install the Alomar app on each; note the location IDs.
3. Create accounts via super-admin Reps Manager (`admin-create-rep`) in batches of ~5 (it sends a welcome email each via Resend; watch for failures flagged "welcome email failed").
4. Set each rep's `ghl_location_id` in Reps Manager.
5. Run "Mint location tokens"; require 20/20 success.
6. Have each rep set up forwarding (Gmail needs the verification-email step). Confirm first email appears in `inbound_email_log` with `matched_user_id` set and a `ghl_push_log` row with `success=true`.
7. Watch `ghl_push_log` failures daily for the first week.
8. LocaList: new reps need `localist_reps` rows with a subscription status/tier. 15 of 25 existing rows have NULL status; define the tier for the 20 and backfill the NULLs.

## Cleanup / hardening (non-blocking)
- Archive or delete test accounts (9 active Smoke Test / TestRunner profiles) so they don't skew rep counts and MRR.
- Enable leaked-password protection in Supabase Auth settings.
- `ghl_push_log.detail` is null on failures — log the GHL 400 body so failures are diagnosable.
- Perf (grows with data): 109 `auth_rls_initplan` policies (wrap `auth.uid()` in `(select auth.uid())`), 20 overlapping permissive policies, 8 unindexed FKs. Not urgent at current size.
- `verify_jwt=false` on most functions; the two admin functions read do their own super_admin check (OK). The other ~55 were not reviewed.
- Move `postgis` and `pg_net` out of `public`; set `search_path` on `generate_slug_base`, `tier_price_cents`, `gen_random_bytes`.
- Single super_admin in `user_roles` (bus factor 1).
