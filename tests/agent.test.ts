import { describe, it, expect } from "vitest";
import { runGuestTurn, chunkText } from "../src/agent";
import type { LLM, LLMResult } from "../src/llm";

function scriptedLLM(seq: LLMResult[]): { llm: LLM } {
  let i = 0;
  const llm: LLM = { chat: async () => seq[i++] };
  return { llm };
}
const collect = () => { const out: string[] = []; return { out, onToken: (t: string) => out.push(t) }; };

describe("runGuestTurn", () => {
  it("calls a tool then streams the final answer", async () => {
    const { llm } = scriptedLLM([
      { stopReason: "tool_use", text: "", toolCalls: [{ id: "1", name: "getErrorCodeSeries", args: { slug: "go-bf" } }], rawAssistant: { role: "assistant", content: null } },
      { stopReason: "end", text: "E-01 ნიშნავს ანთების პრობლემას.", toolCalls: [], rawAssistant: { role: "assistant", content: "E-01 ნიშნავს ანთების პრობლემას." } },
    ]);
    const executed: string[] = [];
    const c = collect();
    const final = await runGuestTurn({
      messages: [{ role: "user", content: "go bf E-01" }], llm,
      tools: [{ name: "getErrorCodeSeries", description: "d", input_schema: { type: "object", properties: {} } }],
      execute: async (n) => { executed.push(n); return { codes: [{ code: "E-01" }] }; }, onToken: c.onToken,
    });
    expect(executed).toEqual(["getErrorCodeSeries"]);
    expect(final).toContain("E-01");
    expect(c.out.join("")).toBe(final);
  });
  it("streams an immediate answer when no tool is needed (off-topic refusal)", async () => {
    const { llm } = scriptedLLM([{ stopReason: "end", text: "აქ მხოლოდ შეცდომის კოდებში დაგეხმარებით.", toolCalls: [], rawAssistant: { role: "assistant", content: "აქ მხოლოდ შეცდომის კოდებში დაგეხმარებით." } }]);
    const c = collect();
    const final = await runGuestTurn({ messages: [{ role: "user", content: "ფასი?" }], llm, tools: [], execute: async () => ({}), onToken: c.onToken });
    expect(final).toContain("შეცდომის კოდებში");
    expect(c.out.join("")).toBe(final);
  });
  it("chunkText reassembles to the original", () => {
    const s = "გამარჯობა ".repeat(20).trim();
    expect(chunkText(s).join("")).toBe(s);
  });
});
