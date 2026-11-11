import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";

export type PortalTab = "home" | "finance" | "history";
export type CampaignTab = "running" | "pending" | "expired";
export type BidListTarget = "ongoing" | "expired" | "reserved";

interface NavState {
  tab: PortalTab;
  setTab: (t: PortalTab) => void;
  campaignTab: CampaignTab;
  setCampaignTab: (t: CampaignTab) => void;
  bidTab: BidListTarget;
  setBidTab: (t: BidListTarget) => void;
  /** id of the ad / campaign / bid to highlight with a halo */
  highlightId: string | null;
  highlight: (id: string) => void;
  homeSub: "ads" | "links";
  setHomeSub: (s: "ads" | "links") => void;
}

const Ctx = createContext<NavState | null>(null);

export function AdvertiserNavProvider({
  children,
  tab,
  setTab,
}: {
  children: ReactNode;
  tab: PortalTab;
  setTab: (t: PortalTab) => void;
}) {
  const [campaignTab, setCampaignTab] = useState<CampaignTab>("running");
  const [bidTab, setBidTab] = useState<BidListTarget>("ongoing");
  const [homeSub, setHomeSub] = useState<"ads" | "links">("ads");
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const highlight = useCallback((id: string) => {
    setHighlightId(id);
    window.setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 6000);
  }, []);

  const value = useMemo(
    () => ({ tab, setTab, campaignTab, setCampaignTab, bidTab, setBidTab, highlightId, highlight, homeSub, setHomeSub }),
    [tab, setTab, campaignTab, bidTab, highlightId, highlight, homeSub],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Returns null when rendered outside the advertiser portal (e.g. inside admin). */
export function useAdvertiserNav() {
  return useContext(Ctx);
}
