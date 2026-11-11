import { useState } from "react";
import { MoreHorizontal, Volume2, VolumeX } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { LiveAdCampaign } from "@/hooks/useActiveAdCampaigns";

interface Props {
  campaigns: LiveAdCampaign[];
  muted: boolean;
  onToggleMute: () => void;
}

export function AdBoardControls({ campaigns, muted, onToggleMute }: Props) {
  const [reportOpen, setReportOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  if (campaigns.length === 0) return null;
  const linked = campaigns.find((c) => c.link_url);
  const hasVideo = campaigns.some((c) => c.overlay.content_type === "video");
  const target = linked ?? campaigns[0];

  const submit = async () => {
    const text = description.trim();
    if (!text) { toast.error("Please describe the issue"); return; }
    setSending(true);
    const { error } = await supabase.from("ad_reports").insert({
      campaign_id: target.id,
      overlay_id: target.overlay_id,
      campaign_title: target.title || target.overlay.title || "",
      media_url: target.overlay.url,
      content_type: target.overlay.content_type,
      link_url: target.link_url ?? null,
      description: text.slice(0, 2000),
    });
    setSending(false);
    if (error) { toast.error("Could not send report"); return; }
    toast.success("Report submitted. Thank you!");
    setDescription("");
    setReportOpen(false);
  };

  return (
    <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
      {linked && (
        <a
          href={linked.link_url!}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="hover:text-primary underline-offset-2 hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            supabase.from("link_clicks").insert({
              url: linked.link_url!,
              campaign_id: linked.id,
              owner_id: (linked as { advertiser_id?: string | null }).advertiser_id ?? null,
            }).then(({ error }) => { if (error) console.error("click log failed", error); });
          }}
        >
          Link ↗
        </a>
      )}
      {hasVideo && (
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? "Unmute ad" : "Mute ad"}
          className="hover:text-primary"
        >
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="More options" className="hover:text-primary">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuItem onSelect={() => setReportOpen(true)}>Report</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={reportOpen} onOpenChange={() => {}}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} hideCloseButton>
          <DialogHeader><DialogTitle>Reports</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="report-desc">Description</Label>
            <Textarea id="report-desc" rows={5} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={sending}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
