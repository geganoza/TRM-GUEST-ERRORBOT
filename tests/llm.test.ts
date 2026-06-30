import { describe, it, expect } from "vitest";
import { toOpenAITools } from "../src/llm";

describe("toOpenAITools", () => {
  it("maps a ToolDef to the OpenAI function shape", () => {
    const out = toOpenAITools([{ name: "x", description: "d", input_schema: { type: "object", properties: {}, required: [] } }]);
    expect(out).toEqual([{ type: "function", function: { name: "x", description: "d", parameters: { type: "object", properties: {}, required: [] } } }]);
  });
});
