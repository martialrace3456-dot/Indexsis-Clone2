/// <reference types="node" />
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { clearPlayerSession, PLAYER_SESSION_KEY, readPlayerSession, savePlayerSession } from "./playerSession";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
}

describe("player sign-in persistence", () => {
  test("returning to setup or reloading restores the signed-in identity", () => {
    const storage = memoryStorage();
    savePlayerSession({ id: "player-123", username: "Alex" }, storage);
    assert.deepEqual(readPlayerSession(storage), { id: "player-123", username: "Alex" });
    assert.deepEqual(readPlayerSession(storage), { id: "player-123", username: "Alex" });
  });

  test("explicit sign-out clears the identity without signing out the advertiser portal", () => {
    const storage = memoryStorage();
    storage.setItem("advertiser_player", "separate-session");
    savePlayerSession({ id: "player-123", username: "Alex" }, storage);
    clearPlayerSession(storage);
    assert.equal(readPlayerSession(storage), null);
    assert.equal(storage.getItem("advertiser_player"), "separate-session");
  });

  test("only identity is saved, not credentials", () => {
    const storage = memoryStorage();
    const player = { id: "player-123", username: "Alex", password: "never-store", password_hash: "never-store" };
    savePlayerSession(player, storage);
    assert.deepEqual(JSON.parse(storage.getItem(PLAYER_SESSION_KEY) ?? "null"), { id: "player-123", username: "Alex" });
  });

  test("updated profile names persist for the next visit", () => {
    const storage = memoryStorage();
    savePlayerSession({ id: "player-123", username: "Alex" }, storage);
    savePlayerSession({ id: "player-123", username: "AlexNew" }, storage);
    assert.deepEqual(readPlayerSession(storage), { id: "player-123", username: "AlexNew" });
  });

  test("invalid stored data does not sign a player in", () => {
    const storage = memoryStorage();
    for (const raw of ["broken-json", "null", '{"id":123,"username":"Alex"}', '{"id":"","username":"Alex"}']) {
      storage.setItem(PLAYER_SESSION_KEY, raw);
      assert.equal(readPlayerSession(storage), null);
    }
  });
});