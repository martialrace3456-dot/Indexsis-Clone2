/** Override scope set by the admin "view as advertiser" screen. */
export interface AdvertiserScope {
  ownerId: string;
  username: string;
  viewOnly: boolean;
}

let scope: AdvertiserScope | null = null;
let authenticatedAdvertiserId: string | null = null;

export function setAdvertiserScope(next: AdvertiserScope | null) {
  scope = next;
}

export function getAdvertiserScope(): AdvertiserScope | null {
  return scope;
}

/** Cached only for query convenience; database RLS remains the authorization boundary. */
export function setAuthenticatedAdvertiserId(id: string | null) {
  authenticatedAdvertiserId = id;
}

export function getCurrentAdvertiserId(): string | null {
  if (scope) return scope.ownerId;
  return authenticatedAdvertiserId;
}
