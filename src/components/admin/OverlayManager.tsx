import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOverlay } from "@/hooks/useOverlay";
import { useAdCampaigns } from "@/hooks/useAdCampaigns";
import { supabase } from "@/integrations/supabase/client";
import { OverlayContent, AdCampaign } from "@/types/admin";
import { Plus, Trash2, Upload, CreditCard, History, Megaphone, BarChart3, X } from "lucide-react";
import { toast } from "sonner";
import { AdvertiseConfigDialog } from "./AdvertiseConfigDialog";
import { FinancePanel } from "./FinancePanel";
import { HistoryPanel } from "./HistoryPanel";
import { AdAnalyticsModal } from "./AdAnalyticsModal";
import { useAdvertiserNav, PortalTab } from "@/contexts/AdvertiserNav";
import { useAdvertiserView } from "@/contexts/AdvertiserView";
import { logAdvertiserAction } from "@/utils/advertiserHistory";
import { cn } from "@/lib/utils";
import { LinksManager } from "./LinksManager";

interface OverlayManagerProps {
  activeTab?: "home" | "finance" | "history";
  hideHeader?: boolean;
  hideTabsBar?: boolean;
}

export function OverlayManager({ activeTab, hideHeader, hideTabsBar }: OverlayManagerProps = {}) {
  const { overlays, loading, createOverlay, deleteOverlay } = useOverlay();
  const { campaigns, deleteCampaign, updateCampaign } = useAdCampaigns();
  const nav = useAdvertiserNav();
  const view = useAdvertiserView();
  const viewOnly = !!view?.viewOnly;
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [advertiseFor, setAdvertiseFor] = useState<OverlayContent | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<AdCampaign | null>(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);
  const [analyticsCampaign, setAnalyticsCampaign] = useState<AdCampaign | null>(null);
  const [localCampaignTab, setLocalCampaignTab] = useState<"running" | "pending" | "expired">("running");
  const [localHomeSub, setLocalHomeSub] = useState<"ads" | "links">("ads");
  const homeSub = nav?.homeSub ?? localHomeSub;
  const setHomeSub = nav?.setHomeSub ?? setLocalHomeSub;

  const [newOverlay, setNewOverlay] = useState({
    title: "",
    content_type: "image" as OverlayContent["content_type"],
    url: "",
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("overlays").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("overlays").getPublicUrl(fileName);
      setNewOverlay((prev) => ({
        ...prev,
        url: urlData.publicUrl,
        content_type: file.type.startsWith("video") ? "video" : "image",
      }));
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!newOverlay.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!newOverlay.url) {
      toast.error("Please provide a URL or upload a file");
      return;
    }
    const success = await createOverlay({
      title: newOverlay.title.trim(),
      content_type: newOverlay.content_type,
      url: newOverlay.url,
      position: "board-cover",
      is_active: false,
      display_start: null,
      display_end: null,
    } as Omit<OverlayContent, "id" | "created_at" | "updated_at">);
    if (success) {
      toast.success("Ad created");
      setShowAddDialog(false);
      setNewOverlay({ title: "", content_type: "image", url: "" });
    } else {
      toast.error("Failed to create ad");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const success = await deleteOverlay(deletingId);
    if (success) toast.success("Ad deleted");
    else toast.error("Failed to delete ad");
    setDeletingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const sortedAds = [...overlays].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const liveCampaigns = campaigns.filter((c) => c.status === "live");
  const pendingCampaigns = campaigns.filter(
    (c) => c.status === "pending_payment" || c.status === "pending_approval" || c.payment_status === "pending",
  );
  const expiredCampaigns = campaigns.filter((c) => c.status === "expired");

  const openCampaign = (c: AdCampaign, o: OverlayContent) => {
    setEditingCampaign(c);
    setAdvertiseFor(o);
  };

  const stopCampaign = async (c: AdCampaign) => {
    const ok = await updateCampaign(c.id, { status: "expired", ends_at: new Date().toISOString() } as Partial<AdCampaign>);
    if (ok) {
      await logAdvertiserAction("advertisement_stopped", {
        targetId: c.id,
        targetType: "campaign",
        metadata: { title: c.title || "" },
      });
      toast.success("Ad stopped");
    } else toast.error("Failed to stop ad");
  };

  const tab = activeTab ?? "home";
  return (
    <div className="space-y-6">
      {!hideHeader && <h2 className="text-2xl font-bold">Advertisements</h2>}

      <Tabs value={tab} onValueChange={(v) => nav?.setTab(v as PortalTab)}>
        {!hideTabsBar && (
          <TabsList>
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="home">
          <div className="flex items-center gap-6 border-b mb-4">
            {(["ads", "links"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setHomeSub(s)}
                className={cn(
                  "pb-2 text-lg font-semibold border-b-2 -mb-px transition-colors",
                  homeSub === s ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {s === "ads" ? "Ads" : "Links"}
              </button>
            ))}
          </div>
          {homeSub === "links" ? (
            <LinksManager viewOnly={viewOnly} />
          ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-end">
              {!viewOnly && (
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Ad
                </Button>
              )}
            </div>

            {sortedAds.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No ads configured. Click "Add Ad" to create one.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {sortedAds.map((overlay) => (
                  <div
                    key={overlay.id}
                    className={cn(
                      "rounded-lg border bg-card overflow-hidden flex flex-col group",
                      nav?.highlightId === overlay.id && "animate-halo",
                    )}
                  >
                    <div className="relative aspect-square bg-muted">
                      {overlay.content_type === "image" ? (
                        <img src={overlay.url} alt={overlay.title || "ad"} className="w-full h-full object-cover" />
                      ) : (
                        <video src={overlay.url} className="w-full h-full object-cover" muted />
                      )}
                      {!viewOnly && (
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition"
                          onClick={() => setDeletingId(overlay.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="p-2 flex-1 flex flex-col gap-2">
                      <p className="text-sm font-medium truncate">{overlay.title || "Untitled"}</p>
                      {!viewOnly && (
                        <Button
                          size="sm"
                          className="w-full mt-auto"
                          onClick={() => {
                            setEditingCampaign(null);
                            setAdvertiseFor(overlay);
                          }}
                        >
                          <Megaphone className="h-3.5 w-3.5 mr-1" /> Advertise
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Ads Campaign</h3>
              <Tabs
                value={nav?.campaignTab ?? localCampaignTab}
                onValueChange={(v) => (nav ? nav.setCampaignTab(v as "running" | "pending" | "expired") : setLocalCampaignTab(v as "running" | "pending" | "expired"))}
              >
                <TabsList>
                  <TabsTrigger value="running">Running Ads</TabsTrigger>
                  <TabsTrigger value="pending">Pending Ads</TabsTrigger>
                  <TabsTrigger value="expired">Expired Ads</TabsTrigger>
                </TabsList>
                <div className="max-h-[480px] overflow-y-auto pr-2 mt-3">
                  <TabsContent value="running">
                    <CampaignGrid
                      emptyText="No running ads."
                      campaigns={liveCampaigns}
                      overlays={overlays}
                      onClick={openCampaign}
                      onDelete={setDeletingCampaignId}
                      onAnalytics={setAnalyticsCampaign}
                      onStop={stopCampaign}
                      highlightId={nav?.highlightId}
                      viewOnly={viewOnly}
                    />
                  </TabsContent>
                  <TabsContent value="pending">
                    <CampaignGrid
                      emptyText="No pending ads."
                      campaigns={pendingCampaigns}
                      overlays={overlays}
                      onClick={openCampaign}
                      onDelete={setDeletingCampaignId}
                      onAnalytics={setAnalyticsCampaign}
                      highlightId={nav?.highlightId}
                      viewOnly={viewOnly}
                    />
                  </TabsContent>
                  <TabsContent value="expired">
                    <CampaignGrid
                      emptyText="No expired ads."
                      campaigns={expiredCampaigns}
                      overlays={overlays}
                      onClick={openCampaign}
                      onDelete={setDeletingCampaignId}
                      onAnalytics={setAnalyticsCampaign}
                      highlightId={nav?.highlightId}
                      viewOnly={viewOnly}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
          )}
        </TabsContent>

        <TabsContent value="finance">
          <FinancePanel />
        </TabsContent>

        <TabsContent value="history">
          <HistoryPanel />
        </TabsContent>
      </Tabs>

      <AlertDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Add New Ad</AlertDialogTitle>
            <AlertDialogDescription>Upload media and give it a title.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Ad title"
                value={newOverlay.title}
                onChange={(e) => setNewOverlay((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select
                value={newOverlay.content_type}
                onValueChange={(v) => setNewOverlay((prev) => ({ ...prev, content_type: v as "image" | "video" }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Upload File or Enter URL</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://..."
                  value={newOverlay.url}
                  onChange={(e) => setNewOverlay((prev) => ({ ...prev, url: e.target.value }))}
                />
                <Button variant="outline" className="flex-shrink-0" disabled={uploading}>
                  <label className="cursor-pointer flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    {uploading ? "Uploading..." : "Upload"}
                    <input type="file" accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </Button>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreate}>Create Ad</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ad</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ad? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingCampaignId} onOpenChange={() => setDeletingCampaignId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the campaign. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deletingCampaignId) return;
                const ok = await deleteCampaign(deletingCampaignId);
                if (ok) toast.success("Campaign deleted");
                else toast.error("Failed to delete campaign");
                setDeletingCampaignId(null);
              }}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdAnalyticsModal
        open={!!analyticsCampaign}
        onOpenChange={(o) => { if (!o) setAnalyticsCampaign(null); }}
        adId={analyticsCampaign?.id ?? null}
        title={analyticsCampaign?.title || "Ad"}
      />

      <AdvertiseConfigDialog
        open={!!advertiseFor}
        onOpenChange={(o) => {
          if (!o) {
            setAdvertiseFor(null);
            setEditingCampaign(null);
          }
        }}
        overlay={advertiseFor}
        existingCampaign={editingCampaign}
      />
    </div>
  );
}

function CampaignGrid({
  emptyText, campaigns, overlays, onClick, onDelete, onAnalytics, onStop, highlightId, viewOnly,
}: {
  emptyText: string;
  campaigns: AdCampaign[];
  overlays: OverlayContent[];
  onClick: (c: AdCampaign, o: OverlayContent) => void;
  onDelete: (id: string) => void;
  onAnalytics: (c: AdCampaign) => void;
  onStop?: (c: AdCampaign) => void;
  highlightId?: string | null;
  viewOnly?: boolean;
}) {
  return (
    <div>
      {campaigns.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {campaigns.map((c) => {
            const ov = overlays.find((o) => o.id === c.overlay_id);
            if (!ov) return null;
            return (
              <div
                key={c.id}
                className={cn(
                  "group relative rounded-lg border overflow-hidden hover:ring-2 hover:ring-primary",
                  highlightId === c.id && "animate-halo",
                )}
              >
                {viewOnly ? (
                  <div className="block w-full text-left">
                    <div className="aspect-square bg-muted">
                    {ov.content_type === "image" ? (
                      <img src={ov.url} alt={c.title} className="w-full h-full object-cover" />
                    ) : (
                      <video src={ov.url} className="w-full h-full object-cover" muted />
                    )}
                    </div>
                    <div className="p-2 text-sm truncate">{c.title || ov.title || "Untitled"}</div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onClick(c, ov)}
                    className="block w-full text-left"
                  >
                    <div className="aspect-square bg-muted">
                    {ov.content_type === "image" ? (
                      <img src={ov.url} alt={c.title} className="w-full h-full object-cover" />
                    ) : (
                      <video src={ov.url} className="w-full h-full object-cover" muted />
                    )}
                    </div>
                    <div className="p-2 text-sm truncate">{c.title || ov.title || "Untitled"}</div>
                  </button>
                )}
                {!viewOnly && (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-1 left-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition"
                    onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-1 right-1 h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); onAnalytics(c); }}
                  title="View analytics"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                </Button>
                {c.status === "live" && c.payment_status === "approved" && (
                  <span className="absolute bottom-9 left-1 text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">
                    LIVE
                  </span>
                )}
                {!viewOnly && onStop && c.status === "live" && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-1 right-1 h-7 w-7"
                    title="Stop ad"
                    onClick={(e) => { e.stopPropagation(); onStop(c); }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}