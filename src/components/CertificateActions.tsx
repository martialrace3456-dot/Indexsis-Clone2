import { useEffect, useRef, useState } from "react";
import { Download, Share2, Facebook, Instagram, MessageCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { generatePerformanceCertificate } from "@/utils/performanceCertificate";
import { bestContestScores, GLOBAL_CHALLENGE, performanceRank, type CertificateData } from "@/utils/performanceStats";
import { fetchContestScores, fetchGlobalScores } from "@/utils/statsQueries";
import { deliverFile, downloadBlob } from "@/utils/downloadFile";

interface CertificateActionsProps {
  playerName: string;
  score: number;
  contestId?: string | null;
  contestName?: string | null;
  worldRank?: number;
  contestRank?: number;
  disabled?: boolean;
}

export function CertificateActions(props: CertificateActionsProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<{ blob: Blob; url: string; filename: string } | null>(null);

  const processing = useRef(false);
  useEffect(() => () => { if (prepared) URL.revokeObjectURL(prepared.url); }, [prepared]);

  async function prepare() {
    if (processing.current) return;
    processing.current = true; setBusy(true);
    try {
      const [globalScores, contestScores] = await Promise.all([
        props.worldRank === undefined ? fetchGlobalScores() : Promise.resolve([]),
        props.contestId && props.contestRank === undefined ? fetchContestScores(props.contestId) : Promise.resolve([]),
      ]);
      const data: CertificateData = {
        playerName: props.playerName,
        contestName: props.contestName || GLOBAL_CHALLENGE,
        finalScore: props.score,
        worldRank: props.worldRank ?? performanceRank(props.score, globalScores),
        contestRank: props.contestId ? props.contestRank ?? performanceRank(props.score, bestContestScores(contestScores)) : undefined,
        issuedAt: new Date(),
      };
      const blob = await generatePerformanceCertificate(data);
      const filename = `indexsis_${props.playerName.replace(/[^\p{L}\p{N}_-]/gu, "_")}_certificate.png`;
      setPrepared({ blob, filename, url: URL.createObjectURL(blob) });
    } catch (error) {
      toast({ title: "Certificate unavailable", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally { processing.current = false; setBusy(false); }
  }

  function openCertificate() { setOpen(true); void prepare(); }
  async function copyImage(forSocial = false) {
    if (!prepared) return false;
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("Image copying is unavailable.");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": prepared.blob })]);
      toast(forSocial
        ? { title: "Image copied — paste it into your post", description: "Press Ctrl+V (Cmd+V on Mac) or long-press and Paste in the post box." }
        : { title: "Certificate copied", description: "Paste the image into your post where supported." });
      return true;
    } catch {
      downloadBlob(prepared.blob, prepared.filename);
      toast({ title: "Certificate downloaded", description: "Image copying was blocked or unavailable. Attach the downloaded image to your post instead." });
      return false;
    }
  }
  function social(platform: "facebook" | "x" | "whatsapp" | "instagram") {
    if (!prepared || busy) return;
    const url = encodeURIComponent("https://indexsis.lovable.app");
    const text = encodeURIComponent(`Global Indexsis Champions: Leading the Way: My Indexsis performance: ${props.score.toFixed(2)} in ${props.contestName || GLOBAL_CHALLENGE}.`);
    const links = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`,
      x: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      instagram: "https://www.instagram.com/",
    };
    // Start clipboard access and open the site within the original click gesture.
    void copyImage(true);
    window.open(links[platform], "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <div className="flex justify-center gap-1 sm:gap-2.5">
        <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-9 sm:w-9" disabled={props.disabled} title={props.disabled ? "Only the player can download their certificate" : "Download certificate"} aria-label={`Download certificate for ${props.playerName}`} onClick={openCertificate}><Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-9 sm:w-9" disabled={props.disabled} title={props.disabled ? "Only the player can share their certificate" : "Share certificate"} aria-label={`Share certificate for ${props.playerName}`} onClick={openCertificate}><Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-3xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader><DialogTitle>Performance Certificate</DialogTitle><DialogDescription>{props.playerName} · {props.contestName || GLOBAL_CHALLENGE}</DialogDescription></DialogHeader>
          {busy ? <div className="aspect-[24/17] grid place-items-center text-muted-foreground">Preparing certificate…</div> : prepared ? <img src={prepared.url} alt={`Performance certificate for ${props.playerName}`} className="w-full aspect-[24/17] object-contain" /> : <Button onClick={() => void prepare()}>Try again</Button>}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button disabled={!prepared || busy} onClick={() => { if (prepared) void deliverFile(prepared.blob, prepared.filename); }}><Download className="mr-2 h-4 w-4" />Download</Button>
              <Button variant="outline" disabled={!prepared || busy} onClick={() => void copyImage()}><Copy className="mr-2 h-4 w-4" />Copy image</Button>
            </div>
            <section aria-label="Share image" className="w-fit rounded-lg border border-border px-3 py-2 flex flex-col items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground text-center">Share image</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" title="Facebook" aria-label="Share on Facebook" disabled={!prepared || busy} onClick={() => social("facebook")}><Facebook className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" title="X / Twitter" aria-label="Share on X" disabled={!prepared || busy} onClick={() => social("x")}><span className="font-bold">𝕏</span></Button>
                <Button variant="outline" size="icon" title="Instagram" aria-label="Share on Instagram" disabled={!prepared || busy} onClick={() => social("instagram")}><Instagram className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" title="WhatsApp" aria-label="Share on WhatsApp" disabled={!prepared || busy} onClick={() => social("whatsapp")}><MessageCircle className="h-4 w-4" /></Button>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}