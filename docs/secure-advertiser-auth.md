# Secure advertiser authentication and ownership model

This document captures the correct design for the advertiser feature and the reason the previous Clone2 pattern was unsafe.

## What was wrong in the previous design

The Clone2 migrations used patterns like:

- `CREATE POLICY ... USING (true)`
- `WITH CHECK (true)`
- `GRANT SELECT, INSERT, UPDATE, DELETE ON ... TO anon, authenticated`
- login by username/password against a `players` table
- client-side owner filtering with no database ownership checks

Those patterns do not enforce advertiser isolation. They allow any caller with the public or authenticated key to read and modify advertiser rows, as long as the table is exposed. A browser-only filter is not a security boundary.

## Correct model

The secure model is:

1. Advertisers and admins must use Supabase Auth (`auth.users`) rather than a custom username/password table as the source of identity.
2. Each advertiser profile row must map to a real auth user.
3. All advertiser and admin actions must be gated by `auth.uid()` and policy checks in the database.
4. Admin access must be explicit via a separate admin table or Admin role, not by broad public policies.
5. Funds, balances, bids, payments, and history must be restricted to the owner or an admin.

## Secure policy pattern

Use this pattern:

- `owner_id = (SELECT id FROM public.advertiser_profiles WHERE user_id = auth.uid())`
- `EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())`
- `USING (...)` and `WITH CHECK (...)` must check actual identity and ownership
- never grant `anon` direct write access to advertiser tables
- never use `USING (true)` for advertiser-owned data

## Required behavior

Advertisers:
- can create and manage only their own campaigns
- can read only their own balances, payments, bids, and history
- can update only their own account/profile

Admins:
- can view all advertiser records for moderation and support
- can approve/reject payments, pause campaigns, and remove problematic ads
- can override only the limited admin-only actions defined in policy checks

## Migration blueprint

See the SQL migration file in `supabase/migrations/20261113000000_secure_advertiser_identity.sql` for the actual secure version.

This migration is intentionally a secure template for the app once it is moved to real Supabase Auth for advertiser/admin identity.
