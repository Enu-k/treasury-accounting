export interface MfRateApiRow {
  scheme_code: string;
  scheme_name: string;
  amc: string;
  instrument: "Liquid Mutual Fund" | "Overnight Fund" | "Money Market Fund";
  nav_date?: string;
  nav_value?: number;
  settlement: "Same-day" | "T+1";
  minimum_investment: number;
  period_return?: number;
  period_return_label?: string;
  period_return_range_label?: string;
  annualised_return?: number;
  annualised_return_label: string;
  estimated_return?: number;
  estimated_return_label: string;
  estimated_return_range_label?: string;
  scenarios?: { conservative: number; balanced: number; aggressive: number };
  estimated_scenarios?: { conservative: number; balanced: number; aggressive: number };
  annualised_scenarios?: { conservative: number; balanced: number; aggressive: number };
  history_points?: number;
  source_url?: string;
  last_sync_status?: string;
  data_sufficient: boolean;
  data_message?: string;
}

export interface MfRatesSyncStatus {
  status: "idle" | "running" | "success" | "partial_success" | "failed";
  started_at?: string | null;
  finished_at?: string | null;
  success_count: number;
  failure_count: number;
  row_count: number;
  message: string;
  source_url?: string;
}

export interface LatestMfRatesResponse {
  rows: MfRateApiRow[];
  sync: MfRatesSyncStatus;
}

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const apiBaseUrl = (configuredApiBaseUrl || (import.meta.env.DEV ? "http://127.0.0.1:8000" : undefined))?.replace(/\/$/, "");

export function hasMfRatesApi() {
  return Boolean(apiBaseUrl);
}

export async function fetchLatestMfRates(amountInr: number, tenureDays: number) {
  const baseUrl = requireApiBaseUrl();
  const url = new URL(`${baseUrl}/api/mf-rates/latest`);
  url.searchParams.set("amount_inr", String(Math.max(0, Math.round(amountInr))));
  url.searchParams.set("tenure_days", String(Math.max(1, Math.round(tenureDays))));
  return fetchJson<LatestMfRatesResponse>(url.toString());
}

export async function fetchMfRatesSyncStatus() {
  return fetchJson<MfRatesSyncStatus>(`${requireApiBaseUrl()}/api/mf-rates/sync/status`);
}

export async function triggerAllRatesSync() {
  return fetchJson<{ fd: unknown; mf: MfRatesSyncStatus }>(`${requireApiBaseUrl()}/api/rates/sync`, { method: "POST" });
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  if (!response.ok) {
    throw new Error(`MF rates API returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function requireApiBaseUrl() {
  if (!apiBaseUrl) throw new Error("VITE_API_BASE_URL is not configured");
  return apiBaseUrl;
}
