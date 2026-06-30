export interface ToolDef {
  name: string;
  description: string;
  input_schema: { type: "object"; properties: Record<string, unknown>; required?: string[] };
}
export interface ToolCall { id: string; name: string; args: Record<string, unknown>; }
export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: unknown[];
  tool_call_id?: string;
}
export interface LLMResult { stopReason: "tool_use" | "end"; text: string; toolCalls: ToolCall[]; rawAssistant: LLMMessage; }
export interface LLM {
  chat(args: { system: string; messages: LLMMessage[]; tools: ToolDef[]; maxTokens: number }): Promise<LLMResult>;
}

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

// Newer families (gpt-5.x / o-series) use max_completion_tokens and reject temperature.
function isNewGen(model: string): boolean { return /^(gpt-5|o[0-9])/.test(model); }

export function toOpenAITools(tools: ToolDef[]) {
  return tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } }));
}

function safeParseArgs(s: unknown): Record<string, unknown> {
  if (typeof s !== "string") return {};
  try { return JSON.parse(s) as Record<string, unknown>; } catch { return {}; }
}

export function createOpenAILLM(apiKey: string, model: string): LLM {
  return {
    async chat({ system, messages, tools, maxTokens }) {
      const body: Record<string, unknown> = {
        model,
        messages: [{ role: "system", content: system }, ...messages],
      };
      if (tools.length) { body.tools = toOpenAITools(tools); body.tool_choice = "auto"; }
      if (isNewGen(model)) body.max_completion_tokens = maxTokens;
      else body.max_tokens = maxTokens;

      const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`OpenAI ${res.status}: ${t.slice(0, 300)}`);
      }
      const json = (await res.json()) as {
        choices?: { finish_reason?: string; message?: { content?: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[];
      };
      const choice = json.choices?.[0] ?? {};
      const msg = choice.message ?? {};
      const rawToolCalls = msg.tool_calls ?? [];
      const toolCalls: ToolCall[] = rawToolCalls.map((tc) => ({ id: tc.id, name: tc.function.name, args: safeParseArgs(tc.function.arguments) }));
      const stopReason: "tool_use" | "end" = (choice.finish_reason === "tool_calls" || toolCalls.length > 0) ? "tool_use" : "end";
      return { stopReason, text: msg.content ?? "", toolCalls, rawAssistant: msg as LLMMessage };
    },
  };
}
