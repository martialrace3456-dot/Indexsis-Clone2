import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getPublicSupabase } from "../supabase";

export default defineTool({
  name: "get_global_stats",
  title: "Get global stats",
  description:
    "Return the top scores from the Indexsis Global Estimator Challenge leaderboard, ordered by highest total score.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .describe("Maximum number of rows to return (default 20, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }) => {
    const supabase = getPublicSupabase();
    if (!supabase) {
      return {
        content: [{ type: "text", text: "Backend not configured." }],
        isError: true,
      };
    }
    const n = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const { data, error } = await supabase
      .from("scores")
      .select("player_name,total_score,game_date")
      .order("total_score", { ascending: false })
      .limit(n);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { rows: data ?? [] },
    };
  },
});