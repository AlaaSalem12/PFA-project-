import request from "supertest";
import { app } from "../app";
import { assistantService } from "../modules/assistant/assistant.service";
import { mockPrisma, tokenFor } from "../test/helpers";

const auth = (user: string) => ({ Authorization: `Bearer ${tokenFor(user)}` });

describe("assistant API (P2-03)", () => {
  it("reports the assistant as disabled when no LLM is configured", async () => {
    const response = await request(app).get("/api/v1/assistant/status").set(auth("employee"));
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ enabled: false, model: null });
    expect((await request(app).get("/api/v1/assistant/status")).status).toBe(401);
  });

  it("creates and lists only the caller's own conversations", async () => {
    const created = await request(app).post("/api/v1/assistant/conversations").set(auth("tech")).send({});
    expect(created.status).toBe(201);
    expect(created.body).toEqual({ id: 5, title: "Nouvelle conversation" });
    expect(mockPrisma.assistantConversation.create).toHaveBeenCalledWith({ data: { userId: 4, title: "Nouvelle conversation" } });

    mockPrisma.assistantConversation.findMany.mockResolvedValueOnce([{ id: 5, title: "Pannes", updatedAt: new Date() }]);
    const list = await request(app).get("/api/v1/assistant/conversations").set(auth("tech"));
    expect(list.status).toBe(200);
    expect(list.body[0]).toMatchObject({ id: 5, title: "Pannes" });
    const query = mockPrisma.assistantConversation.findMany.mock.calls[0][0] as unknown as { where: { userId: number } };
    expect(query.where.userId).toBe(4);
  });

  it("returns 404 for another user's conversation (messages, send and delete)", async () => {
    mockPrisma.assistantConversation.findFirst.mockResolvedValue(null);
    expect((await request(app).get("/api/v1/assistant/conversations/9/messages").set(auth("employee"))).status).toBe(404);
    expect((await request(app).delete("/api/v1/assistant/conversations/9").set(auth("employee"))).status).toBe(404);
    expect(mockPrisma.assistantConversation.delete).not.toHaveBeenCalled();
  });

  it("validates message content (trimmed, 1 to 2000 characters)", async () => {
    const empty = await request(app).post("/api/v1/assistant/conversations/5/messages").set(auth("employee")).send({ content: "   " });
    expect(empty.status).toBe(400);
    expect(empty.body.code).toBe("VALIDATION_ERROR");
    const tooLong = await request(app).post("/api/v1/assistant/conversations/5/messages").set(auth("employee")).send({ content: "x".repeat(2001) });
    expect(tooLong.status).toBe(400);
  });

  it("answers 503 ASSISTANT_UNAVAILABLE when the LLM is not configured", async () => {
    mockPrisma.assistantConversation.findFirst.mockResolvedValue({ id: 5, userId: 2 });
    const response = await request(app).post("/api/v1/assistant/conversations/5/messages").set(auth("employee")).send({ content: "Bonjour" });
    expect(response.status).toBe(503);
    expect(response.body.code).toBe("ASSISTANT_UNAVAILABLE");
    expect(mockPrisma.assistantMessage.create).not.toHaveBeenCalled();
  });

  it("returns {userMessage, assistantMessage} and audits without the message text", async () => {
    const now = new Date();
    const spy = jest.spyOn(assistantService, "sendMessage").mockResolvedValueOnce({
      userMessage: { id: 1, role: "user", content: "Quelles machines sont en panne ?", toolsUsed: [], createdAt: now },
      assistantMessage: { id: 2, role: "assistant", content: "FURN-001 est en panne.", toolsUsed: ["search_machines"], createdAt: now },
      latencyMs: 812,
    });
    const response = await request(app).post("/api/v1/assistant/conversations/5/messages").set(auth("admin"))
      .send({ content: "  Quelles machines sont en panne ?  " });
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).sort()).toEqual(["assistantMessage", "userMessage"]);
    expect(response.body.assistantMessage.toolsUsed).toEqual(["search_machines"]);
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 1, role: "ADMIN" }), 5, "Quelles machines sont en panne ?");
    const audit = mockPrisma.auditLog.create.mock.calls.map((call) => (call as unknown as [{ data: { action: string; metadata: object } }])[0].data)
      .find((entry) => entry.action === "ASSISTANT_MESSAGE");
    expect(audit?.metadata).toEqual({ conversationId: 5, toolsUsed: ["search_machines"], latencyMs: 812 });
    expect(JSON.stringify(audit)).not.toContain("panne");
    spy.mockRestore();
  });

  it("lists only user and assistant messages, mapped to the contract shape", async () => {
    mockPrisma.assistantConversation.findFirst.mockResolvedValue({ id: 5, userId: 2 });
    mockPrisma.assistantMessage.findMany.mockResolvedValueOnce([
      { id: 1, role: "USER", content: "Salut", toolCalls: null, createdAt: new Date() },
      { id: 3, role: "ASSISTANT", content: "Bonjour !", toolCalls: ["get_my_profile"], createdAt: new Date() },
    ]);
    const response = await request(app).get("/api/v1/assistant/conversations/5/messages").set(auth("employee"));
    expect(response.status).toBe(200);
    expect(response.body.map((message: { role: string }) => message.role)).toEqual(["user", "assistant"]);
    expect(response.body[1].toolsUsed).toEqual(["get_my_profile"]);
    expect(Object.keys(response.body[0]).sort()).toEqual(["content", "createdAt", "id", "role", "toolsUsed"]);
    const query = mockPrisma.assistantMessage.findMany.mock.calls[0][0] as unknown as { where: { role: { in: string[] } } };
    expect(query.where.role.in).toEqual(["USER", "ASSISTANT"]);
  });

  it("deletes the caller's own conversation and serves role-specific suggestions", async () => {
    mockPrisma.assistantConversation.findFirst.mockResolvedValue({ id: 5, userId: 6 });
    expect((await request(app).delete("/api/v1/assistant/conversations/5").set(auth("hr"))).status).toBe(204);
    expect(mockPrisma.assistantConversation.delete).toHaveBeenCalledWith({ where: { id: 5 } });

    const hr = await request(app).get("/api/v1/assistant/suggestions").set(auth("hr"));
    const employee = await request(app).get("/api/v1/assistant/suggestions").set(auth("employee"));
    expect(hr.body.length).toBeGreaterThanOrEqual(4);
    expect(hr.body.join(" ")).toMatch(/employ/i);
    expect(employee.body.join(" ")).not.toMatch(/département|congé/i);
  });
});
