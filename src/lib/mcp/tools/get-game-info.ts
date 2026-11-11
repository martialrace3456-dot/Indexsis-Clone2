import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "get_game_info",
  title: "Get game info",
  description:
    "Return a description of Indexsis, its game mechanics, and the modes available to players.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [
      {
        type: "text",
        text: [
          "Indexsis is a dot-estimation guessing game.",
          "Each match has exactly 7 rounds. Every turn, players take 5 samples on a board containing 25,000-100,000 dots; each sample is a circle whose area is 1/25 of the board.",
          "Modes: 'The Global Estimator Challenge' (single player, contributes to the global stats), 'Double Player: Local Duel' (two players alternating, P1 then P2), and Private Contests (passcode-based rooms with their own stats).",
        ].join(" "),
      },
    ],
  }),
});