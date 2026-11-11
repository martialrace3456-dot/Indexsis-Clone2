import { logAdvertiserAction } from "@/utils/advertiserHistory";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAdvertiserLoadPayments } from "@/hooks/useAdvertiserLoadPayments";
import { useAdvertiserView } from "@/contexts/AdvertiserView";
import { toast } from "sonner";
import { Check } from "lucide-react";

const METHODS = [
  { value: "paypal", label: "PayPal" },
  { value: "skrill", label: "Skrill" },
  { value: "volet", label: "Volet" },
  { value: "paypeer", label: "Paypeer" },
  { value: "crypto", label: "Crypto" },
] as const;

const CRYPTOS = [
  { value: "btc", label: "Bitcoin (BTC)" },
  { value: "eth", label: "Ethereum (ETH)" },
  { value: "usdt", label: "Tether (USDT)" },
  { value: "usdc", label: "USD Coin (USDC)" },
  { value: "sol", label: "Solana (SOL)" },
] as const;

export function LoadFundPanel() {
  const { payments, createPayment } = useAdvertiserLoadPayments();
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<string>("paypal");
  const [crypto, setCrypto] = useState<string>("btc");
  const [fromAddr, setFromAddr] = useState("");
  const [adminAddrs, setAdminAddrs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("admin_wallet").select("addresses").limit(1).maybeSingle();
      setAdminAddrs((data?.addresses as Record<string, string>) ?? {});
    })();
  }, []);

  const toAddr = method === "crypto" ? adminAddrs[`crypto_${crypto}`] ?? "" : adminAddrs[method] ?? "";
  const myPayment = payments.find((p) => p.id === lastPaymentId) ?? null;

  const view = useAdvertiserView();
  const viewOnly = !!view?.viewOnly;
  if (viewOnly) {
    return (
      <p className="text-sm text-muted-foreground max-w-xl">
        Read-only view — depositing funds is disabled for this account view.
      </p>
    );
  }

  const handlePaid = async () => {
    if (submitting) return;
    if (!amount || amount <= 0) { toast.error("Enter a deposit amount"); return; }
    if (!fromAddr.trim()) { toast.error("Enter your From address"); return; }
    if (!toAddr.trim()) { toast.error("No receiving address is set for this payment method yet"); return; }
    setSubmitting(true);
    const p = await createPayment({
      identifier: "self",
      amount,
      payment_method: method,
      crypto_currency: method === "crypto" ? crypto : null,
      from_address: fromAddr.trim(),
      to_address: toAddr,
      payment_status: "pending",
    });
    if (p) {
      setLastPaymentId(p.id);
      await logAdvertiserAction("fund_loaded", {
        targetId: p.id,
        targetType: "payment",
        metadata: { amount, from_address: fromAddr.trim(), to_address: toAddr },
      });
      toast.success("Payment marked — pending admin approval");
      setAmount(0);
    } else toast.error("Failed to record payment");
    setSubmitting(false);
  };

  return (
    <div className="max-w-xl">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Deposit Amount</Label>
          <Input type="number" min={0} step="0.01" value={amount || ""} onChange={(e) => setAmount(parseFloat(e.target.value || "0"))} placeholder="0.00" />
        </div>
        <div className="space-y-2">
          <Label>Select Payment Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {method === "crypto" && (
          <div className="space-y-2">
            <Label>Cryptocurrency</Label>
            <Select value={crypto} onValueChange={setCrypto}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CRYPTOS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label className="w-12">From</Label>
            <Input value={fromAddr} onChange={(e) => setFromAddr(e.target.value)} placeholder="Your wallet / account address" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="w-12">To</Label>
            <Input readOnly value={toAddr || "(admin has not set a receiving address)"} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Button onClick={handlePaid} disabled={submitting}>{submitting ? "Processing…" : "Paid"}</Button>
          <Badge variant={myPayment?.payment_status === "approved" ? "default" : "secondary"}>
            {!myPayment ? "—" : myPayment.payment_status === "approved" ? (
              <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Approved</span>
            ) : "Pending"}
          </Badge>
        </div>
      </div>
    </div>
  );
}