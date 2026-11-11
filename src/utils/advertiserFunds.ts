import { supabase } from "@/integrations/supabase/client";

export interface FundsRow {
  load_amount: number;
  held_amount: number;
  spent_amount: number;
  available: number;
}

const EMPTY: FundsRow = { load_amount: 0, held_amount: 0, spent_amount: 0, available: 0 };

/** Read the money figures for one advertiser. */
export async function getBalance(ownerId: string | null): Promise<FundsRow> {
  if (!ownerId) return EMPTY;
  const { data } = await supabase
    .from("advertiser_balances")
    .select("load_amount, held_amount, spent_amount")
    .eq("owner_id", ownerId)
    .maybeSingle();
  const row = (data ?? {}) as Partial<Record<keyof FundsRow, number>>;
  const load_amount = Number(row.load_amount ?? 0);
  const held_amount = Number(row.held_amount ?? 0);
  const spent_amount = Number(row.spent_amount ?? 0);
  return {
    load_amount,
    held_amount,
    spent_amount,
    available: load_amount - held_amount - spent_amount,
  };
}

async function patch(ownerId: string, patchRow: Record<string, number>) {
  const { data } = await supabase
    .from("advertiser_balances")
    .select("id")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (data) {
    await supabase
      .from("advertiser_balances")
      .update(patchRow as never)
      .eq("id", (data as { id: string }).id);
  } else {
    await supabase
      .from("advertiser_balances")
      .insert({ owner_id: ownerId, identifier: ownerId, reserved_minutes: 0, ...patchRow } as never);
  }
}

/** Put money on hold (reserved for an active bid). */
export async function hold(ownerId: string | null, amount: number) {
  if (!ownerId || amount <= 0) return;
  const b = await getBalance(ownerId);
  await patch(ownerId, { held_amount: b.held_amount + amount });
}

/** Release held money back to available. */
export async function releaseHold(ownerId: string | null, amount: number) {
  if (!ownerId || amount <= 0) return;
  const b = await getBalance(ownerId);
  await patch(ownerId, { held_amount: Math.max(0, b.held_amount - amount) });
}

/** Charge held money for real: drop the hold and record it as spent. */
export async function charge(ownerId: string | null, amount: number) {
  if (!ownerId || amount <= 0) return;
  const b = await getBalance(ownerId);
  await patch(ownerId, {
    held_amount: Math.max(0, b.held_amount - amount),
    spent_amount: b.spent_amount + amount,
  });
}
