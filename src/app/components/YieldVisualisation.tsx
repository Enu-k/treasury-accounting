import { Filter, IndianRupee, Landmark, RefreshCw, TrendingUp } from "lucide-react";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildYieldRows,
  calculateFdReturn,
  formatCurrency,
  formatIndianAmountInput,
  formatPercent,
  parseAmount,
  tenureOptions
} from "../data/yieldData";
import {
  fetchFdRatesSyncStatus,
  fetchLatestFdRates,
  hasFdRatesApi,
  type FdRateApiRow,
  type FdRatesSyncStatus
} from "../data/fdRatesApi";
import {
  fetchLatestMfRates,
  fetchMfRatesSyncStatus,
  hasMfRatesApi,
  triggerAllRatesSync,
  type MfRateApiRow,
  type MfRatesSyncStatus
} from "../data/mfRatesApi";
import type { InstrumentType, YieldComparisonRow } from "../types/yield";
import { Sheet } from "./Shared";

const methodologyCopy =
  "Mutual fund estimates are calculated using historical rolling NAV returns for the selected tenure. Conservative, balanced, and aggressive estimates represent the 25th, 50th, and 75th percentile historical outcomes. Actual returns may vary.";

type DecisionRow =
  | { kind: "fd"; row: YieldComparisonRow }
  | { kind: "mf"; row: YieldComparisonRow }
  | { kind: "current"; row: YieldComparisonRow };

type RankingMode = "all" | "min" | "median" | "max";
type SortOrder = "desc" | "asc";

const investmentTypeOrder: InstrumentType[] = ["Money Market Fund", "Liquid Mutual Fund", "Overnight Fund", "Fixed Deposit"];
const assetTypeOptions: InstrumentType[] = [
  "Money Market Fund",
  "Liquid Mutual Fund",
  "Overnight Fund",
  "Fixed Deposit",
  "Current Account"
];

export function YieldVisualisation() {
  const [amountInput, setAmountInput] = useState("50,00,000");
  const [selectedTenure, setSelectedTenure] = useState(30);
  const [customTenure, setCustomTenure] = useState("120");
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<InstrumentType[]>(assetTypeOptions);
  const [selectedProviders, setSelectedProviders] = useState<string[] | null>(null);
  const [rankingMode, setRankingMode] = useState<RankingMode>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [activeRow, setActiveRow] = useState<YieldComparisonRow | null>(null);
  const [liveFdRows, setLiveFdRows] = useState<YieldComparisonRow[]>([]);
  const [liveMfRows, setLiveMfRows] = useState<YieldComparisonRow[]>([]);
  const [syncStatus, setSyncStatus] = useState<FdRatesSyncStatus | null>(null);
  const [mfSyncStatus, setMfSyncStatus] = useState<MfRatesSyncStatus | null>(null);
  const [fdApiError, setFdApiError] = useState<string | null>(hasFdRatesApi() ? null : "FD rates API not configured");
  const [mfApiError, setMfApiError] = useState<string | null>(hasMfRatesApi() ? null : "MF rates API not configured");
  const [syncing, setSyncing] = useState(false);
  const topConfigRef = useRef<HTMLDivElement>(null);
  const previousProviderOptionsRef = useRef<string[]>([]);
  const [stickyOffset, setStickyOffset] = useState(104);

  const principal = parseAmount(amountInput);
  const tenureDays = selectedTenure === -1 ? Math.max(1, Number(customTenure) || 1) : selectedTenure;
  const rows = useMemo(() => buildYieldRows(principal, tenureDays), [principal, tenureDays]);

  const mockFdRows = rows.filter((row) => row.instrument === "Fixed Deposit");
  const fdRows = liveFdRows.length ? liveFdRows : mockFdRows;
  const mockMfRows = rows.filter((row) => isMutualFundInstrument(row.instrument));
  const mfRows = liveMfRows.length ? liveMfRows : mockMfRows;
  const currentRow = rows.find((row) => row.instrument === "Current Account");
  const providerOptions = useMemo(() => {
    return Array.from(new Set([...mfRows, ...fdRows, ...(currentRow ? [currentRow] : [])].map((row) => row.provider))).sort();
  }, [mfRows, fdRows, currentRow]);
  const providerOptionsKey = providerOptions.join("\u0000");
  const effectiveSelectedProviders = selectedProviders ?? providerOptions;

  const deploymentRows = getListingRows(rankingMode, sortOrder, { mfRows, fdRows, currentRow });
  const filteredDeploymentRows = deploymentRows.filter(({ kind, row }) => {
    const matchesAssetType = selectedAssetTypes.includes(row.instrument);
    const matchesProvider = effectiveSelectedProviders.includes(row.provider);
    return matchesAssetType && matchesProvider;
  });

  useEffect(() => {
    const element = topConfigRef.current;
    if (!element) return;

    const updateOffset = () => {
      setStickyOffset(Math.ceil(element.getBoundingClientRect().height));
    };
    updateOffset();

    const observer = new ResizeObserver(updateOffset);
    observer.observe(element);
    window.addEventListener("resize", updateOffset);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateOffset);
    };
  }, []);

  useEffect(() => {
    setSelectedProviders((current) => {
      const previousOptions = previousProviderOptionsRef.current;
      previousProviderOptionsRef.current = providerOptions;
      if (current === null) return null;
      const hadEveryPreviousOption =
        previousOptions.length > 0 &&
        current.length === previousOptions.length &&
        previousOptions.every((option) => current.includes(option));
      const nextSelectedProviders = hadEveryPreviousOption ? providerOptions : current.filter((provider) => providerOptions.includes(provider));
      return arraysEqual(current, nextSelectedProviders) ? current : nextSelectedProviders;
    });
  }, [providerOptionsKey]);

  const loadLiveFdRows = useCallback(async () => {
    if (!hasFdRatesApi()) return;
    const response = await fetchLatestFdRates(principal, tenureDays);
    setSyncStatus(response.sync);
    setLiveFdRows(response.rows.map((row) => mapApiFdRow(row, principal, tenureDays)));
    setFdApiError(null);
  }, [principal, tenureDays]);

  const loadLiveMfRows = useCallback(async () => {
    if (!hasMfRatesApi()) return;
    const response = await fetchLatestMfRates(principal, tenureDays);
    setMfSyncStatus(response.sync);
    setLiveMfRows(response.rows.map((row) => mapApiMfRow(row, principal, tenureDays)));
    setMfApiError(null);
  }, [principal, tenureDays]);

  useEffect(() => {
    let cancelled = false;
    if (!hasFdRatesApi()) return;
    fetchLatestFdRates(principal, tenureDays)
      .then((response) => {
        if (cancelled) return;
        setSyncStatus(response.sync);
        setLiveFdRows(response.rows.map((row) => mapApiFdRow(row, principal, tenureDays)));
        setFdApiError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLiveFdRows([]);
        setFdApiError(error instanceof Error ? error.message : "FD rates API unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [principal, tenureDays]);

  useEffect(() => {
    let cancelled = false;
    if (!hasMfRatesApi()) return;
    fetchLatestMfRates(principal, tenureDays)
      .then((response) => {
        if (cancelled) return;
        setMfSyncStatus(response.sync);
        setLiveMfRows(response.rows.map((row) => mapApiMfRow(row, principal, tenureDays)));
        setMfApiError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLiveMfRows([]);
        setMfApiError(error instanceof Error ? error.message : "MF rates API unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [principal, tenureDays]);

  const handleSyncFdRates = async () => {
    if (!hasFdRatesApi() && !hasMfRatesApi()) {
      setFdApiError("Set VITE_API_BASE_URL to enable live sync");
      setMfApiError("Set VITE_API_BASE_URL to enable live sync");
      return;
    }
    setSyncing(true);
    try {
      const startStatus = await triggerAllRatesSync();
      if (startStatus.mf) setMfSyncStatus(startStatus.mf);
      let fdStatus = await fetchFdRatesSyncStatus();
      let mfStatus = await fetchMfRatesSyncStatus();
      setSyncStatus(fdStatus);
      setMfSyncStatus(mfStatus);
      for (let attempt = 0; (fdStatus.status === "running" || mfStatus.status === "running") && attempt < 60; attempt += 1) {
        await wait(2000);
        fdStatus = await fetchFdRatesSyncStatus();
        mfStatus = await fetchMfRatesSyncStatus();
        setSyncStatus(fdStatus);
        setMfSyncStatus(mfStatus);
      }
      await loadLiveFdRows();
      await loadLiveMfRows();
      setFdApiError(null);
      setMfApiError(null);
    } catch (error) {
      setFdApiError(error instanceof Error ? error.message : "FD rates sync failed");
      setMfApiError(error instanceof Error ? error.message : "MF rates sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="yield-page" style={{ "--yield-sticky-offset": `${stickyOffset}px` } as CSSProperties}>
      <div className="yield-top-config" ref={topConfigRef}>
        <div className="yield-top-copy">
          <h2>Compare returns across FDs, liquid funds, and other treasury instruments</h2>
          <span>{syncStatusLabel(syncStatus, fdApiError)} · {mfSyncStatusLabel(mfSyncStatus, mfApiError)}</span>
        </div>
        <label>
          <span>Deployable amount</span>
          <div className="yield-input-icon">
            <IndianRupee size={18} />
            <input
              value={amountInput}
              onChange={(event) => setAmountInput(formatIndianAmountInput(parseAmount(event.target.value)))}
              aria-label="Deployable amount"
            />
          </div>
        </label>
        <label>
          <span>Selected tenure</span>
          <select value={selectedTenure} onChange={(event) => setSelectedTenure(Number(event.target.value))}>
            {tenureOptions.map((option) => (
              <option key={option.days} value={option.days}>{option.label}</option>
            ))}
            <option value={-1}>Custom tenure</option>
          </select>
        </label>
        {selectedTenure === -1 && (
          <label>
            <span>Custom days</span>
            <input value={customTenure} onChange={(event) => setCustomTenure(event.target.value.replace(/\D/g, ""))} />
          </label>
        )}
        <button className="figma-primary" onClick={handleSyncFdRates} disabled={syncing}>
          <RefreshCw size={18} className={syncing || syncStatus?.status === "running" || mfSyncStatus?.status === "running" ? "spin" : ""} /> Sync rates
        </button>
      </div>

      <section className="figma-section">
        <div className="section-title">
          <h2>Deployment comparison</h2>
          <span>All funds and FD rates sorted by annualised return for the selected tenure</span>
        </div>
        <div className="accounting-toolbar yield-filter-toolbar">
          <Filter size={18} />
          <MultiSelectFilter
            label="Asset type"
            options={assetTypeOptions}
            selected={selectedAssetTypes}
            onChange={(values) => setSelectedAssetTypes(values)}
          />
          <MultiSelectFilter
            label="AMC/Bank"
            options={providerOptions}
            selected={effectiveSelectedProviders}
            onChange={(values) => setSelectedProviders(values)}
          />
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)}>
            <option value="desc">Descending annualised</option>
            <option value="asc">Ascending annualised</option>
          </select>
          <div className="yield-toggle">
            <span>Return set</span>
            <button className={rankingMode === "all" ? "active" : ""} onClick={() => setRankingMode("all")}>All</button>
            <button className={rankingMode === "min" ? "active" : ""} onClick={() => setRankingMode("min")}>Min</button>
            <button className={rankingMode === "median" ? "active" : ""} onClick={() => setRankingMode("median")}>Median</button>
            <button className={rankingMode === "max" ? "active" : ""} onClick={() => setRankingMode("max")}>Max</button>
          </div>
        </div>
        <div className="table-wrap yield-table-wrap">
          <table className="figma-table yield-table">
            <thead>
              <tr>
                <th>Option</th>
                <th>Asset Type</th>
                <th className="align-right">Annualised Return (last {tenureDays} days)</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeploymentRows.length ? (
                filteredDeploymentRows.map(({ kind, row }) => (
                  <DeploymentTableRow
                    key={`${kind}-table-${row.id}`}
                    kind={kind}
                    row={row}
                    onClick={() => setActiveRow(row)}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="yield-empty-row">No options match the selected filters</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="yield-methodology">
          Mutual fund rows use {liveMfRows.length ? "AMFI NAV history" : "mock fallback NAV history"}. FD rows use {liveFdRows.length ? "live scraper output" : "mock fallback rates"}.
        </p>
      </section>

      {activeRow && <YieldDetailSheet row={activeRow} onClose={() => setActiveRow(null)} />}
    </div>
  );
}

function DeploymentTableRow({
  kind,
  row,
  onClick
}: {
  kind: DecisionRow["kind"];
  row: YieldComparisonRow;
  onClick: () => void;
}) {
  const variant = kind === "fd" ? "fd" : kind === "current" ? "idle" : "mf";
  const annualisedLabel = getAnnualisedReturnLabel(row);
  const muted = !row.available;

  return (
    <tr onClick={onClick} className={muted ? "yield-row-muted" : ""}>
      <td>
        <div className="fund-cell">
          <YieldIcon variant={variant} />
          <span>{getOptionLabel(kind, row)}</span>
        </div>
      </td>
      <td><span className="yield-asset-type">{row.instrument}</span></td>
      <td className="align-right"><strong>{annualisedLabel}</strong></td>
    </tr>
  );
}

function MultiSelectFilter<T extends string>({
  label,
  options,
  selected,
  onChange
}: {
  label: string;
  options: T[];
  selected: T[];
  onChange: (selected: T[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const allSelected = options.length > 0 && selected.length === options.length && options.every((option) => selected.includes(option));
  const buttonLabel = selected.length === 0 ? `${label}: None` : allSelected ? `${label}: All` : `${label}: ${selected.length} selected`;

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const toggleOption = (option: T) => {
    if (selected.includes(option)) {
      onChange(selected.filter((selectedOption) => selectedOption !== option));
      return;
    }
    onChange([...selected, option]);
  };

  return (
    <div className="yield-multi-select" ref={menuRef}>
      <button type="button" className="yield-multi-trigger" onClick={() => setOpen((current) => !current)}>
        {buttonLabel}
      </button>
      {open && (
        <div className="yield-multi-menu">
          <div className="yield-multi-actions">
            <button type="button" onClick={() => onChange(options)}>All</button>
            <button type="button" onClick={() => onChange([])}>Clear</button>
          </div>
          <div className="yield-multi-options">
            {options.map((option) => (
              <label key={option}>
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleOption(option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getListingRows(
  mode: RankingMode,
  sortOrder: SortOrder,
  {
    mfRows,
    fdRows,
    currentRow
  }: { mfRows: YieldComparisonRow[]; fdRows: YieldComparisonRow[]; currentRow?: YieldComparisonRow }
): DecisionRow[] {
  const eligibleMfRows = mfRows.filter((row) => row.available);
  const eligibleFdRows = fdRows.filter((row) => row.available);
  const current = currentRow ? [{ kind: "current", row: currentRow } satisfies DecisionRow] : [];

  if (mode === "all") {
    return [
      ...eligibleMfRows.map((row): DecisionRow => ({ kind: "mf", row })),
      ...eligibleFdRows.map((row): DecisionRow => ({ kind: "fd", row }))
    ].sort((a, b) => sortByAnnualised(a.row, b.row, sortOrder)).concat(current);
  }

  const representativeRows = investmentTypeOrder.flatMap((instrument): DecisionRow[] => {
    const sourceRows = instrument === "Fixed Deposit" ? eligibleFdRows : eligibleMfRows.filter((row) => row.instrument === instrument);
    const row = pickRepresentativeRow(sourceRows, mode);
    if (!row) return [];
    return [{ kind: instrument === "Fixed Deposit" ? "fd" : "mf", row }];
  });

  return representativeRows.sort((a, b) => sortByAnnualised(a.row, b.row, sortOrder)).concat(current);
}

function pickRepresentativeRow(rows: YieldComparisonRow[], mode: Exclude<RankingMode, "all">) {
  const sortedRows = [...rows].sort((a, b) => getRankingAnnualisedReturn(a) - getRankingAnnualisedReturn(b));
  if (!sortedRows.length) return undefined;
  if (mode === "min") return sortedRows[0];
  if (mode === "max") return sortedRows[sortedRows.length - 1];
  return sortedRows[Math.floor(sortedRows.length / 2)];
}

function sortByAnnualisedDesc(a: YieldComparisonRow, b: YieldComparisonRow) {
  return sortByAnnualised(a, b, "desc");
}

function sortByAnnualised(a: YieldComparisonRow, b: YieldComparisonRow, sortOrder: SortOrder) {
  const delta = getRankingAnnualisedReturn(b) - getRankingAnnualisedReturn(a);
  return sortOrder === "desc" ? delta : -delta;
}

function getRankingAnnualisedReturn(row: YieldComparisonRow) {
  return row.annualisedReturn ?? 0;
}

function mapApiFdRow(row: FdRateApiRow, principal: number, tenureDays: number): YieldComparisonRow {
  const annualRate = row.rate_pa / 100;
  const estimatedReturn = calculateFdReturn(principal, annualRate, tenureDays);
  const periodReturn = annualRate * tenureDays / 365;

  return {
    id: `live-fd-${row.bank_id}`,
    instrument: "Fixed Deposit",
    name: `${row.bank_name} FD`,
    provider: row.bank_name,
    returnType: "Fixed",
    selectedTenureDays: tenureDays,
    periodReturnLabel: formatPercent(periodReturn),
    estimatedReturnLabel: row.estimated_return_label || formatCurrency(estimatedReturn),
    annualisedReturnLabel: row.annualised_return_label || `${formatPercent(annualRate)} p.a.`,
    liquidity: "Premature withdrawal penalty applicable",
    minimumInvestment: 0,
    available: true,
    dataSufficient: true,
    lastUpdated: formatTimestamp(row.fetched_at) ?? row.last_sync_status ?? "Live scraper output",
    periodReturn,
    estimatedReturn: row.estimated_return ?? estimatedReturn,
    annualisedReturn: annualRate,
    sourceUrl: row.source_url,
    fetchedAt: row.fetched_at,
    effectiveFrom: row.effective_from,
    amountSlab: row.amount_slab,
    tenureLabel: row.tenure_label,
    lastSyncStatus: row.last_sync_status,
    isLive: true
  };
}

function mapApiMfRow(row: MfRateApiRow, principal: number, tenureDays: number): YieldComparisonRow {
  const estimatedReturn = row.estimated_return;
  return {
    id: `amfi-mf-${row.scheme_code}`,
    instrument: row.instrument,
    name: row.scheme_name,
    provider: row.amc,
    returnType: "Indicative Range",
    selectedTenureDays: tenureDays,
    periodReturnLabel: row.period_return_range_label ?? row.period_return_label ?? "Insufficient NAV history",
    estimatedReturnLabel: row.estimated_return_range_label ?? row.estimated_return_label,
    annualisedReturnLabel: row.annualised_return_label,
    liquidity: row.settlement,
    minimumInvestment: row.minimum_investment,
    available: row.data_sufficient && principal >= row.minimum_investment,
    dataSufficient: row.data_sufficient,
    dataMessage: row.data_message,
    lastUpdated: row.nav_date ?? row.last_sync_status ?? "AMFI NAV",
    periodReturn: row.period_return,
    estimatedReturn,
    annualisedReturn: row.annualised_return,
    scenarios: row.scenarios,
    estimatedScenarios: row.estimated_scenarios,
    annualisedScenarios: row.annualised_scenarios,
    sourceUrl: row.source_url,
    schemeCode: row.scheme_code,
    navDate: row.nav_date,
    navValue: row.nav_value,
    dataSource: "AMFI",
    historyPoints: row.history_points,
    lastSyncStatus: row.last_sync_status,
    isLive: true
  };
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function arraysEqual<T>(left: T[], right: T[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function syncStatusLabel(status: FdRatesSyncStatus | null, error: string | null) {
  if (status?.status === "running") return "Syncing FD rates";
  if (status?.status === "partial_success") return `Partial success · ${status.row_count} rows`;
  if (status?.status === "failed") return "FD sync failed";
  if (status?.finished_at) return `Last synced ${formatTimestamp(status.finished_at)}`;
  if (error) return "Using mock FD rates";
  return "Live FD sync ready";
}

function mfSyncStatusLabel(status: MfRatesSyncStatus | null, error: string | null) {
  if (status?.status === "running") return "Syncing AMFI NAVs";
  if (status?.status === "failed") return "AMFI sync failed";
  if (status?.row_count) return `AMFI ${status.row_count} schemes`;
  if (status?.finished_at) return `AMFI synced ${formatTimestamp(status.finished_at)}`;
  if (error) return "Using mock MF data";
  return "AMFI sync ready";
}

function formatTimestamp(value?: string | null) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function isMutualFundInstrument(instrument: InstrumentType) {
  return instrument === "Money Market Fund" || instrument === "Liquid Mutual Fund" || instrument === "Overnight Fund";
}

function getOptionLabel(kind: DecisionRow["kind"], row: YieldComparisonRow) {
  if (kind === "fd") return `${row.provider} FD`;
  if (kind === "current") return "Current Account";
  return row.name;
}

function getAnnualisedReturnLabel(row: YieldComparisonRow) {
  if (isMutualFundInstrument(row.instrument) && row.annualisedReturn !== undefined) {
    return `${formatPercent(row.annualisedReturn)} p.a.`;
  }
  if (row.instrument === "Current Account") return row.annualisedReturnLabel;
  return row.annualisedReturnLabel;
}

function YieldIcon({ variant }: { variant: "fd" | "mf" | "idle" }) {
  if (variant === "fd") {
    return <span className="fund-avatar yield-avatar"><Landmark size={19} /></span>;
  }
  if (variant === "idle") {
    return <span className="fund-avatar yield-avatar idle"><IndianRupee size={19} /></span>;
  }
  return <span className="fund-avatar yield-avatar mf"><TrendingUp size={19} /></span>;
}

function YieldDetailSheet({ row, onClose }: { row: YieldComparisonRow; onClose: () => void }) {
  const variant = row.instrument === "Fixed Deposit" ? "fd" : row.instrument === "Current Account" ? "idle" : "mf";

  return (
    <Sheet width={650} onClose={onClose}>
      <div className="sheet-header">
        <div className="sheet-fund-title">
          <YieldIcon variant={variant} />
          <div>
            <h2>{row.name}</h2>
            <span>{row.provider} · {row.instrument}</span>
          </div>
        </div>
      </div>
      <div className="sheet-body">
        <div className="amount-hero">
          <span>Estimated return for selected tenure</span>
          <strong>{row.estimatedReturnLabel}</strong>
        </div>
        <div className="detail-grid">
          <Detail label="Return Type" value={row.returnType} />
          <Detail label="Selected Tenure" value={`${row.selectedTenureDays} days`} />
          <Detail label="Period Return" value={row.periodReturnLabel} />
          <Detail label="Annualised Return" value={row.annualisedReturnLabel} />
          <Detail label="Liquidity" value={row.liquidity} />
          <Detail label="Last Updated" value={row.lastUpdated} />
          {row.schemeCode && <Detail label="AMFI Scheme Code" value={row.schemeCode} />}
          {row.navDate && <Detail label="Latest NAV Date" value={row.navDate} />}
          {row.navValue !== undefined && <Detail label="Latest NAV" value={`₹${row.navValue.toFixed(4)}`} />}
          {row.historyPoints !== undefined && <Detail label="History Coverage" value={`${row.historyPoints} NAV points`} />}
          {row.tenureLabel && <Detail label="Scraped Tenure" value={row.tenureLabel} />}
          {row.amountSlab && <Detail label="Amount Slab" value={row.amountSlab} />}
          {row.effectiveFrom && <Detail label="Effective From" value={row.effectiveFrom} />}
          {row.lastSyncStatus && <Detail label="Sync Status" value={row.lastSyncStatus.replaceAll("_", " ")} />}
        </div>
        {row.sourceUrl && (
          <a className="yield-source-link" href={row.sourceUrl} target="_blank" rel="noreferrer">
            View scraped source
          </a>
        )}
        {row.scenarios && row.estimatedScenarios && <ScenarioTable scenarios={row.scenarios} estimatedScenarios={row.estimatedScenarios} />}
        <p className="yield-methodology sheet-copy">
          {row.returnType === "Indicative Range"
            ? methodologyCopy
            : "Fixed deposits use the selected amount, quoted annual FD rate, and selected tenure. Current account idle cash uses the available account interest rate, defaulting to 0%."}
        </p>
        <div className="sheet-actions">
          <button className="figma-secondary" onClick={onClose}>Close</button>
          <button className="figma-primary" disabled>Proceed later</button>
        </div>
      </div>
    </Sheet>
  );
}

function ScenarioTable({ scenarios, estimatedScenarios }: Pick<YieldComparisonRow, "scenarios" | "estimatedScenarios">) {
  if (!scenarios || !estimatedScenarios) return null;

  return (
    <div className="voucher-table-wrap">
      <table className="voucher-table">
        <thead>
          <tr>
            <th>Scenario</th>
            <th>Period Return</th>
            <th className="align-right">Estimated Return</th>
          </tr>
        </thead>
        <tbody>
          <ScenarioRow label="Conservative estimate" value={scenarios.conservative} amount={estimatedScenarios.conservative} />
          <ScenarioRow label="Balanced estimate" value={scenarios.balanced} amount={estimatedScenarios.balanced} />
          <ScenarioRow label="Aggressive estimate" value={scenarios.aggressive} amount={estimatedScenarios.aggressive} />
        </tbody>
      </table>
    </div>
  );
}

function ScenarioRow({ label, value, amount }: { label: string; value: number; amount: number }) {
  return (
    <tr>
      <td>{label}</td>
      <td>{(value * 100).toFixed(2)}%</td>
      <td className="align-right">{formatCurrency(amount)}</td>
    </tr>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
