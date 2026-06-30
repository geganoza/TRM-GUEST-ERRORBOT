import Anthropic from "@anthropic-ai/sdk";

export interface ToolDef {
  name: string;
  description: string;
  input_schema: { type: "object"; properties: Record<string, unknown>; required?: string[] };
}
export interface ToolCall { id: string; name: string; args: Record<string, unknown>; }
export interface LLMMessage { role: "user" | "assistant"; content: string | unknown[]; }
export interface LLMResult { stopReason: "tool_use" | "end"; text: string; toolCalls: ToolCall[]; rawAssistant: unknown[]; }
export interface LLM {
  chat(args: { system: string; messages: LLMMessage[]; tools: ToolDef[]; maxTokens: number }): Promise<LLMResult>;
}

export function toAnthropicTools(tools: ToolDef[]) {
  return tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }));
}

export function createAnthropicLLM(apiKey: string, model: string): LLM {
  const client = new Anthropic({ apiKey });
  return {
    async chat({ system, messages, tools, maxTokens }) {
      const resp = await client.messages.create({
        model,
        system,
        max_tokens: maxTokens,
        tools: tools.length ? toAnthropicTools(tools) : undefined,
        messages: messages as Anthropic.MessageParam[],
      });
      const text = resp.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
      const toolCalls: ToolCall[] = resp.content
        .filter((b) => b.type === "tool_use")
        .map((b) => { const t = b as { id: string; name: string; input: Record<string, unknown> }; return { id: t.id, name: t.name, args: t.input }; });
      return {
        stopReason: resp.stop_reason === "tool_use" ? "tool_use" : "end",
        text, toolCalls, rawAssistant: resp.content as unknown[],
      };
    },
  };
}
