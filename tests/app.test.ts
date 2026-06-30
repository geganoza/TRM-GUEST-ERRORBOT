import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

function appWith(llmText: string) {
  const llm: any = { chat: async () => ({ stopReason: "end", text: llmText, toolCalls: [], rawAssistant: [] }) };
  const api: any = {};
  const config: any = { PORT: 8080, ALLOWED_ORIGINS: "", RATE_MAX: 100, RATE_WINDOW_MS: 60000 };
  return createApp({ config, llm, api });
}

describe("health", () => {
  it("GET /health returns ok + build field", async () => {
    const res = await request(appWith("x")).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("trm-guest-errorbot");
    expect(res.body).toHaveProperty("build");
  });
});

describe("POST /message", () => {
  it("400s when messages is missing or last is not a user turn", async () => {
    const app = appWith("x");
    expect((await request(app).post("/message").send({})).status).toBe(400);
    expect((await request(app).post("/message").send({ messages: [{ role: "assistant", content: "hi" }] })).status).toBe(400);
  });
  it("streams tokens then done for a valid request", async () => {
    const app = appWith("გამარჯობა! რომელი მოწყობილობაა?");
    const res = await request(app).post("/message").send({ messages: [{ role: "user", content: "E5" }] });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(res.text).toContain("event: token");
    expect(res.text).toContain("რომელი მოწყობილობაა");
    expect(res.text).toContain("event: done");
  });
  it("400s when a message exceeds the length cap", async () => {
    const app = appWith("x");
    const res = await request(app).post("/message").send({ messages: [{ role: "user", content: "a".repeat(2001) }] });
    expect(res.status).toBe(400);
  });
});
