# Admin View of Advertiser Data (view-only, inside the ad section)

The admin panel gets a read-only window into any advertiser account's portal. Admin picks an advertiser from a list, then browses that advertiser's ads, campaigns, bids, reserved time, balance and history using the exact same screens the advertiser sees — with every action button hidden. No database changes.

## 1. Advertisers list (new admin tab)

- New **Advertisers** item in the admin panel sidebar (between Accounts and Payments), rendered by `AdminPanel`.
- Lists every account that has advertiser data — a balance row, ads, campaigns, bids or payments — with columns:
  - Username, Balance, Ads, Live Campaigns, Bids, Last Activity.
- Search box (same style as Accounts), click a row to open the view.

## 2. View-as plumbing

- New context `src/contexts/AdvertiserView.tsx`: `{ ownerId, username, viewOnly }` with a `useAdvertiserView()` hook. It is absent in the normal advertiser portal, which keeps working exactly as today.
- Owner-scoped hooks read the context owner when present and fall back to the signed-in advertiser otherwise. Files touched:
  - `useOverlay`, `useAdCampaigns`, `useAdBids`, `useReservedSlots`, `useAdvertiserHistory`, `useAdvertiserBalance`, `useAdvertiserLoadPayments` (add an `ownerId` option alongside its existing `allOwners`), `useBiddingAnalytics`.
- `logAdvertiserAction` (history writes) is suppressed while in view-only mode, so browsing an advertiser's data never writes to their History log.

## 3. View-only portal screens

- Selecting an advertiser renders the advertiser portal layout (Home / Finance / History via `OverlayManager`) inside the admin panel under the view context.
- A top banner shows "Viewing `<username>` — read-only" with a Back button returning to the list.
- In view-only mode all mutating controls are hidden:
  - Home: Add Ad, hover delete, stop (X) on running campaigns, analytics still viewable.
  - Finance: Load Fund form, Bid form, close-bid X, bid-increase "+" and "Increase the Bid for All", Run / Run with Reserved Time buttons; analytics viewable.
  - History: action cards and See Action routing work, but the delete X is hidden.

## Technical notes

- No migration: all advertiser tables are already owner-tagged and readable by any signed-in session; scoping stays client-side, same as the existing advertiser portal.
- The list tab aggregates counts with one query per table (`overlay_content`, `ad_campaigns`, `ad_bids`, `advertiser_balances`, `advertiser_load_payments`), joined client-side on `owner_id`.
- Realtime subscriptions in the existing hooks keep the viewed data live automatically.
- Admin access remains gated by the existing admin panel route; no new auth surface.
