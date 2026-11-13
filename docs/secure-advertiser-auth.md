# Secure advertiser authentication and ownership model

This document records the audit findings and the staged remediation for Indexsis Clone2.

## Findings verified in the repository

The existing advertiser portal is not database-secure:

- `src/utils/playerAuth.ts` hashes passwords with plain SHA-256 in the browser, reads `password_hash` from `public.players`, and returns a player ID to the browser.
- `src/hooks/useAdvertiserSession.ts` treats a `localStorage` value as the session. A browser-stored player ID is not a trusted identity.
- Several migrations grant anonymous/authenticated users broad writes and use `USING (true)` / `WITH CHECK (true)` on advertiser data.
- `src/hooks/useAdCampaigns.ts` and related hooks filter by a browser-provided owner ID. A client-side filter is not authorization.
- Payment approval currently updates payment status and advertiser balances from browser code. That is a financial integrity issue, not just an RLS issue.

Do not deploy the historical permissive advertiser migrations as a security solution.

## What the hardening migration does

`supabase/migrations/20261113000000_secure_advertiser_identity.sql` is a fail-closed first stage:

- establishes an Auth-user-to-player mapping table;
- does not link accounts automatically by username;
- creates a database helper that maps `auth.uid()` to a linked player ID;
- checks admin role from the authenticated request;
- removes existing policies on advertiser tables before installing restricted policies;
- allows public clients to read only active overlay assets and live, approved campaign rows;
- limits signed-in advertisers to their linked owner's rows and admins to all rows;
- revokes direct client writes to campaigns, bids, slots, balances, payments, history, and admin wallet;
- removes overlay storage upload policies while retaining public reads.

This intentionally disables old browser-only advertiser sessions and some advertiser/admin write workflows until the application is migrated. That is safer than silently allowing cross-account or unauthenticated mutations.

## Not production-ready until these steps are complete

1. Migrate advertiser registration/login from `players.password_hash` to Supabase Auth. Do not collect or store a replacement password hash in client code. Username-only login needs a deliberate design because Supabase Auth uses email/phone identifiers; make recovery and verification functional rather than inventing an unowned email address.
2. Implement account recovery and secure email verification. Do not automatically link an Auth account to a legacy `players` row based on username. Use a reviewed, verified account-link process.
3. Provision the initial administrator through a trusted Supabase dashboard/service-role operation. Never let a browser insert into `user_roles`. Record the admin Auth UUID and have an authorized operator assign the role.
4. Move campaign creation, payment request creation/approval, balance crediting, bids, auction-slot updates/refunds, moderation, and history writes into authenticated Edge Functions or carefully audited RPCs. Verify the caller and validate all fields server-side. Do not put a service-role key in the frontend.
5. Update storage uploads to use authenticated owner-scoped paths and explicit storage policies.
6. Update the frontend hooks and admin portal to use the Auth UUID/session and secure backend operations. Client-side owner filters may remain for usability but never serve as authorization.
7. On a staging project, test both advertisers (A and B), admin, and anonymous access. Verify A cannot read, update, delete, or create records for B; non-admin cannot approve payments, alter balances, or grant roles; the game can read only active overlays/live approved ads.
8. Reconcile the actual remote schema and data before applying migrations. A blank `Remote` column in `supabase migration list --remote` means a migration version is not recorded as applied; it does not prove that the corresponding schema objects or data are absent.

## Migration caveats

- The migration assumes the historical Clone2 migrations have created `user_roles`, `players`, and the advertiser tables. It is not a baseline for a fresh database.
- Existing rows stay linked to legacy player IDs. Since a username match is not proof of ownership, profiles are created unlinked; a verified admin workflow must connect legitimate accounts before advertisers can see historical data.
- The migration deliberately does not enable writes through the old portal. The UI migration and trusted server operations are required before the feature can be considered complete.
- Test and review this SQL on a disposable/staging clone first. Do not apply it to production directly.
