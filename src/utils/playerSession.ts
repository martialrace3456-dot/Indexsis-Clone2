import type { Player } from "./playerAuth";

export const PLAYER_SESSION_KEY = "indexsis_player_session";
type SessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserStorage(): SessionStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function readPlayerSession(storage = browserStorage()): Player | null {
  try {
    const raw = storage?.getItem(PLAYER_SESSION_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || !("id" in value) || !("username" in value)) return null;
    if (typeof value.id !== "string" || !value.id.trim() || typeof value.username !== "string" || !value.username.trim()) return null;
    return { id: value.id, username: value.username };
  } catch {
    return null;
  }
}

export function savePlayerSession(player: Player, storage = browserStorage()): void {
  try {
    // Persist identity only, never passwords or password hashes.
    storage?.setItem(PLAYER_SESSION_KEY, JSON.stringify({ id: player.id, username: player.username }));
  } catch { /* Keep the current sign-in usable when browser storage is disabled. */ }
}

export function clearPlayerSession(storage = browserStorage()): void {
  try {
    storage?.removeItem(PLAYER_SESSION_KEY);
  } catch { /* The current screen still signs out when storage is disabled. */ }
}