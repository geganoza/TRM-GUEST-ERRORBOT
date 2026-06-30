import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(8080),
  LLM_API_KEY: z.string().min(1),
  LLM_MODEL: z.string().default("gpt-4o"),
  ERROR_API_BASE_URL: z.string().url().default("https://trm-app-back-production.up.railway.app"),
  ALLOWED_ORIGINS: z.string().default(""),
  RATE_MAX: z.coerce.number().default(20),
  RATE_WINDOW_MS: z.coerce.number().default(5 * 60 * 1000),
});

export type Config = z.infer<typeof EnvSchema>;

export function loadConfig(raw: Record<string, string | undefined> = process.env): Config {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`Invalid env: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
  return parsed.data;
}

export function allowedOrigins(c: Config): string[] {
  return c.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
}
