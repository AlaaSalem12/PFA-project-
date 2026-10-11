import type { AssistantTool } from "../assistant.types";

/** Lets each tool keep precise argument types while the registry stores them uniformly. */
export const defineTool = <Args>(tool: AssistantTool<Args>): AssistantTool<unknown> => tool as unknown as AssistantTool<unknown>;
