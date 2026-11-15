# Secure advertiser authentication and ownership model

This document records the audit findings, staged remediation, and validation status for Indexsis Clone2.

## Findings verified in the repository

- `src/utils/playerAuth.ts` uses browser-side SHA-256 and reads legacy player password hashes.
- The original advertiser session trusted a `localStorage` player object; that is not an authorization boundary.
- Historical advertiser migrations include broad client grants and permissive policies.
- Client-side owner filters are not authorization.
- Financial approval and balance changes must not be trusted to browser code.

Do not deploy historical permissive advertiser migrations as a security solution.

## Hardening already committed on `secure-advertiser-hardening`

- `20261113000000_secure_advertiser_identity.sql` establishes Auth-to-player mapping and restrictive read policies, removes old advertiser policies, and revokes direct client writes to sensitive records.
- Supabase Auth-backed advertiser login, session checks, and portal gating are in place.
- Unlinked Auth users are blocked from legacy advertiser data.
- `20261115090000_advertiser_link_requests.sql` adds owner-scoped link requests and an admin-only atomic review RPC. Approval requires one unique username match and a recorded independent verification-evidence note.
- Admin UI lists pending requests and calls the RPC; the RPC and RLS—not UI visibility—are the security boundary.

## Important constraints / known limitations

- Never approve based solely on a username match or applicant-supplied note. Admins must independently verify ownership using an approved channel and record the evidence. The text field is an audit note, not proof by itself.
- The migration is not applied to any database by this work. No staging Supabase credentials or project access were provided, so remote schema and behavior remain unverified.
- The migration assumes prior historical migrations created `players`, `user_roles`, and `advertiser_profiles` with the referenced columns. Validate against the actual staging schema first.
- The initial admin role must be provisioned through a trusted operator path; never from a browser.
- Sensitive campaign, storage, payment, bid, balance, moderation, and history writes remain disabled/revoked until trusted backend operations are implemented.
- Do not use the project ID in `supabase/config.toml` as proof that this is a disposable staging project. Confirm the target environment out of band before applying migrations.

## Staging validation checklist (not yet run)

### Preflight

1. Confirm the Supabase project is a disposable/staging project, not production.
2. Back up or snapshot staging and record its project reference.
3. Reconcile migration history and actual schema. Check the `players` ID type, username uniqueness/case behavior, `user_roles` shape, existing profile rows, and function ownership.
4. Review the SQL with a database owner. The review RPC is `SECURITY DEFINER`; confirm its owner is a trusted migration role and `current_user_is_admin()` safely checks the caller's role.
5. Apply migrations in order only after preflight. Do not use production credentials or run `db push` against an unconfirmed target.

### Behavior tests

Use distinct Auth users A, B, and Admin, and two legacy players A and B. Record test IDs and clean up only in staging.

- Anonymous: cannot select/insert/update/delete link requests; cannot read private balances, bids, payment records, history, or private overlay/campaign rows.
- User A: can submit a request for their own Auth UUID; cannot submit for B; cannot read B's request; cannot update/delete any request or write an advertiser profile mapping.
- Duplicate pending request from A fails under the unique partial index.
- User A cannot execute approve/reject successfully even when supplying a valid request ID.
- Admin can list pending requests and reject one; request records reviewer and time; rejected request does not create/change a profile mapping.
- Admin approval without evidence or with fewer than 10 trimmed characters fails.
- Admin approval with independently verified evidence links the exact unique legacy player in one transaction and records reviewer/time/evidence.
- Ambiguous/nonexistent username fails; no profile is changed.
- A player already linked to B cannot be linked to A; an Auth user already linked to a different player cannot be relinked.
- Concurrent approvals for the same player: only one mapping succeeds; verify unique constraints in the actual schema enforce this under concurrency.
- After approval, A sees only A-owned rows; B cannot see A's rows; anonymous users see only explicitly public live/active content.
- Direct client writes to financial/moderation tables remain denied for advertiser and admin roles.

### UI and build tests

- Sign up/sign in/out and session restoration work; unlinked users see the link gate.
- Submitting a request shows pending state; rejected users may submit again; after approval, refresh/re-auth causes the portal to unlock only for the linked profile.
- Admin UI is not treated as authorization; RPC/RLS deny non-admin requests regardless of UI state.
- Run `npm run lint` and `npm run build`; manually inspect SQL lint/schema errors before staging execution.

## Status

Code and checklist are committed to the secure branch. Build, lint, migration execution, staging access-control tests, and production deployment have not been performed. Production rollout remains explicitly out of scope until staging results are reviewed.
