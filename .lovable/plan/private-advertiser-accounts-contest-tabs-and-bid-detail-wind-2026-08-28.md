# Private advertiser accounts, contest tabs, and bid detail windows

Three separate pieces of work.

## 1. Make every advertiser account private

Today the advertiser hooks read every row in the ads tables with no owner filter, so ads created back when the dashboard lived in admin (their owner column is empty) appear inside every new account. Ownership columns already exist (`owner_id` / `advertiser_id` pointing at the player record) and are written on create — only the reads are missing the filter.

Changes:

- Filter all reads by the signed-in advertiser: ads/overlays, ad campaigns, bids, load payments, and balance. A new account therefore starts completely empty.
- Wrap all existing owner-less rows into a dedicated admin account:
  - Create a player named `Administrator` with the password you gave, using the same hashing the game sign-up uses.
  - Re-assign every existing ad, campaign, bid, payment and balance row that currently has no owner to that account.
  - Signing into the advertiser portal as `Administrator` shows exactly the old admin-created ads; no other account sees them.
- The only thing that stays public is the live ad rendered on the game board, which is read by campaign status, not by owner.
- Admin panel views (payment approvals, etc.) keep seeing all rows — those are admin-side screens, unchanged.

## 2. Admin contest tabs

- Tab row becomes: `Ongoing`, `Expired`, `All`, `Pending`, `Approved`, `Rejected`, with the two new ones first and the whole row shifted right.
- `Ongoing` = contests still running (active, end time in the future). `Expired` = contests past their end time. Default selection is `Ongoing`; one tab at a time.
- Remove the "Pending Approval" card that currently sits above the tabs. Pending contests appear only under the `Pending` tab.
- Show a small notification dot with the count on the `Pending` tab when contests are awaiting approval.

## 3. Bid detail window (Ongoing and Expired bids)

Clicking a bid in Finance > Bidding > Activity opens a detail window. Today a bid is stored as a single row (window, total runtime, one rate) — there is no per-slot record, so slot-level "acquired / winning / losing" data does not exist yet and must be added.

New slot layer:

- A slot table where each row is one 10-minute slot inside a bid's window, holding the bid it belongs to, its owner, the current rate offered, and its state (contested, won, lost).
- When a bid is placed, slot rows are created across the bid window up to the requested runtime.
- A slot locks (becomes won by the highest rate, others lost) once its start time falls inside the 30-minute closed horizon; slots further out stay contested and their rates can still be raised.
- Won slots feed the live ad scheduling already in place.

Detail window layout (identical for ongoing and expired bids):

- Title: `Bid: <window start – window end>`.
- `Selected Auctions Window` with the bid period on the right.
- `Required Amount of Runtime` with the requested runtime on the right.
- Two side-by-side panels:
  - **Acquired slots** — bullet list where time-adjacent won slots merge into one line: `N slots (HH:MM–HH:MM) — $rate`. Below: `Total Time/Slots` with slot count and total minutes in brackets, then total cost summed at each line's own rate.
  - **Active Slots** — only slots still contested and at least 30 minutes out, split into a green `Winning` zone and a red `Losing` zone, same adjacency-merging bullet format. Each line has a `+` next to the rate that opens a small popup showing the current winning rate, an amount field and an `Add` button that permanently raises that line's bid. Each zone ends with `Increase the Bid for All (+)`, which opens a popup listing that zone's slots for multi-select, one amount field, and an `Add` button.
- Below the panels: `Unacquired Amount of Time` (requested runtime minus acquired) and `Available Amount of Time` (total runtime still open for bidding inside the bid's window).
- For expired bids the right panel is naturally empty (no slots remain biddable); the left panel and totals still render.

## Technical notes

- Migration adds the slot table with owner-scoped policies and grants, creates the `Administrator` player, and back-fills owner columns on legacy rows.
- Slot locking and winner resolution run as a client-side resolver on load (same pattern as the existing bid/campaign expiry resolvers), so no scheduled job is introduced.
- Detail window is a new dialog component reused by the Ongoing and Expired lists in `ActivitySection`; slot grouping/merging lives in a shared helper.
