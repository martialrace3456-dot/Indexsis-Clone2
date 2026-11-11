import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnalyticsSection } from "./bidding/AnalyticsSection";

export function AdAnalyticsModal({
  open,
  onOpenChange,
  adId,
  title,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  adId: string | null;
  title?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Analytics — {title || "Ad"}</DialogTitle>
        </DialogHeader>
        {adId && <AnalyticsSection adId={adId} />}
      </DialogContent>
    </Dialog>
  );
}
