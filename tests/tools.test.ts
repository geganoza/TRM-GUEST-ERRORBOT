import { describe, it, expect } from "vitest";
import { GUEST_TOOLS, makeExecute } from "../src/tools";

describe("guest tools", () => {
  it("exposes exactly the two error-code tools", () => {
    expect(GUEST_TOOLS.map((t) => t.name).sort()).toEqual(["getErrorCodeSeries", "getProductErrorCodes"]);
    expect(GUEST_TOOLS.find((t) => t.name === "getProductErrorCodes")!.input_schema.required).toContain("productId");
    expect(GUEST_TOOLS.find((t) => t.name === "getErrorCodeSeries")!.input_schema.required ?? []).not.toContain("slug");
  });
  it("makeExecute dispatches to the api client", async () => {
    const calls: string[] = [];
    const api: any = {
      getSeriesList: async () => (calls.push("list"), [{ slug: "go-bf" }]),
      getSeries: async (s: string) => (calls.push("series:" + s), { slug: s, codes: [] }),
      getProductErrorCodes: async (p: string) => (calls.push("product:" + p), []),
    };
    const exec = makeExecute(api);
    await exec("getErrorCodeSeries", {});
    await exec("getErrorCodeSeries", { slug: "go-bf" });
    await exec("getProductErrorCodes", { productId: "p1" });
    expect(calls).toEqual(["list", "series:go-bf", "product:p1"]);
    await expect(exec("nope", {})).rejects.toThrow(/unknown tool/);
  });
});
