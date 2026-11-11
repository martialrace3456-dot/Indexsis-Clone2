# Admin & Advertiser Portal Updates

## 1. Live data & bid naming

- Subscribe to live changes on `ad_bid_slots` (and keep the existing `ad_bids` subscription) so slot lists, bid details and the bidding analytics chart refresh themselves without a reload.
- Add a **Bid Name** input at the top of the Bid form, directly above "Biddable Time Period". Bid titles everywhere become `Name — date/period`; when no name is given, the date alone is used.

## 2. Reserved section (Finance > Bidding > Activity)

The `Reserved` tab gets three sub-tabs, each a bid-by-bid list in the same style as Ongoing Bids:

- **Functional** — bids holding won slots whose time is still ahead and unused.
- **Expired** — won slots whose time has passed unused.
- **Harnessed** — won slots already consumed by a running/finished ad.

Each sub-tab shows the accumulated total time for that category at its top right. Clicking a bid opens the detail window with the right-hand Active Slots panel, Unacquired Time and Available Time removed, and a **Total Amount of Reserved Time** line added at the bottom.

## 3. Advertising with reserved time

Rework the "Run with Reserved Time" tab layout:

```text
Available Time
Available Chosen Time/Slots        [ Select Bids ▾ ]
Allocated Time                     Remaining Time
```

- **Select Bids** lists every Functional reserved bid plus an "All" entry; "All" and individual picks are mutually exclusive.
- Reserved minutes are consumed chronologically (earliest slot first) from the selected bids; Available Chosen Time updates as the selection changes.
- Available Chosen Time, Allocated Time and the Select Bids control use a green-tinted surface.

## 4. Stopping ads and closing bids

- An **X** button at the bottom right of each running campaign card stops the ad and moves it to Expired Ads.
- An **X** button at the top right of each bid row in Activity closes the bid and moves it to Expired Bids (its unlocked slots are released).

## 5. History tab

Rename the sidebar tab `Activity` to **History**. It lists action cards, newest first, for: Ad Created, Ad Deleted, Advertisement Placed, Advertisement Stopped, Advertisement Deleted, Fund Loaded, Bid Placed, Bid Stopped.

Each card: action name as header, X at top right to delete the record, and a **See Action** button at bottom centre.

See Action routing:

| Action | Result |
| --- | --- |
| Ad Created | Home, target ad highlighted with a sparkling halo |
| Ad / Advertisement Deleted | Button disabled |
| Advertisement Placed | Ad Campaign area, campaign highlighted |
| Advertisement Stopped | Expired Ads, campaign highlighted |
| Fund Loaded | Modal with amount, sender address, receiver address |
| Bid Placed / Stopped | Finance Activity list scrolled to that bid, highlighted |

## 6. Analytics adjustments

- The chart icon on a campaign card opens a full modal containing the same analytics interface used in Finance, pre-filtered to that one ad.
- Remove the standalone **Ads** filter button; add "Ads" to the Y-axis parameter list. Choosing it opens the ad-picker and plots the chosen ad's activity.

## Technical notes

- Migration: add `name` to `ad_bids`; add `used_at` / `used_by_campaign` to `ad_bid_slots` to distinguish Functional / Expired / Harnessed; add `advertiser_history` table (owner_id, action type, target id/type, metadata jsonb, created_at) with grants + RLS; add `reserved_slot_ids` to `ad_campaigns` so reserved-time runs record which slots they consumed.
- New: `useAdvertiserHistory` hook, `HistoryPanel` + `HistoryCard` components, `ReservedSection` component, `AdAnalyticsModal` wrapper around the existing `AnalyticsSection`.
- Extend `useBidSlots` with reserved-category grouping and a `reservedMinutes` total; add realtime subscription for `ad_bid_slots`.
- `BidDetailDialog` gains a `variant: "bidding" | "reserved"` prop to hide the active panel and show reserved totals.
- History entries are written from the existing mutation points in `useOverlay`, `useAdCampaigns`, `useAdBids`, and `useAdvertiserLoadPayments`.
- Sparkle highlight: a shared `highlightId` in the portal shell plus a reusable `animate-halo` utility defined in the design tokens.
