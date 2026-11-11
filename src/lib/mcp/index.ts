import { defineMcp } from "@lovable.dev/mcp-js";
import getGameInfo from "./tools/get-game-info";
import getGlobalStats from "./tools/get-global-stats";
import listActiveContests from "./tools/list-active-contests";
import getContestStats from "./tools/get-contest-stats";

export default defineMcp({
  name: "indexsis-mcp",
  title: "Indexsis MCP",
  version: "0.1.0",
  instructions:
    "Public read-only tools for Indexsis, a dot-estimation guessing game. Use `get_game_info` to learn how the game works, `get_global_stats` for the Global Estimator Challenge leaderboard, `list_active_contests` for currently active private contests, and `get_contest_stats` to read a specific contest's leaderboard by id. All tools return public data only.",
  tools: [getGameInfo, getGlobalStats, listActiveContests, getContestStats],
});