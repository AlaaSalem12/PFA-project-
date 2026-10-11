import { z } from "zod";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import type { AuthUser } from "../../../middlewares/auth";
import type { AssistantTool, ToolRegistry } from "../assistant.types";
import { accountTools } from "./account.tools";
import { hrTools } from "./hr.tools";
import { machineTools } from "./machines.tools";
import { maintenanceTools } from "./maintenance.tools";

export const MAX_ROWS = 20;

const toFunctionDefinition = (tool: AssistantTool<unknown>): ChatCompletionTool => {
  // "input" mode keeps fields with defaults optional for the model.
  const { $schema: _ignored, ...parameters } = z.toJSONSchema(tool.args, { io: "input" }) as Record<string, unknown>;
  return { type: "function", function: { name: tool.name, description: tool.description, parameters } };
};

/** Keeps answers small: arrays (top level or one level down) are cut to MAX_ROWS and flagged. */
export const capRows = (result: unknown): unknown => {
  if (Array.isArray(result)) {
    return result.length > MAX_ROWS ? { items: result.slice(0, MAX_ROWS), truncated: true } : result;
  }
  if (result && typeof result === "object") {
    let truncated = false;
    const capped = Object.fromEntries(Object.entries(result).map(([key, value]) => {
      if (Array.isArray(value) && value.length > MAX_ROWS) {
        truncated = true;
        return [key, value.slice(0, MAX_ROWS)];
      }
      return [key, value];
    }));
    return truncated ? { ...capped, truncated: true } : capped;
  }
  return result;
};

export const createRegistry = (tools: AssistantTool<unknown>[]): ToolRegistry => {
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  return {
    forUser: (user: AuthUser) => tools.filter((tool) => tool.roles.includes(user.role)).map(toFunctionDefinition),
    run: async (user: AuthUser, name: string, rawArgs: unknown) => {
      const tool = byName.get(name);
      if (!tool) return { error: `unknown tool: ${name}` };
      // Second role check: the model could name a tool it was never offered.
      if (!tool.roles.includes(user.role)) return { error: "not allowed" };
      const parsed = tool.args.safeParse(rawArgs ?? {});
      if (!parsed.success) {
        return { error: parsed.error.issues.map((issue) => `${issue.path.join(".") || "args"}: ${issue.message}`).join("; ") };
      }
      try {
        return capRows(await tool.handler({ user }, parsed.data));
      } catch (error) {
        console.error(`[assistant] tool ${name} failed`, error);
        return { error: "tool failed" };
      }
    },
  };
};

export const allTools: AssistantTool<unknown>[] = [...machineTools, ...maintenanceTools, ...hrTools, ...accountTools];
export const assistantRegistry: ToolRegistry = createRegistry(allTools);
