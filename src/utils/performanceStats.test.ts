/// <reference types="node" />
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { bestContestScores, certificateIssueDate, certificateMetrics, performanceRank } from "./performanceStats";

describe("performance certificate rules", () => {
  const certificate = { playerName: "Alex Mercer", contestName: "The Global Estimator Challenge", finalScore: 67.77, worldRank: 12, issuedAt: new Date(2026, 9, 22) };
  test("global challenge has only Final Score and World Rank", () => {
    assert.deepEqual(certificateMetrics(certificate), [{ label: "FINAL SCORE", value: "67.77" }, { label: "WORLD RANK", value: "#12" }]);
  });
  test("private contests include Contest Rank between score and world rank", () => {
    assert.deepEqual(certificateMetrics({ ...certificate, contestName: "Global Precision Championship 2026", contestRank: 4 }), [
      { label: "FINAL SCORE", value: "67.77" }, { label: "CONTEST RANK", value: "#4" }, { label: "WORLD RANK", value: "#12" },
    ]);
  });
  test("issue date is the generation date", () => { assert.equal(certificateIssueDate(certificate.issuedAt), "October 22, 2026"); });
  test("contest ranking uses one best score per player", () => {
    const scores = bestContestScores([{ player_name: "Alex", total_score: 67.77 }, { player_name: "Alex", total_score: 60 }, { player_name: "Sam", total_score: 70 }]);
    assert.equal(scores.length, 2); assert.equal(performanceRank(67.77, scores), 2);
  });
  test("world ranks include higher scores but not tied scores", () => {
    assert.equal(performanceRank(67.77, [{ total_score: 80 }, { total_score: 67.77 }, { total_score: 60 }]), 2);
  });
});
test("equal scores: earlier submission ranks higher, unsubmitted ranks behind", () => {
  const s = [{ total_score: 50, created_at: "2026-01-01" }, { total_score: 50, created_at: "2026-02-01" }];
  if (performanceRank(50, s, "2026-01-01") !== 1) throw new Error("earlier");
  if (performanceRank(50, s, "2026-02-01") !== 2) throw new Error("later");
  if (performanceRank(50, s, "9999") !== 3) throw new Error("unsubmitted");
});
