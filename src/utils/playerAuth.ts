import { supabase } from "@/integrations/supabase/client";

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const inputHash = await hashPassword(password);
  return inputHash === hash;
}

export interface Player {
  id: string;
  username: string;
}

export async function registerPlayer(username: string, password: string, country?: string, ageGroup?: string, email?: string): Promise<Player | null> {
  const password_hash = await hashPassword(password);
  const insertData: any = { username, password_hash };
  if (country) insertData.country = country;
  if (ageGroup) insertData.age_group = ageGroup;
  if (email) insertData.email = email;
  const { data, error } = await supabase
    .from("players")
    .insert(insertData)
    .select("id, username")
    .single();

  if (error) {
    console.error("Registration error:", error);
    return null;
  }
  return data;
}

export async function loginPlayer(username: string, password: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from("players")
    .select("id, username, password_hash")
    .eq("username", username)
    .single();

  if (error || !data) return null;

  const isValid = await verifyPassword(password, (data as any).password_hash);
  if (!isValid) return null;

  return { id: data.id, username: data.username };
}

export async function updatePlayerProfile(
  playerId: string, 
  updates: { username?: string; password?: string; country?: string; ageGroup?: string; email?: string }
): Promise<boolean> {
  const updateData: Record<string, any> = {};
  
  if (updates.username) updateData.username = updates.username;
  if (updates.password) updateData.password_hash = await hashPassword(updates.password);
  if (updates.country !== undefined) updateData.country = updates.country || null;
  if (updates.ageGroup !== undefined) updateData.age_group = updates.ageGroup || null;
  if (updates.email !== undefined) updateData.email = updates.email || null;

  const { error } = await supabase
    .from("players")
    .update(updateData)
    .eq("id", playerId);

  if (error) {
    console.error("Update error:", error);
    return false;
  }

  // If username changed, update all scores
  if (updates.username) {
    const { data: player } = await supabase
      .from("players")
      .select("username")
      .eq("id", playerId)
      .single();
    
    if (player) {
      // We need the old username to update scores - this is handled by the caller
    }
  }

  return true;
}
