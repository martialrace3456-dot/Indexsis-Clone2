import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAdvertiserLoadPayments } from "@/hooks/useAdvertiserLoadPayments";
import { toast } from "sonner";

export function PaymentApprovals() {
  const { payments, approvePayment, loading } = useAdvertiserLoadPayments({ allOwners: true });
  const pending = payments.filter((p) => p.payment_status === "pending");

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Advertiser Payment Approvals</h2>
      <Card>
        <CardHeader>
          <CardTitle>Pending Deposits</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending deposits.</p>
          ) : (
            <div className="divide-y border rounded-lg">
              {pending.map((p) => (
                <div key={p.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="text-sm">
                    <div className="font-medium">
                      ${Number(p.amount).toFixed(2)} via {p.payment_method}
                      {p.crypto_currency ? ` (${p.crypto_currency.toUpperCase()})` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(p as unknown as { source?: string }).source?.startsWith("ad_campaign")
                        ? `Ad Campaign — ${(p as unknown as { source: string }).source.replace(/^ad_campaign:/, "")}`
                        : "Load Fund"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-[420px]">
                      From: {p.from_address || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={async () => {
                      const ok = await approvePayment(p.id);
                      if (ok) toast.success("Approved & balance updated");
                      else toast.error("Failed");
                    }}
                  >
                    Approve
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}