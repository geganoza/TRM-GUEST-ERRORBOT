import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import type { Config } from "./config";
import { allowedOrigins } from "./config";
import type { LLM, LLMMessage } from "./llm";
import type { HvacErrorApi } from "./error-api";
import { GUEST_TOOLS, makeExecute } from "./tools";
import { runGuestTurn } from "./agent";
import { initSSE, sendToken, sendDone, sendError } from "./sse";

export interface AppDeps { config: Config; llm: LLM; api: HvacErrorApi; }

const MAX_MESSAGE_LEN = 2000;
const MAX_TURNS = 12;

function validate(body: unknown): { ok: true; messages: LLMMessage[] } | { ok: false; message: string } {
  const messages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_TURNS) {
    return { ok: false, message: `messages must be a non-empty array of <= ${MAX_TURNS}` };
  }
  for (const m of messages) {
    const r = (m as { role?: unknown }).role, c = (m as { content?: unknown }).content;
    if ((r !== "user" && r !== "assistant") || typeof c !== "string") return { ok: false, message: "each message needs role user|assistant and string content" };
    if (c.length > MAX_MESSAGE_LEN) return { ok: false, message: `message exceeds ${MAX_MESSAGE_LEN} chars` };
  }
  if ((messages[messages.length - 1] as { role: string }).role !== "user") return { ok: false, message: "last message must be from the user" };
  return { ok: true, messages: messages as LLMMessage[] };
}

export function createApp(deps: AppDeps): express.Express {
  const { config, llm, api } = deps;
  const app = express();
  app.use(helmet());
  const origins = allowedOrigins(config);
  app.use(cors(origins.length ? { origin: origins } : {}));
  app.use(express.json({ limit: "64kb" }));
  app.use("/message", rateLimit({ windowMs: config.RATE_WINDOW_MS, max: config.RATE_MAX, standardHeaders: true, legacyHeaders: false }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "trm-guest-errorbot", build: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown", timestamp: new Date().toISOString() });
  });

  app.post("/message", async (req, res) => {
    const v = validate(req.body);
    if (!v.ok) { res.status(400).json({ error: { code: "VALIDATION_ERROR", message: v.message } }); return; }
    const execute = makeExecute(api);
    initSSE(res);
    try {
      await runGuestTurn({ messages: v.messages, llm, tools: GUEST_TOOLS, execute, onToken: (t) => sendToken(res, t) });
      sendDone(res);
    } catch (e) {
      sendError(res, e instanceof Error ? e.message : "internal error");
    }
  });

  return app;
}
