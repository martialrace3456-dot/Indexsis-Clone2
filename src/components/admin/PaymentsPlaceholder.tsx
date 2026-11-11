import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DollarSign, Wallet } from "lucide-react";
import { PaymentApprovals } from "./PaymentApprovals";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const METHOD_FIELDS: { key: string; label: string }[] = [
  { key: "paypal", label: "PayPal" },
  { key: "skrill", label: "Skrill" },
  { key: "volet", label: "Volet" },
  { key: "paypeer", label: "Paypeer" },
  { key: "crypto_btc", label: "Crypto — Bitcoin (BTC)" },
  { key: "crypto_eth", label: "Crypto — Ethereum (ETH)" },
  { key: "crypto_usdt", label: "Crypto — Tether (USDT)" },
  { key: "crypto_usdc", label: "Crypto — USD Coin (USDC)" },
  { key: "crypto_sol", label: "Crypto — Solana (SOL)" },
];

export function PaymentsPlaceholder() {
  const [addresses, setAddresses] = useState<Record<string, string>>({});
  const [walletId, setWalletId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("admin_wallet").select("id, addresses").limit(1).maybeSingle();
      if (data) {
        setWalletId((data as { id: string }).id);
        setAddresses(((data as { addresses: Record<string, string> }).addresses) ?? {});
      }
    })();
  }, []);

  const setField = (k: string, v: string) => setAddresses((prev) => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (walletId) {
        const { error } = await supabase.from("admin_wallet").update({ addresses }).eq("id", walletId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("admin_wallet").insert({ addresses } as never).select("id").single();
        if (error) throw error;
        setWalletId((data as { id: string }).id);
      }
      toast.success("Wallet addresses saved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save addresses");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Payments</h2>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" /> Payment Wallet Addresses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            These addresses appear to advertisers when they pay directly or load funds. Update and save to change what's shown.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {METHOD_FIELDS.map((m) => (
              <div key={m.key} className="space-y-1">
                <Label>{m.label}</Label>
                <Input value={addresses[m.key] ?? ""} onChange={(e) => setField(m.key, e.target.value)} placeholder="Address / account / email" />
              </div>
            ))}
          </div>
          <div className="pt-2">
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Addresses"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Payment Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Approve advertiser deposits (Load Fund) and direct ad-campaign payments below. Load-amount and reserved-time ad launches go live immediately without approval.
          </p>
        </CardContent>
      </Card>

      <PaymentApprovals />
    </div>
  );
}
