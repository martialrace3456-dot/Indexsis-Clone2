export const SLOT_MS = 10 * 60 * 1000;
export const LOCK_MS = 30 * 60 * 1000;

export interface BidSlot {
  id: string;
  bid_id: string;
  owner_id: string | null;
  slot_start: string;
  slot_end: string;
  rate: number;
  state: "contested" | "won" | "lost";
  used_at?: string | null;
  used_by_campaign?: string | null;
}

export interface SlotGroup {
  count: number;
  start: number;
  end: number;
  rate: number;
  slotIds: string[];
}

/** Merge slots that are adjacent in time and share the same rate into one line. */
export function groupSlots(slots: BidSlot[]): SlotGroup[] {
  const sorted = [...slots].sort(
    (a, b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime(),
  );
  const groups: SlotGroup[] = [];
  for (const s of sorted) {
    const start = new Date(s.slot_start).getTime();
    const end = new Date(s.slot_end).getTime();
    const last = groups[groups.length - 1];
    if (last && last.end === start && last.rate === Number(s.rate)) {
      last.end = end;
      last.count += 1;
      last.slotIds.push(s.id);
    } else {
      groups.push({ count: 1, start, end, rate: Number(s.rate), slotIds: [s.id] });
    }
  }
  return groups;
}

export function formatRange(start: number, end: number) {
  const d = (t: number) =>
    new Date(t).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${d(start)} – ${d(end)}`;
}

export function formatMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/** Slot boundaries (ms) available inside a window, honouring the 30-minute closed horizon. */
export function slotBoundaries(windowStart: number, windowEnd: number, from = Date.now()) {
  const first = Math.ceil(Math.max(windowStart, from + LOCK_MS) / SLOT_MS) * SLOT_MS;
  const out: number[] = [];
  for (let t = first; t + SLOT_MS <= windowEnd; t += SLOT_MS) out.push(t);
  return out;
}
