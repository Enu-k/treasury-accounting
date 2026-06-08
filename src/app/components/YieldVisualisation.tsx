import { Filter, IndianRupee, Landmark, LineChart, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  buildMfCategoryRows,
  buildYieldRows,
  formatCurrency,
  formatIndianAmountInput,
  parseAmount,
  tenureOptions
} from "../data/yieldData";
import type { YieldCategoryRow, YieldComparisonRow } from "../types/yield";
import { Metric, PagePanel, Sheet } from "./Shared";

const methodologyCopy =
  "Mutual fund estimates are calculated using historical rolling NAV returns for the selected tenure. Conservative, balanced, and aggressive estimates represent the 25th, 50th, and 75th percentile historical outcomes. Actual returns may vary.";

type DecisionRow =
  | { kind: "fd"; row: YieldComparisonRow }
  | { kind: "mf-category"; row: YieldCategoryRow }
  | { kind: "current"; row: YieldComparisonRow };

type AnnualisedMode = "median" | "mean";

export function YieldVisualisation() {
  const [amountInput, setAmountInput] = useState("50,00,000");
  const [selectedTenure, setSelectedTenure] = useState(30);
  const [customTenure, setCustomTenure] = useState("120");
  const [instrumentFilter, setInstrumentFilter] = useState("All");
  const [providerFilter, setProviderFilter] = useState("All");
  const [annualisedMode, setAnnualisedMode] = useState<AnnualisedMode>("median");
  const [activeRow, setActiveRow] = useState<YieldComparisonRow | null>(null);
  const [activeCategory, setActiveCategory] = useState<YieldCategoryRow | null>(null);

  const principal = parseAmount(amountInput);
  const tenureDays = selectedTenure === -1 ? Math.max(1, Number(customTenure) || 1) : selectedTenure;
  const rows = useMemo(() => buildYieldRows(principal, tenureDays), [principal, tenureDays]);
  const categoryRows = useMemo(() => buildMfCategoryRows(principal, tenureDays, rows), [principal, rows, tenureDays]);

  const fdRows = rows.filter((row) => row.instrument === "Fixed Deposit");
  const currentRow = rows.find((row) => row.instrument === "Current Account");
  const fdProviders = ["All", ...Array.from(new Set(fdRows.map((row) => row.provider)))];

  const bestFd = fdRows.find((row) => row.available);
  const bestMf = categoryRows.find((row) => row.available);
  const bestReturn = [...fdRows, ...categoryRows].filter((row) => row.available).reduce((best, row) => Math.max(best, row.estimatedReturn ?? 0), 0);
  const deploymentRows: DecisionRow[] = [
    ...categoryRows.map((row): DecisionRow => ({ kind: "mf-category", row })),
    ...fdRows.map((row): DecisionRow => ({ kind: "fd", row })),
    ...(currentRow ? [{ kind: "current", row: currentRow } satisfies DecisionRow] : [])
  ];
  const filteredDeploymentRows = deploymentRows.filter(({ kind, row }) => {
    const matchesInstrument =
      instrumentFilter === "All" ||
      (instrumentFilter === "Fixed Deposit" && kind === "fd") ||
      (instrumentFilter === "Current Account" && kind === "current") ||
      row.name === instrumentFilter ||
      row.instrument === instrumentFilter;
    const matchesProvider = providerFilter === "All" || kind !== "fd" || (row as YieldComparisonRow).provider === providerFilter;
    return matchesInstrument && matchesProvider;
  });

  return (
    <>
      <PagePanel
        title="Yield Visualisation"
        className="yield-panel"
        action={
          <button className="figma-primary">
            <LineChart size={18} /> Compare instruments
          </button>
        }
      >
        <div className="yield-hero-copy">
          <h2>Compare returns across FDs, liquid funds, and other treasury instruments</h2>
          <p>Enter an amount and tenure to compare actual estimated returns across available deployment options.</p>
        </div>

        <div className="yield-config-panel">
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
        </div>

        <div className="yield-summary-grid">
          <Metric label="Deployable Amount" value={formatCurrency(principal)} />
          <Metric label="Selected Tenure" value={`${tenureDays} days`} />
          <Metric label="Best FD Return" value={bestFd ? bestFd.estimatedReturnLabel : "Not available"} />
          <Metric label="Best Indicative MF Return" value={bestMf ? formatCurrency(bestMf.estimatedReturn ?? 0) : "Not available"} />
          <Metric label="Opportunity Cost" value={formatCurrency(bestReturn)} tone="green" />
        </div>
      </PagePanel>

      <section className="figma-section">
        <div className="section-title">
          <h2>Deployment comparison</h2>
          <span>Market-linked categories first, followed by bank FD rates</span>
        </div>
        <div className="accounting-toolbar yield-filter-toolbar">
          <Filter size={18} />
          <select value={instrumentFilter} onChange={(event) => setInstrumentFilter(event.target.value)}>
            <option>All</option>
            <option>Fixed Deposit</option>
            {categoryRows.map((row) => <option key={row.id}>{row.name}</option>)}
            <option>Current Account</option>
          </select>
          <select value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)}>
            {fdProviders.map((provider) => <option key={provider}>{provider}</option>)}
          </select>
          <div className="yield-toggle">
            <span>MF annualised</span>
            <button className={annualisedMode === "median" ? "active" : ""} onClick={() => setAnnualisedMode("median")}>Median</button>
            <button className={annualisedMode === "mean" ? "active" : ""} onClick={() => setAnnualisedMode("mean")}>Mean</button>
          </div>
        </div>
        <div className="table-wrap">
          <table className="figma-table yield-table">
            <thead>
              <tr>
                <th>Option</th>
                <th>Annualised Return</th>
                <th className="align-right">Estimated Return</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeploymentRows.map(({ kind, row }) => (
                <DeploymentTableRow
                  key={`${kind}-table-${row.id}`}
                  kind={kind}
                  row={row}
                  annualisedMode={annualisedMode}
                  onClick={() => {
                    if (kind === "mf-category") setActiveCategory(row as YieldCategoryRow);
                    else setActiveRow(row as YieldComparisonRow);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
        <p className="yield-methodology">MF category estimates use pooled historical rolling NAV returns. Open a category row to inspect representative funds and methodology.</p>
      </section>

      {activeRow && <YieldDetailSheet row={activeRow} onClose={() => setActiveRow(null)} />}
      {activeCategory && <MfCategorySheet category={activeCategory} annualisedMode={annualisedMode} onClose={() => setActiveCategory(null)} />}
    </>
  );
}

function DeploymentTableRow({
  kind,
  row,
  annualisedMode,
  onClick
}: {
  kind: DecisionRow["kind"];
  row: YieldComparisonRow | YieldCategoryRow;
  annualisedMode: AnnualisedMode;
  onClick: () => void;
}) {
  const variant = kind === "fd" ? "fd" : kind === "current" ? "idle" : "mf";
  const annualisedLabel =
    kind === "mf-category" && annualisedMode === "mean"
      ? (row as YieldCategoryRow).meanAnnualisedReturnLabel ?? "Not available"
      : row.annualisedReturnLabel;
  const muted = kind === "mf-category" ? !(row as YieldCategoryRow).available : !(row as YieldComparisonRow).available;

  return (
    <tr onClick={onClick} className={`${muted ? "yield-row-muted" : ""} ${kind === "mf-category" ? "yield-pinned-row" : ""}`}>
      <td>
        <div className="fund-cell">
          <YieldIcon variant={variant} />
          <span>{getOptionLabel(kind, row)}</span>
        </div>
      </td>
      <td>{annualisedLabel}</td>
      <td className="align-right"><strong>{getEstimatedReturnLabel(kind, row)}</strong></td>
    </tr>
  );
}

function getOptionLabel(kind: DecisionRow["kind"], row: YieldComparisonRow | YieldCategoryRow) {
  if (kind === "fd") return `${(row as YieldComparisonRow).provider} FD`;
  if (kind === "current") return "Current Account";
  return (row as YieldCategoryRow).name;
}

function getEstimatedReturnLabel(kind: DecisionRow["kind"], row: YieldComparisonRow | YieldCategoryRow) {
  if (kind === "mf-category") return formatCurrency(row.estimatedReturn ?? 0);
  return row.estimatedReturnLabel;
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
        </div>
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

function MfCategorySheet({ category, annualisedMode, onClose }: { category: YieldCategoryRow; annualisedMode: AnnualisedMode; onClose: () => void }) {
  return (
    <Sheet width={780} onClose={onClose}>
      <div className="sheet-header">
        <div className="sheet-fund-title">
          <YieldIcon variant="mf" />
          <div>
            <h2>{category.name}</h2>
            <span>{category.eligibleFundCount}/{category.fundCount} funds covered · {category.selectedTenureDays} days</span>
          </div>
        </div>
      </div>
      <div className="sheet-body">
        <div className="amount-hero">
          <span>Category estimated return range</span>
          <strong>{category.estimatedReturnLabel}</strong>
        </div>
        <div className="detail-grid">
          <Detail label="Balanced Estimate" value={formatCurrency(category.estimatedReturn ?? 0)} />
          <Detail label="Period Return Range" value={category.periodReturnLabel} />
          <Detail label="Median Annualised" value={category.annualisedReturnLabel} />
          <Detail label="Mean Annualised" value={category.meanAnnualisedReturnLabel ?? "Not available"} />
          <Detail label="Settlement" value={category.liquidity} />
          <Detail label="Current Toggle" value={annualisedMode === "mean" ? "Mean" : "Median"} />
        </div>
        {category.scenarios && category.estimatedScenarios && <ScenarioTable scenarios={category.scenarios} estimatedScenarios={category.estimatedScenarios} />}
        <div className="section-title compact">
          <h2>Representative funds</h2>
          <span>Fund-level detail</span>
        </div>
        <div className="voucher-table-wrap">
          <table className="voucher-table yield-sheet-table">
            <thead>
              <tr>
                <th>Scheme</th>
                <th>AMC</th>
                <th>Range</th>
                <th className="align-right">Balanced Estimate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {category.fundRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.provider}</td>
                  <td>{row.estimatedReturnLabel}</td>
                  <td className="align-right">{row.estimatedReturn ? formatCurrency(row.estimatedReturn) : "Not available"}</td>
                  <td>{row.dataMessage ?? row.lastUpdated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="yield-methodology sheet-copy">{methodologyCopy}</p>
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
