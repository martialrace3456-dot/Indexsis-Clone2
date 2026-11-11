import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";

interface AnalyticsFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: { value: string; label: string }[];
  selected: string[];
  onApply: (selected: string[]) => void;
}

export function AnalyticsFilterModal({
  open,
  onOpenChange,
  title,
  items,
  selected,
  onApply,
}: AnalyticsFilterModalProps) {
  const [search, setSearch] = useState("");
  const [localSelected, setLocalSelected] = useState<string[]>(selected);

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        item.label.toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
  );

  const toggleItem = (value: string) => {
    setLocalSelected((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const handleApply = () => {
    onApply(localSelected);
    onOpenChange(false);
  };

  const handleClear = () => {
    setLocalSelected([]);
    onApply([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Filter by {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${title.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <ScrollArea className="h-60">
            <div className="space-y-2 pr-4">
              {filteredItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No items found
                </p>
              ) : (
                filteredItems.map((item) => (
                  <label
                    key={item.value}
                    className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <Checkbox
                      checked={localSelected.includes(item.value)}
                      onCheckedChange={() => toggleItem(item.value)}
                    />
                    <span className="text-sm">{item.label}</span>
                  </label>
                ))
              )}
            </div>
          </ScrollArea>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClear}>
              Clear
            </Button>
            <Button onClick={handleApply}>Apply</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
