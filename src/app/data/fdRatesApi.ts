export interface FdRateApiRow {
  bank_id: string;
  bank_name: string;
  rate_pa: number;
  annualised_return_label: string;
  estimated_return: number;
  estimated_return_label: string;
  tenure_label?: string;
  min_days?: number;
  max_days?: number;
  amount_slab?: string;
  effective_from?: string;
  fetched_at?: string;
  source_url?: string;
  last_sync_status?: string;
}

export interface FdRatesSyncStatus {
  status: "idle" | "running" | "success" | "partial_success" | "failed";
  started_at?: string | null;
  finished_at?: string | null;
  success_count: number;
  failure_count: number;
  row_count: number;
  message: string;
  banks: string[];
}

export interface LatestFdRatesResponse {
  rows: FdRateApiRow[];
  sync: FdRatesSyncStatus;
}

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const apiBaseUrl = (configuredApiBaseUrl || (import.meta.env.DEV ? "http://127.0.0.1:8000" : undefined))?.replace(/\/$/, "");

export function hasFdRatesApi() {
  return Boolean(apiBaseUrl);
}

export async function fetchLatestFdRates(amountInr: number, tenureDays: number) {
  const baseUrl = requireApiBaseUrl();
  const url = new URL(`${baseUrl}/api/fd-rates/latest`);
  url.searchParams.set("amount_inr", String(Math.max(0, Math.round(amountInr))));
  url.searchParams.set("tenure_days", String(Math.max(1, Math.round(tenureDays))));
  return fetchJson<LatestFdRatesResponse>(url.toString());
}

export async function fetchFdRatesSyncStatus() {
  return fetchJson<FdRatesSyncStatus>(`${requireApiBaseUrl()}/api/fd-rates/sync/status`);
}

export async function triggerFdRatesSync() {
  return fetchJson<FdRatesSyncStatus>(`${requireApiBaseUrl()}/api/fd-rates/sync`, { method: "POST" });
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  if (!response.ok) {
    throw new Error(`FD rates API returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function requireApiBaseUrl() {
  if (!apiBaseUrl) throw new Error("VITE_API_BASE_URL is not configured");
  return apiBaseUrl;
}
