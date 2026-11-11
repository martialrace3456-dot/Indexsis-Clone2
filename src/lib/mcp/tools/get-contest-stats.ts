import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getPublicSupabase } from "../supabase";

export default defineTool({
  name: "get_contest_stats",
  title: "Get contest stats",
  description:
    "Return the top scores for a specific private contest by contest id, ordered by highest total score.",
  inputSchema: {
    contest_id: z.string().describe("The contest id (UUID)."),
    limit: z
      .number()
      .int()
      .describe("Maximum number of rows to return (default 20, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ contest_id, limit }) => {
    const supabase = getPublicSupabase();
    if (!supabase) {
      return {
        content: [{ type: "text", text: "Backend not configured." }],
        isError: true,
      };
    }
    const n = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const { data, error } = await supabase
      .from("contest_scores")
      .select("player_name,total_score,game_date,duration_seconds")
      .eq("contest_id", contest_id)
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