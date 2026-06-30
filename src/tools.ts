import type { ToolDef } from "./llm";
import type { HvacErrorApi } from "./error-api";

export const GUEST_TOOLS: ToolDef[] = [
  {
    name: "getErrorCodeSeries",
    description:
      "Look up boiler/AC fault-code reference. Call with NO slug to list the available series (to ask which device). " +
      "Call WITH a slug for that series' full code list. Slugs: go-bf, edea-bf, brava-slim-bf, macro, edea-hm, haier-coral, aermec-sge.",
    input_schema: { type: "object", properties: { slug: { type: "string", description: "Series slug. Omit to list all." } } },
  },
  {
    name: "getProductErrorCodes",
    description: "Get the fault-code series linked to a specific product UUID, if the user references one.",
    input_schema: { type: "object", properties: { productId: { type: "string", description: "Product UUID" } }, required: ["productId"] },
  },
];

export function makeExecute(api: HvacErrorApi) {
  return async (name: string, args: Record<string, unknown>): Promise<unknown> => {
    if (name === "getErrorCodeSeries") {
      const slug = args.slug as string | undefined;
      return slug ? api.getSeries(slug) : api.getSeriesList();
    }
    if (name === "getProductErrorCodes") return api.getProductErrorCodes(args.productId as string);
    throw new Error(`unknown tool ${name}`);
  };
}
