# Real money flow: deposits and bids

Make advertiser balances reflect actual money: deposits paid to the admin's wallet addresses credit the balance once approved and show up in History, and bids hold money when placed and charge it when slots are won.

## Deposits

- The deposit form keeps the current flow (pick a method, see the admin's receiving address for that method, enter your sending address, press Paid), but it now refuses to submit when the admin has not set an address for the chosen method — no more payments sent to an empty address.
- The payment record stores the exact receiving address shown at the time, so the admin sees where the money was supposed to land.
- Submitting still creates a pending deposit, and the balance is unchanged until an admin approves it.
- On approval the balance is credited (this already happens) and a new **Fund Approved** entry is written into that advertiser's History, next to the existing **Fund Loaded** entry. Opening it shows amount, sender address, receiving address and approval time.
- The balance box in the sidebar already updates live, so the advertiser sees the credit the moment it is approved.

## Bids

Money follows a hold-then-charge model:

- **Placing a bid** holds `slots x rate per slot` (runtime / 10 x rate) from the balance. Held money is shown separately, so the advertiser sees Available vs On hold.
- **Winning a slot** charges that slot's rate for real: the hold for that slot is released and the same amount is taken out of the balance permanently.
- **Losing or releasing a slot** (slot lost, bid closed, window passed) releases its hold back to available balance.
- **Raising a rate** (single slot "+" or "Increase the Bid for All") increases the hold by the difference.
- **Not enough funds**: placing a bid or raising a rate is blocked with a message telling the advertiser to load funds. Available balance = credited amount minus current holds.
- Each charge and release writes nothing new to History beyond the existing Bid Placed / Bid Stopped entries, but the Finance area shows the amounts.

## Balance display

Finance and the sidebar balance show three figures: Available, On hold, Total loaded. Read-only admin viewing of an advertiser shows the same figures without any actions.

## Technical details

- Migration (additive only): add `held_amount numeric not null default 0` and `spent_amount numeric not null default 0` to `advertiser_balances`; add `charged boolean not null default false` to `ad_bid_slots` so a won slot is only charged once.
- New helper `src/utils/advertiserFunds.ts`: `getBalance(ownerId)`, `hold(ownerId, amount)`, `releaseHold(ownerId, amount)`, `charge(ownerId, amount)` (release hold + increase `spent_amount`), each reading the row then writing the new totals, creating the row when missing. Available = `load_amount - spent_amount - held_amount`.
- `BidSection.handleBid`: compute `cost = (runtime/10) * rate`, check available, block with a toast if short, then create bid + slots and hold `cost`.
- `useBidSlots.fetchSlots` lock pass: when a contested slot becomes `won`, charge its rate and set `charged = true`; when it becomes `lost`, release its rate from the hold. Do both inside the existing per-group update so it stays idempotent (guarded by `charged`).
- `useAdBids.closeBid`: release holds for the contested slots it deletes.
- `useBidSlots.raiseRate`: check available against the total increment, block if short, otherwise hold the increment.
- `advertiserHistory.ts`: add a `fund_approved` action + label, and allow `logAdvertiserAction` to take an explicit `ownerId` so the admin approval path can write into the advertiser's log (still suppressed for read-only viewing).
- `useAdvertiserLoadPayments.approvePayment`: after crediting, log `fund_approved` with amount/from/to.
- `LoadFundPanel`: guard on empty `toAddr`; keep sending `to_address`.
- `useAdvertiserBalance`: also return `heldAmount`, `spentAmount`, `available`; update the sidebar balance box and Finance to show Available / On hold.
