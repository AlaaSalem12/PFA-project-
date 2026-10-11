import request from "supertest";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import { app } from "../app";
import { AssistantService, assistantService, StreamEvent } from "../modules/assistant/assistant.service";
import { ApiError } from "../common/api-error";
import { mockPrisma, tokenFor } from "../test/helpers";

const user = { id: 1, username: "admin", role: "ADMIN" as const, employeeId: null, tokenVersion: 0, mustChangePassword: false };
const chunk = (delta: object): ChatCompletionChunk =>
  ({ id: "s", object: "chat.completion.chunk", created: 0, model: "m", choices: [{ index: 0, delta, finish_reason: null }] }) as ChatCompletionChunk;

async function* stream(chunks: ChatCompletionChunk[]) {
  for (const item of chunks) yield item;
}

describe("assistant streaming (P2-06)", () => {
  beforeEach(() => {
    mockPrisma.assistantConversation.findFirst.mockResolvedValue({ id: 5, userId: 1 });
  });

  it("assembles streamed tool-call deltas, emits tool and text events and saves the final answer", async () => {
    // Service-level test only: the HTTP tests below need the real user lookup for authentication.
    mockPrisma.user.findUnique.mockResolvedValue({ fullName: "System Administrator" });
    const rounds = [
      [
        chunk({ tool_calls: [{ index: 0, id: "call_1", type: "function", function: { name: "get_fleet_summary", arguments: "" } }] }),
        chunk({ tool_calls: [{ index: 0, function: { arguments: "{}" } }] }),
      ],
      [chunk({ content: "Il y a " }), chunk({ content: "16 machines." })],
    ];
    const create = jest.fn(async () => stream(rounds.shift() ?? []));
    const run = jest.fn(async () => ({ total: 16 }));
    const service = new AssistantService({
      streamClient: () => ({ chat: { completions: { create } } }),
      registry: { forUser: () => [{ type: "function", function: { name: "get_fleet_summary", parameters: { type: "object" } } }], run },
      model: () => "m", enabled: () => true,
    });
    const events: StreamEvent[] = [];
    const result = await service.streamMessage(user, 5, "Combien de machines ?", (event) => events.push(event));

    expect(run).toHaveBeenCalledWith(user, "get_fleet_summary", {});
    expect(events).toEqual([
      { type: "tool", name: "get_fleet_summary" },
      { type: "delta", text: "Il y a " },
      { type: "delta", text: "16 machines." },
    ]);
    expect(result.assistantMessage).toMatchObject({ content: "Il y a 16 machines.", toolsUsed: ["get_fleet_summary"] });
    const firstCall = create.mock.calls[0] as unknown as [{ stream: boolean }];
    expect(firstCall[0].stream).toBe(true);
  });

  it("answers JSON 503 before streaming when the assistant is disabled", async () => {
    const response = await request(app).post("/api/v1/assistant/conversations/5/messages/stream")
      .set("Authorization", `Bearer ${tokenFor("admin")}`).send({ content: "Bonjour" });
    expect(response.status).toBe(503);
    expect(response.headers["content-type"]).toMatch(/json/);
    expect(response.body.code).toBe("ASSISTANT_UNAVAILABLE");
  });

  it("streams tool, delta and done events as text/event-stream", async () => {
    jest.spyOn(assistantService, "assertCanSend").mockResolvedValueOnce();
    const now = new Date();
    jest.spyOn(assistantService, "streamMessage").mockImplementationOnce(async (_user, _id, _content, emit) => {
      emit({ type: "tool", name: "search_machines" });
      emit({ type: "delta", text: "FURN-001" });
      return {
        userMessage: { id: 1, role: "user", content: "q", toolsUsed: [], createdAt: now },
        assistantMessage: { id: 2, role: "assistant", content: "FURN-001", toolsUsed: ["search_machines"], createdAt: now },
        latencyMs: 10,
      };
    });
    const response = await request(app).post("/api/v1/assistant/conversations/5/messages/stream")
      .set("Authorization", `Bearer ${tokenFor("admin")}`).send({ content: "Pannes ?" });
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/text\/event-stream/);
    expect(response.headers["x-accel-buffering"]).toBe("no");
    expect(response.text).toContain('event: tool\ndata: {"name":"search_machines"}');
    expect(response.text).toContain('event: delta\ndata: {"text":"FURN-001"}');
    expect(response.text).toMatch(/event: done\ndata: \{"userMessage"/);
  });

  it("reports failures during the stream as an error event", async () => {
    jest.spyOn(assistantService, "assertCanSend").mockResolvedValueOnce();
    jest.spyOn(assistantService, "streamMessage").mockRejectedValueOnce(
      new ApiError(503, "Assistant is unavailable right now", [], "ASSISTANT_UNAVAILABLE"),
    );
    const response = await request(app).post("/api/v1/assistant/conversations/5/messages/stream")
      .set("Authorization", `Bearer ${tokenFor("admin")}`).send({ content: "x" });
    expect(response.status).toBe(200);
    expect(response.text).toContain('event: error\ndata: {"message":"Assistant is unavailable right now","code":"ASSISTANT_UNAVAILABLE"}');
  });
});
