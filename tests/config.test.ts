import { describe, it, expect } from "vitest";
import { loadConfig, allowedOrigins } from "../src/config";

describe("config", () => {
  it("throws when LLM_API_KEY is missing", () => {
    expect(() => loadConfig({})).toThrow(/LLM_API_KEY/);
  });
  it("applies defaults and parses origins", () => {
    const c = loadConfig({ LLM_API_KEY: "k", ALLOWED_ORIGINS: "https://a.app, https://b.app" });
    expect(c.PORT).toBe(8080);
    expect(c.LLM_MODEL).toBe("claude-sonnet-4-6");
    expect(c.ERROR_API_BASE_URL).toBe("https://trm-app-back-production.up.railway.app");
    expect(allowedOrigins(c)).toEqual(["https://a.app", "https://b.app"]);
  });
});
