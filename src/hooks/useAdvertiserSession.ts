import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { loginPlayer, registerPlayer, Player } from "@/utils/playerAuth";

const STORAGE_KEY = "advertiser_player";

let currentPlayer: Player | null = (() => {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return raw ? (JSON.parse(raw) as Player) : null;
  } catch { return null; }
})();
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => currentPlayer;
const persist = (p: Player | null) => {
  currentPlayer = p;
  try {
    if (p) localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* noop */ }
  listeners.forEach((l) => l());
};

export function useAdvertiserSession() {
  const player = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (username: string, password: string) => {
    const p = await loginPlayer(username, password);
    if (!p) return { error: "Invalid username or password." };
    persist(p);
    return { error: null };
  }, []);

  const register = useCallback(async (
    username: string,
    password: string,
    email?: string,
    country?: string,
    ageGroup?: string,
  ) => {
    const p = await registerPlayer(username, password, country, ageGroup, email);
    if (!p) return { error: "Username already taken or registration failed." };
    persist(p);
    return { error: null };
  }, []);

  const logout = useCallback(() => persist(null), []);

  return { player, loading, login, register, logout };
}