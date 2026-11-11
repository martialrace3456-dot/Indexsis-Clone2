import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getPublicSupabase } from "../supabase";

export default defineTool({
  name: "list_active_contests",
  title: "List active contests",
  description:
    "List currently active, approved private contests on Indexsis. Returns public metadata only (id, name, description, participant limit, duration, ends_at). Does not return passcodes.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .describe("Maximum number of contests to return (default 50, max 200)."),
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
    const n = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("contests")
      .select("id,name,description,duration_minutes,participant_limit,starts_at,ends_at,status")
      .eq("status", "active")
      .eq("approval_status", "approved")
      .gt("ends_at", nowIso)
      .order("ends_at", { ascending: true })
      .limit(n);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { contests: data ?? [] },
    };
  },
});