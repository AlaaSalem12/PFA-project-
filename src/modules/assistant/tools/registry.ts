import type { ToolRegistry } from "../assistant.types";

/** Placeholder until the tool catalogue (P2-02) is wired in: no tools, every call is rejected. */
export const assistantRegistry: ToolRegistry = {
  forUser: () => [],
  run: async (_user, name) => ({ error: `unknown tool: ${name}` }),
};
