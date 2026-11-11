import { Player } from "./playerAuth";

/** Override scope set by the admin "view as advertiser" screen. */
export interface AdvertiserScope {
  ownerId: string;
  username: string;
  viewOnly: boolean;
}

let scope: AdvertiserScope | null = null;

export function setAdvertiserScope(s: AdvertiserScope | null) {
  scope = s;
}

export function getAdvertiserScope(): AdvertiserScope | null {
  return scope;
}

export function getCurrentAdvertiserId(): string | null {
  // When the admin is viewing an advertiser's data, every owner-scoped
  // hook reads that advertiser's id instead of the signed-in one.
  if (scope) return scope.ownerId;
  try {
    const raw = localStorage.getItem("advertiser_player");
    if (!raw) return null;
    return (JSON.parse(raw) as Player).id;
  } catch {
    return null;
  }
}
