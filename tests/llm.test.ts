import { describe, it, expect } from "vitest";
import { toAnthropicTools } from "../src/llm";

describe("toAnthropicTools", () => {
  it("passes name/description/input_schema through", () => {
    const out = toAnthropicTools([{ name: "x", description: "d", input_schema: { type: "object", properties: {}, required: [] } }]);
    expect(out).toEqual([{ name: "x", description: "d", input_schema: { type: "object", properties: {}, required: [] } }]);
  });
});
