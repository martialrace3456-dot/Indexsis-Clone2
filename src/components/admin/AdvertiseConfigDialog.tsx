import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Pencil, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AD_PLACEMENTS, AdPlacement, OverlayContent, AdCampaign,
  placementToRatio, AdPaymentMethod, CryptoCurrency,
} from "@/types/admin";
import { AdCropper } from "./AdCropper";
import { CroppedAdMedia } from "@/components/CroppedAdMedia";
import { useAdCampaigns } from "@/hooks/useAdCampaigns";
import { toast } from "sonner";
import { getCurrentAdvertiserId } from "@/utils/currentAdvertiser";
import { logAdvertiserAction } from "@/utils/advertiserHistory";
import { useReservedSlots } from "@/hooks/useReservedSlots";
import { bidTitle } from "@/hooks/useAdBids";
import { formatMinutes } from "@/utils/bidSlots";
import { useAdvertiserLinks } from "@/hooks/useAdvertiserLinks";
import { AdTargetSelector } from "./AdTargetSelector";
import { AD_COUNTRIES, calculateAdAmount } from "@/utils/adSpecification";


const AGE_OPTIONS = [
  { value: "above_12", label: "Above 12" },
  { value: "above_16", label: "Above 16" },
  { value: "above_18", label: "Above 18" },
  { value: "all", label: "All" },
];

const CRYPTOS: { value: CryptoCurrency; label: string }[] = [
  { value: "btc", label: "Bitcoin (BTC)" },
  { value: "eth", label: "Ethereum (ETH)" },
  { value: "usdt", label: "Tether (USDT)" },
  { value: "usdc", label: "USD Coin (USDC)" },
  { value: "sol", label: "Solana (SOL)" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  overlay: OverlayContent | null;
  existingCampaign?: AdCampaign | null;
}

export function AdvertiseConfigDialog({ open, onOpenChange, overlay, existingCampaign }: Props) {
  const { createCampaign, updateCampaign } = useAdCampaigns();
  const [placement, setPlacement] = useState<AdPlacement>("whole-board");
  const [age, setAge] = useState("all");
  const [countries, setCountries] = useState<string[]>([]);
  const [contestIds, setContestIds] = useState<string[]>([]);
  const [runtime, setRuntime] = useState(60);
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableContests, setAvailableContests] = useState<{ id: string; name: string }[]>([]);
  const [adminAddrs, setAdminAddrs] = useState<Record<string, string>>({});
  const [balance, setBalance] = useState({ load_amount: 0, reserved_minutes: 0 });
  // payments
  const [payMethod, setPayMethod] = useState<AdPaymentMethod>("paypal");
  const [crypto, setCrypto] = useState<CryptoCurrency>("btc");
  const [fromAddr, setFromAddr] = useState("");
  const [paidStatus, setPaidStatus] = useState<"idle" | "pending" | "approved">("idle");
  // reserved time
  const { byCategory, totals, refetch: refetchReserved } = useReservedSlots();
  const [selectedBidIds, setSelectedBidIds] = useState<string[]>([]);
  const { links } = useAdvertiserLinks();
  const [linkUrl, setLinkUrl] = useState<string>("");
  useEffect(() => {
    if (open) setLinkUrl((existingCampaign as { link_url?: string | null } | null | undefined)?.link_url ?? "");
  }, [open, existingCampaign]);

  const ratio = placementToRatio(placement);
  // Guard against duplicate submissions while a payment is in flight.
  const processingRef = useRef(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { processingRef.current = false; setBusy(false); } }, [open]);
  const guarded = (fn: () => Promise<void>, keepLocked = true) => async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setBusy(true);
    let ok = false;
    try { await fn(); ok = keepLocked; } finally {
      if (!ok) { processingRef.current = false; setBusy(false); }
    }
  };

  useEffect(() => {
    if (!open) return;
    (async () => {
      const ownerId = getCurrentAdvertiserId();
      const balQuery = ownerId
        ? supabase.from("advertiser_balances").select("*").eq("owner_id", ownerId).limit(1).maybeSingle()
        : Promise.resolve({ data: null } as never);
      const [{ data: players }, { data: contests }, { data: wallet }, { data: bal }] = await Promise.all([
        supabase.from("players").select("country").not("country", "is", null),
        supabase.from("contests").select("id, name").eq("status", "active").eq("approval_status", "approved"),
        supabase.from("admin_wallet").select("addresses").limit(1).maybeSingle(),
        balQuery,
      ]);
      const uniq = Array.from(new Set((players ?? []).map((p: { country: string | null }) => p.country).filter(Boolean) as string[]));
      setAvailableCountries(Array.from(new Set([...AD_COUNTRIES, ...uniq])).sort((a, b) => a.localeCompare(b)));
      setAvailableContests((contests ?? []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      setAdminAddrs((wallet?.addresses as Record<string, string>) ?? {});
      if (bal) setBalance({ load_amount: Number(bal.load_amount), reserved_minutes: Number(bal.reserved_minutes) });
    })();
  }, [open]);

  useEffect(() => {
    if (existingCampaign) {
      setPlacement(existingCampaign.placement);
      setAge(existingCampaign.age_target);
      setCountries(existingCampaign.country_targets);
      setContestIds(existingCampaign.contest_targets);
      setRuntime(existingCampaign.runtime_minutes);
      setCrop(existingCampaign.crop_data ?? null);
      if (existingCampaign.payment_status === "pending") setPaidStatus("pending");
      if (existingCampaign.payment_status === "approved") setPaidStatus("approved");
    } else {
      setPlacement("whole-board"); setAge("all"); setCountries([]); setContestIds([]);
      setRuntime(60); setCrop(null); setPaidStatus("idle");
    }
  }, [existingCampaign, open]);

  const amount = useMemo(() => calculateAdAmount(runtime), [runtime]);
  const adminAddr = payMethod === "crypto" ? adminAddrs[`crypto_${crypto}`] ?? "" : adminAddrs[payMethod] ?? "";

  // Reserved-time selection: "All" (empty selection) or specific functional bids,
  // consumed chronologically from the earliest slot onward.
  const functionalGroups = byCategory.functional;
  const chosenGroups = selectedBidIds.length
    ? functionalGroups.filter((g) => selectedBidIds.includes(g.bid.id))
    : functionalGroups;
  const chosenSlots = chosenGroups
    .flatMap((g) => g.slots)
    .sort((a, b) => new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime());
  const chosenMinutes = chosenSlots.length * 10;

  if (!overlay) return null;

  const buildPayload = () => ({
    overlay_id: overlay.id,
    title: overlay.title || "",
    placement, crop_ratio: ratio, crop_data: crop,
    age_target: age as AdCampaign["age_target"],
    country_targets: countries,
    contest_targets: contestIds,
    runtime_minutes: runtime,
    amount,
    link_url: linkUrl || null,
  });

  const handleDirectPaid = async () => {
    if (!fromAddr.trim()) { toast.error("Enter your From address"); throw new Error("validation"); }
    const base = buildPayload();
    const data = { ...base, payment_method: "crypto" === payMethod ? "crypto" : payMethod, crypto_currency: payMethod === "crypto" ? crypto : null, from_address: fromAddr, payment_status: "pending", status: "pending_approval" };
    if (existingCampaign) await updateCampaign(existingCampaign.id, data as Partial<AdCampaign>);
    else await createCampaign(data as never);
    // Also record in advertiser_load_payments so admins can approve it from the Payments tab.
    const ownerId = getCurrentAdvertiserId();
    if (ownerId) {
      await supabase.from("advertiser_load_payments" as never).insert({
        owner_id: ownerId,
        identifier: overlay.title || "Ad Campaign",
        amount,
        payment_method: payMethod,
        crypto_currency: payMethod === "crypto" ? crypto : null,
        from_address: fromAddr,
        to_address: adminAddr,
        payment_status: "pending",
        source: `ad_campaign:${overlay.title || "Untitled"}`,
      } as never);
    }
    await logAdvertiserAction("advertisement_placed", {
      targetType: "campaign",
      metadata: { title: overlay.title || "Untitled", runtime_minutes: runtime, method: payMethod },
    });
    setPaidStatus("pending");
    toast.success("Payment recorded — pending admin approval");
  };

  const handlePayWithLoad = async () => {
    if (balance.load_amount < amount) { toast.error("Insufficient load amount"); throw new Error("validation"); }
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + runtime * 60_000);
    const base = buildPayload();
    const data = { ...base, payment_method: "load", payment_status: "approved", status: "live", starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() };
    let placedId = existingCampaign?.id ?? null;
    if (existingCampaign) await updateCampaign(existingCampaign.id, data as Partial<AdCampaign>);
    else placedId = (await createCampaign(data as never))?.id ?? null;
    const ownerId = getCurrentAdvertiserId();
    if (ownerId) {
      await supabase.from("advertiser_balances").update({ load_amount: balance.load_amount - amount }).eq("owner_id", ownerId);
    }
    await logAdvertiserAction("advertisement_placed", {
      targetId: placedId,
      targetType: "campaign",
      metadata: { title: overlay.title || "Untitled", runtime_minutes: runtime, method: "load" },
    });
    toast.success("Ad is live");
    onOpenChange(false);
  };

  const handleRunReserved = async () => {
    if (chosenMinutes < runtime) { toast.error("Not enough reserved time selected"); throw new Error("validation"); }
    const needed = Math.ceil(runtime / 10);
    const useSlots = chosenSlots.slice(0, needed);
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + runtime * 60_000);
    const base = buildPayload();
    const data = {
      ...base,
      payment_method: "reserved_time",
      payment_status: "approved",
      status: "live",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      reserved_slot_ids: useSlots.map((s) => s.id),
    };
    let campaignId = existingCampaign?.id ?? null;
    if (existingCampaign) await updateCampaign(existingCampaign.id, data as Partial<AdCampaign>);
    else {
      const created = await createCampaign(data as never);
      campaignId = created?.id ?? null;
    }
    await supabase
      .from("ad_bid_slots" as never)
      .update({ used_at: new Date().toISOString(), used_by_campaign: campaignId } as never)
      .in("id", useSlots.map((s) => s.id));
    await refetchReserved();
    await logAdvertiserAction("advertisement_placed", {
      targetId: campaignId,
      targetType: "campaign",
      metadata: { title: overlay.title || "Untitled", runtime_minutes: runtime, method: "reserved_time" },
    });
    toast.success("Ad is live");
    onOpenChange(false);
  };

  const isExisting = !!existingCampaign;
  const isExpired = existingCampaign?.status === "expired";
  const handleSaveChanges = async () => {
    if (!existingCampaign || isExpired) return;
    const ok = await updateCampaign(existingCampaign.id, {
      placement, crop_ratio: ratio, crop_data: crop,
      age_target: age as AdCampaign["age_target"],
      country_targets: countries, contest_targets: contestIds,
      link_url: linkUrl || null,
    } as Partial<AdCampaign>);
    if (!ok) { toast.error("Failed to save changes"); return; }
    await logAdvertiserAction("advertisement_updated", {
      targetId: existingCampaign.id, targetType: "campaign",
      metadata: { title: overlay.title || "Untitled" },
    });
    toast.success("Changes saved");
    onOpenChange(false);
  };
  const run = (fn: () => Promise<void>) => guarded(async () => {
    try { await fn(); } catch (e) {
      if ((e as Error).message === "validation") throw e;
      toast.error("Something went wrong"); throw e;
    }
  });
  const safe = (fn: () => Promise<void>) => () => { run(fn)().catch(() => {}); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <h2 className="text-2xl font-bold">{overlay.title || "Untitled Ad"}</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: targeting */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ads Placement</Label>
              <Select value={placement} onValueChange={(v) => setPlacement(v as AdPlacement)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AD_PLACEMENTS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Age</Label>
              <Select value={age} onValueChange={setAge}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AGE_OPTIONS.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <AdTargetSelector label="Countries" options={availableCountries.map((country) => ({ value: country, label: country }))} selected={countries} onChange={setCountries} />
            <AdTargetSelector label="Contests" options={availableContests.map((contest) => ({ value: contest.id, label: contest.name }))} selected={contestIds} onChange={setContestIds} />
            <div className="space-y-2">
              <Label>Ads Runtime (minutes)</Label>
              <Input
                type="number"
                min={10}
                step={10}
                value={runtime}
                onChange={(e) => {
                  const n = parseInt(e.target.value || "10", 10);
                  setRuntime(Math.max(10, Math.round(n / 10) * 10));
                }}
              />
              <p className="text-xs text-muted-foreground">Bookable in 10-minute increments (minimum 10 min).</p>
            </div>
            <div className="space-y-2">
              <Label>Link (optional)</Label>
              <Select value={linkUrl || "none"} onValueChange={(v) => setLinkUrl(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="No link" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No link</SelectItem>
                  {links.map((l) => <SelectItem key={l.id} value={l.url}>{l.title || l.url}</SelectItem>)}
                </SelectContent>
              </Select>
              {links.length === 0 && <p className="text-xs text-muted-foreground">Save links in Home → Links to attach them here.</p>}
            </div>
          </div>

          {/* Right: media preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="relative bg-muted rounded-lg overflow-hidden" style={{ aspectRatio: ratio === "horizontal-half" ? "2 / 1" : ratio === "vertical-half" ? "1 / 2" : "1 / 1" }}>
              <CroppedAdMedia url={overlay.url} mediaType={overlay.content_type} crop={crop} alt={overlay.title} />
              <Button size="icon" variant="secondary" className="absolute top-2 right-2"
                aria-label="Edit crop" title="Edit crop"
                onClick={() => setCropOpen(true)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Crop ratio: {ratio}</p>
          </div>
        </div>

        {/* Payments (only when placing a new ad) */}
        {!isExisting && (
        <div className="border-t pt-4 mt-2">
          <Tabs defaultValue="direct">
            <TabsList>
              <TabsTrigger value="direct">Direct Payments</TabsTrigger>
              <TabsTrigger value="load">Pay with Load Amount</TabsTrigger>
              <TabsTrigger value="reserved">Run with Reserved Time</TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="space-y-3">
              <AmountRow amount={amount} runtime={runtime} countries={countries} contestIds={contestIds} age={age} />
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Payment Method</Label>
                  <Select value={payMethod} onValueChange={(v) => setPayMethod(v as AdPaymentMethod)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="skrill">Skrill</SelectItem>
                      <SelectItem value="volet">Volet</SelectItem>
                      <SelectItem value="paypeer">Paypeer</SelectItem>
                      <SelectItem value="crypto">Crypto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {payMethod === "crypto" && (
                  <div>
                    <Label>Cryptocurrency</Label>
                    <Select value={crypto} onValueChange={(v) => setCrypto(v as CryptoCurrency)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CRYPTOS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>From (your address)</Label>
                <Input value={fromAddr} onChange={(e) => setFromAddr(e.target.value)} placeholder="your wallet/email" />
                <Label>To (admin's address)</Label>
                <Input readOnly value={adminAddr} />
              </div>
              <div className="flex items-center justify-between">
                <Button onClick={safe(handleDirectPaid)} disabled={busy || paidStatus !== "idle"}>{busy ? "Processing…" : "Paid"}</Button>
                <span className="text-sm">
                  Status:{" "}
                  <Badge variant={paidStatus === "approved" ? "default" : "secondary"}>
                    {paidStatus === "idle" ? "—" : paidStatus === "pending" ? "Pending" : "Approved"}
                  </Badge>
                </span>
              </div>
            </TabsContent>

            <TabsContent value="load" className="space-y-3">
              <AmountRow amount={amount} runtime={runtime} countries={countries} contestIds={contestIds} age={age} />
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Available" value={`$${balance.load_amount.toFixed(2)}`} />
                <Stat label="Allocated" value={`$${amount.toFixed(2)}`} />
                <Stat label="Remaining" value={`$${(balance.load_amount - amount).toFixed(2)}`} />
              </div>
              <Button onClick={safe(handlePayWithLoad)} disabled={busy}>{busy ? "Processing…" : "Pay"}</Button>
            </TabsContent>

            <TabsContent value="reserved" className="space-y-3">
              <Stat label="Available Time" value={formatMinutes(totals.functional)} />

              <div className="grid grid-cols-2 gap-3 items-end">
                <Stat
                  label="Available Chosen Time/Slots"
                  value={`${formatMinutes(chosenMinutes)} / ${chosenSlots.length} slot${chosenSlots.length === 1 ? "" : "s"}`}
                  green
                />
                <div className="rounded-lg border border-green-600/40 bg-green-500/10 p-3 space-y-1">
                  <div className="text-xs text-muted-foreground">Select Bids</div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start bg-green-500/10 border-green-600/40">
                        {selectedBidIds.length ? `${selectedBidIds.length} selected` : "All"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 max-h-64 overflow-y-auto p-2">
                      <button
                        type="button"
                        onClick={() => setSelectedBidIds([])}
                        className="flex w-full items-center justify-between py-1 px-2 hover:bg-accent rounded text-sm"
                      >
                        <span>All</span>
                        {selectedBidIds.length === 0 && <Check className="h-4 w-4" />}
                      </button>
                      {functionalGroups.length === 0 && (
                        <p className="text-sm text-muted-foreground px-2 py-1">No reserved time available.</p>
                      )}
                      {functionalGroups.map((g) => (
                        <button
                          key={g.bid.id}
                          type="button"
                          onClick={() =>
                            setSelectedBidIds((prev) =>
                              prev.includes(g.bid.id)
                                ? prev.filter((x) => x !== g.bid.id)
                                : [...prev, g.bid.id],
                            )
                          }
                          className="flex w-full items-center justify-between gap-2 py-1 px-2 hover:bg-accent rounded text-sm"
                        >
                          <span className="truncate text-left">
                            {bidTitle(g.bid)} · {formatMinutes(g.minutes)}
                          </span>
                          {selectedBidIds.includes(g.bid.id) && <Check className="h-4 w-4 shrink-0" />}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Stat label="Allocated Time" value={formatMinutes(runtime)} green />
                <Stat label="Remaining Time" value={formatMinutes(Math.max(0, chosenMinutes - runtime))} />
              </div>

              <Button onClick={safe(handleRunReserved)} disabled={busy}>{busy ? "Processing…" : "Run"}</Button>
            </TabsContent>
          </Tabs>
        </div>
        )}

        <div className="flex justify-between pt-2">
          {isExisting ? (
            <Button onClick={handleSaveChanges} disabled={isExpired}
              title={isExpired ? "Expired ads cannot be modified" : undefined}>
              <Check className="h-4 w-4 mr-2" /> Save Changes
            </Button>
          ) : <span />}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" /> Exit
          </Button>
        </div>

        <AdCropper open={cropOpen} onOpenChange={setCropOpen} imageUrl={overlay.url}
          ratio={ratio} mediaType={overlay.content_type} initial={crop} onSave={setCrop} />
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className={green ? "rounded-lg border border-green-600/40 bg-green-500/10 p-3" : "rounded-lg border p-3"}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function AmountRow({ amount, runtime, countries, contestIds, age }: {
  amount: number; runtime: number; countries: string[]; contestIds: string[]; age: string;
}) {
  return (
    <div className="flex items-center justify-between border rounded-lg p-3">
      <div>
        <div className="text-xs text-muted-foreground">Amount Payable</div>
        <div className="text-2xl font-bold">${amount.toFixed(2)}</div>
      </div>
      <Popover>
        <PopoverTrigger asChild><Button variant="link">Details</Button></PopoverTrigger>
        <PopoverContent className="w-72 text-sm space-y-1">
          <div>Base rate: $0.05/min</div>
          <div>Runtime: {runtime} min</div>
          <div>Country price factor: 1</div>
          <div>Contest price factor: 1</div>
          <div>Age price factor: 1</div>
          <div className="pt-1 border-t font-semibold">Total: ${amount.toFixed(2)}</div>
        </PopoverContent>
      </Popover>
    </div>
  );
}