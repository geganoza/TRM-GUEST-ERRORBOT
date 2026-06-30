const DEFAULT_TIMEOUT_MS = 6000;

interface Envelope<T> { success: boolean; data: T; timestamp?: string; }

export interface ErrorCodeIndicator { work_led?: string; timer_led?: string; }
export interface ErrorCodeEntry {
  id: string; series_id: string; code: string;
  title: string | null; description: string | null;
  recommended_action: string | null; indicator: ErrorCodeIndicator | null; sort_order: number;
}
export interface ErrorCodeSeriesSummary {
  id: string; slug: string; name: string; product_type: string;
  brand_id: string | null; description: string | null; sort_order: number; code_count: number;
}
export interface ErrorCodeSeriesDetail {
  id: string; slug: string; name: string; product_type: string;
  brand_id: string | null; description: string | null; sort_order: number; codes: ErrorCodeEntry[];
}
export interface HvacErrorApi {
  getSeriesList(): Promise<ErrorCodeSeriesSummary[]>;
  getSeries(slug: string): Promise<ErrorCodeSeriesDetail>;
  getProductErrorCodes(productId: string): Promise<ErrorCodeSeriesDetail[]>;
}

export function createHvacErrorApi(
  baseUrl: string, fetchImpl: typeof fetch = fetch, timeoutMs: number = DEFAULT_TIMEOUT_MS,
): HvacErrorApi {
  async function get<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`${baseUrl}${path}`, { signal: controller.signal });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`error-codes API ${res.status} on ${path}: ${body.slice(0, 200)}`);
      }
      const json = (await res.json()) as Envelope<T>;
      return json.data;
    } finally {
      clearTimeout(timer);
    }
  }
  return {
    getSeriesList: () => get<ErrorCodeSeriesSummary[]>(`/api/error-codes/series`),
    getSeries: (slug) => get<ErrorCodeSeriesDetail>(`/api/error-codes/series/${encodeURIComponent(slug)}`),
    getProductErrorCodes: (productId) => get<ErrorCodeSeriesDetail[]>(`/api/error-codes/products/${encodeURIComponent(productId)}`),
  };
}
