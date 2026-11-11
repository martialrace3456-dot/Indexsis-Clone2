import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { HistoryEntry, HISTORY_LABELS } from "@/utils/advertiserHistory";

export function HistoryCard({
  entry,
  onDelete,
  onSeeAction,
  actionable,
}: {
  entry: HistoryEntry;
  onDelete?: () => void;
  onSeeAction: () => void;
  actionable: boolean;
}) {
  const meta = entry.metadata || {};
  const subtitle = [meta.title, meta.name].filter(Boolean).join(" ") as string;

  return (
    <div className="relative rounded-lg border bg-card p-3 flex flex-col gap-2">
      {onDelete && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-1 right-1 h-6 w-6"
          title="Delete record"
          onClick={onDelete}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}

      <div>
        <h4 className="font-semibold text-sm pr-6">{HISTORY_LABELS[entry.action] ?? entry.action}</h4>
        <p className="text-xs text-muted-foreground">
          {new Date(entry.created_at).toLocaleString()}
        </p>
        {subtitle && <p className="text-xs mt-1 truncate">{subtitle}</p>}
      </div>

      <div className="flex justify-center">
        <Button size="sm" variant="outline" disabled={!actionable} onClick={onSeeAction}>
          See Action
        </Button>
      </div>
    </div>
  );
}
