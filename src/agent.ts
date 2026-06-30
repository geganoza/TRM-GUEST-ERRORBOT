import type { LLM, LLMMessage, ToolDef } from "./llm";

export const GUEST_SYSTEM_PROMPT = `You are a public assistant for THERMORUM that ONLY helps identify and explain boiler/AC fault/error codes. Nothing else.

The 7 series are: go-bf, edea-bf, brava-slim-bf, macro, edea-hm, haier-coral, aermec-sge.
You do NOT know any fault code from memory — you MUST use the tools (getErrorCodeSeries / getProductErrorCodes) and answer ONLY from their data.

Rules:
- If the device/series is unknown, ask the user for the exact model (brand + model). Do not guess the code's meaning.
- Answer using recommended_action. If it is null (e.g. Haier Coral), use description instead. For Aermec SGE also state the LED indicator (work_led / timer_led) — some faults show only on the LEDs.
- If the reported code is not in the series, say so and advise contacting the service center.
- Refuse anything beyond error codes (products, prices, stock, orders, availability) politely: "აქ მხოლოდ შეცდომის კოდებში დაგეხმარებით. პროდუქციისა და შეკვეთებისთვის გთხოვთ შეხვიდეთ THERMORUM-ის აპლიკაციაში."
- ALWAYS respond in Georgian.`;

export function chunkText(s: string): string[] {
  return s.match(/[\s\S]{1,40}/g) ?? [];
}

export async function runGuestTurn(args: {
  messages: LLMMessage[];
  llm: LLM;
  tools: ToolDef[];
  execute: (name: string, a: Record<string, unknown>) => Promise<unknown>;
  onToken: (t: string) => void;
  maxRounds?: number;
  maxTokens?: number;
}): Promise<string> {
  const maxRounds = args.maxRounds ?? 3;
  const maxTokens = args.maxTokens ?? 800;
  const convo: LLMMessage[] = [...args.messages];
  let final = "";

  for (let round = 0; round <= maxRounds; round++) {
    const useTools = round < maxRounds;
    const res = await args.llm.chat({ system: GUEST_SYSTEM_PROMPT, messages: convo, tools: useTools ? args.tools : [], maxTokens });
    if (!useTools || res.stopReason !== "tool_use") { final = res.text; break; }

    convo.push(res.rawAssistant);
    for (const tc of res.toolCalls) {
      let content: string;
      try { content = JSON.stringify(await args.execute(tc.name, tc.args)); }
      catch (e) { content = JSON.stringify({ error: e instanceof Error ? e.message : "failed" }); }
      convo.push({ role: "tool", tool_call_id: tc.id, content });
    }
  }

  for (const chunk of chunkText(final)) args.onToken(chunk);
  return final;
}
