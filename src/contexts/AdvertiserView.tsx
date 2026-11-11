import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { setAdvertiserScope, getAdvertiserScope } from "@/utils/currentAdvertiser";

export interface AdvertiserViewValue {
  ownerId: string;
  username: string;
  viewOnly: boolean;
}

const AdvertiserViewContext = createContext<AdvertiserViewValue | null>(null);

/** Non-null only inside the admin's read-only advertiser view. */
export function useAdvertiserView(): AdvertiserViewValue | null {
  return useContext(AdvertiserViewContext);
}

/**
 * Renders children in the context of one advertiser account. While mounted,
 * owner-scoped hooks read that advertiser's data instead of the signed-in
 * account; in view-only mode history writes are suppressed and mutating UI
 * is hidden.
 */
export function AdvertiserViewProvider({
  ownerId,
  username,
  viewOnly = true,
  children,
}: {
  ownerId: string;
  username: string;
  viewOnly?: boolean;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(() => getAdvertiserScope()?.ownerId === ownerId);

  useEffect(() => {
    setAdvertiserScope({ ownerId, username, viewOnly });
    setReady(true);
    return () => setAdvertiserScope(null);
  }, [ownerId, username, viewOnly]);

  // The scope must be active before children mount, so their first fetches
  // resolve against the viewed advertiser.
  if (!ready) return null;

  return (
    <AdvertiserViewContext.Provider value={{ ownerId, username, viewOnly }}>
      {children}
    </AdvertiserViewContext.Provider>
  );
}
