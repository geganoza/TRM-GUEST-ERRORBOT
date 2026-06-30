import { describe, it, expect } from "vitest";
import { createHvacErrorApi } from "../src/error-api";

function fakeFetch(routes: Record<string, unknown>) {
  const calls: string[] = [];
  const impl = (async (url: string) => {
    calls.push(url);
    if (!(url in routes)) return { ok: false, status: 404, text: async () => "not found" } as unknown as Response;
    return { ok: true, status: 200, json: async () => ({ success: true, data: routes[url], timestamp: "t" }) } as unknown as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}
const BASE = "https://api.test";

describe("createHvacErrorApi", () => {
  it("getSeriesList unwraps the envelope and hits the list URL", async () => {
    const f = fakeFetch({ [`${BASE}/api/error-codes/series`]: [{ slug: "go-bf" }] });
    const api = createHvacErrorApi(BASE, f.impl);
    const list = await api.getSeriesList();
    expect(list[0].slug).toBe("go-bf");
    expect(f.calls).toEqual([`${BASE}/api/error-codes/series`]);
  });
  it("getSeries returns codes", async () => {
    const f = fakeFetch({ [`${BASE}/api/error-codes/series/go-bf`]: { slug: "go-bf", codes: [{ code: "E-01", recommended_action: "a" }] } });
    const api = createHvacErrorApi(BASE, f.impl);
    const s = await api.getSeries("go-bf");
    expect(s.codes[0].code).toBe("E-01");
  });
  it("throws on non-ok", async () => {
    const f = fakeFetch({});
    const api = createHvacErrorApi(BASE, f.impl);
    await expect(api.getSeries("nope")).rejects.toThrow(/error-codes API 404/);
  });
});
