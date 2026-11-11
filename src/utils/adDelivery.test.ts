/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { allocatePlacements, campaignMatchesAudience } from "./adDelivery";
import type { AdCampaign } from "../types/admin";
const ad={id:"a",placement:"top-left",created_at:"2026-01-01",country_targets:["Nepal"],contest_targets:["global"],age_target:"above_16"} as AdCampaign;
test("ads require matching country contest and age",()=>{assert.equal(campaignMatchesAudience(ad,{country:"Nepal",ageGroup:"above_18",contestId:null}),true);assert.equal(campaignMatchesAudience(ad,{country:"India",ageGroup:"above_18",contestId:null}),false);assert.equal(campaignMatchesAudience(ad,{country:"Nepal",ageGroup:null,contestId:null}),false);});
test("non-overlapping ads run together and a covered ad cannot run",()=>{assert.deepEqual(allocatePlacements([ad,{...ad,id:"b",placement:"top-right"},{...ad,id:"c",placement:"whole-board"}]).map((c)=>c.id),["a","b"]);});
test("All country contest and age options admit all audiences", () => {
  const all = { ...ad, country_targets: [], contest_targets: [], age_target: "all" } as AdCampaign;
  assert.equal(campaignMatchesAudience(all, { country: null, ageGroup: null, contestId: null }), true);
  assert.equal(campaignMatchesAudience(all, { country: "USA", ageGroup: "above_12", contestId: "contest-a" }), true);
});
test("multiple selected countries and contests restrict delivery to their intersection", () => {
  const targeted = { ...ad, country_targets: ["USA", "UK"], contest_targets: ["contest-a", "contest-b"], age_target: "above_12" } as AdCampaign;
  assert.equal(campaignMatchesAudience(targeted, { country: "UK", ageGroup: "above_18", contestId: "contest-b" }), true);
  assert.equal(campaignMatchesAudience(targeted, { country: "France", ageGroup: "above_18", contestId: "contest-b" }), false);
  assert.equal(campaignMatchesAudience(targeted, { country: "USA", ageGroup: "above_18", contestId: "contest-c" }), false);
  assert.equal(campaignMatchesAudience(targeted, { country: "USA", ageGroup: "above_18", contestId: null }), false);
  assert.equal(campaignMatchesAudience(targeted, { country: "USA", ageGroup: null, contestId: "contest-a" }), false);
});