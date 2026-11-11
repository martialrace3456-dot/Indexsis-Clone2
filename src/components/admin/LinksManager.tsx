import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart3, ExternalLink, Plus, Trash2 } from "lucide-react";
import { LinkAnalyticsModal } from "./LinkAnalyticsModal";
import { useAdvertiserNav } from "@/contexts/AdvertiserNav";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { normalizeUrl, useAdvertiserLinks } from "@/hooks/useAdvertiserLinks";

export function LinksManager({ viewOnly }: { viewOnly?: boolean }) {
  const { links, addLink, deleteLink } = useAdvertiserLinks();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [stat, setStat] = useState<{ url: string; title: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const nav = useAdvertiserNav();

  const save = async () => {
    const u = normalizeUrl(url);
    if (!u) { toast.error("Enter a valid web address"); return; }
    if (saving) return;
    setSaving(true);
    const ok = await addLink(title.trim(), u);
    setSaving(false);
    if (ok) {
      toast.success("Link saved");
      setTitle(""); setUrl(""); setOpen(false);
    } else toast.error("Failed to save link");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Links</h3>
        {!viewOnly && (
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Add Link</Button>
        )}
      </div>
      {links.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No links saved yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {links.map((l) => (
            <div key={l.id} className={cn("flex items-center gap-3 rounded-lg border bg-card p-3", nav?.highlightId === l.id && "animate-halo")}>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{l.title || "Untitled link"}</p>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary truncate inline-flex items-center gap-1 max-w-full">
                  <span className="truncate">{l.url}</span> <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
              <Button size="sm" variant="outline" onClick={() => setStat({ url: l.url, title: l.title })}>
                <BarChart3 className="h-3.5 w-3.5 mr-1" /> Stat
              </Button>
              {!viewOnly && (
                <Button size="icon" variant="ghost" onClick={() => deleteLink(l.id)} aria-label="Delete link">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <LinkAnalyticsModal open={!!stat} onClose={() => setStat(null)} url={stat?.url ?? null} title={stat?.title ?? ""} />

      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent hideCloseButton onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>Add Link</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Official Store" /></div>
            <div className="space-y-1"><Label>Destination URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
