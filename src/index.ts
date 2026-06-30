import "dotenv/config";
import { loadConfig } from "./config";
import { createAnthropicLLM } from "./llm";
import { createHvacErrorApi } from "./error-api";
import { createApp } from "./app";

const config = loadConfig();
const llm = createAnthropicLLM(config.LLM_API_KEY, config.LLM_MODEL);
const api = createHvacErrorApi(config.ERROR_API_BASE_URL);
createApp({ config, llm, api }).listen(config.PORT, () => {
  console.log(`trm-guest-errorbot listening on :${config.PORT}`);
});
