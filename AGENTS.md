# Project rules
- Generate personalized performance certificates in the browser as PNG files from real Stats data; this supports download and native file sharing without storing public certificates.
- Reuse the uploaded logo via an asset pointer; keep a separately padded square favicon in public so browsers can load it directly.
- Resolve certificate World Rank from all global scores and Contest Rank from each player's best contest score, using competition ranking for ties so ranks reflect the displayed contest aggregation.
- Store ad crops as percentages of intrinsic media pixels; share uniform centered cover-fit geometry between specification previews and live boards to prevent rendering drift.
- Persist game-player identity through the dedicated playerSession utility, separately from advertiser sessions and without credentials; setup and game navigation must restore the same identity.
- Aggregate admin analytics through the shared interval calculator for charts and summaries; historical scores are fallback gameplay only and must never imply unrecorded ad exposure.
- Record gameplay with bounded idempotent intervals and allocate targeted, non-overlapping visible ads; the server atomically caps aggregate campaign delivery so concurrent players cannot overspend runtime.
- Centralize ad pricing and empty-array All targeting semantics in the ad specification utility so payment views cannot multiply by audience selection counts.
- Store six guide title/description pairs through the shared admin settings hook, with validated defaults and a separate browser-only seen marker; spotlight anchors stay in the game layout so reopening never resets play.