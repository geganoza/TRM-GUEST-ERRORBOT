import "dotenv/config";
import { loadConfig } from "../src/config";
import { createHvacErrorApi } from "../src/error-api";

async function main() {
  const c = loadConfig();
  const api = createHvacErrorApi(c.ERROR_API_BASE_URL);
  const list = await api.getSeriesList();
  console.log(`series: ${list.length} (${list.map((s) => s.slug).join(", ")})`);
  const haier = await api.getSeries("haier-coral");
  const s = haier.codes[0];
  console.log(`haier-coral first: ${s?.code}, action=${s?.recommended_action}, desc=${(s?.description ?? "").slice(0, 40)}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
