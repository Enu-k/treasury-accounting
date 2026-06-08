import type {
  CurrentAccountInstrument,
  FixedDepositInstrument,
  InstrumentType,
  LiquidityType,
  MutualFundInstrument,
  ReturnType,
  TenureOption,
  YieldCategoryRow,
  YieldComparisonRow,
  YieldScenario
} from "../types/yield";

export const tenureOptions: TenureOption[] = [
  { label: "7 days", days: 7 },
  { label: "15 days", days: 15 },
  { label: "30 days", days: 30 },
  { label: "45 days", days: 45 },
  { label: "60 days", days: 60 },
  { label: "90 days", days: 90 },
  { label: "180 days", days: 180 }
];

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

export const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

export const parseAmount = (value: string) => Number(value.replace(/[^\d]/g, "")) || 0;

export function formatIndianAmountInput(amount: number) {
  if (!amount) return "";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
}

const rateCard = (d30: number, d60: number, d90: number, d180: number) => ({
  7: d30 - 0.004,
  15: d30 - 0.002,
  30: d30,
  45: (d30 + d60) / 2,
  60: d60,
  90: d90,
  180: d180
});

export const fixedDeposits: FixedDepositInstrument[] = [
  {
    id: "fd-hdfc",
    instrument: "Fixed Deposit",
    provider: "HDFC Bank",
    productName: "Corporate Fixed Deposit",
    minTenureDays: 7,
    maxTenureDays: 365,
    annualRates: rateCard(0.0575, 0.06, 0.0625, 0.0675),
    minimumInvestment: 100000,
    prematureWithdrawalAllowed: true,
    prematureWithdrawalPenalty: "1.00% interest penalty",
    effectiveDate: "2026-05-20",
    lastUpdated: "27 May 2026, 09:30 AM"
  },
  {
    id: "fd-icici",
    instrument: "Fixed Deposit",
    provider: "ICICI Bank",
    productName: "Treasury Term Deposit",
    minTenureDays: 7,
    maxTenureDays: 365,
    annualRates: rateCard(0.055, 0.059, 0.061, 0.066),
    minimumInvestment: 250000,
    prematureWithdrawalAllowed: true,
    prematureWithdrawalPenalty: "0.75% interest penalty",
    effectiveDate: "2026-05-22",
    lastUpdated: "27 May 2026, 10:10 AM"
  },
  {
    id: "fd-axis",
    instrument: "Fixed Deposit",
    provider: "Axis Bank",
    productName: "Business Fixed Deposit",
    minTenureDays: 15,
    maxTenureDays: 365,
    annualRates: rateCard(0.056, 0.0605, 0.063, 0.068),
    minimumInvestment: 500000,
    prematureWithdrawalAllowed: true,
    prematureWithdrawalPenalty: "Penalty applicable",
    effectiveDate: "2026-05-15",
    lastUpdated: "21 May 2026, 04:15 PM"
  },
  {
    id: "fd-sbi",
    instrument: "Fixed Deposit",
    provider: "SBI",
    productName: "Corporate Domestic Term Deposit",
    minTenureDays: 30,
    maxTenureDays: 365,
    annualRates: rateCard(0.0525, 0.0575, 0.06, 0.065),
    minimumInvestment: 100000,
    prematureWithdrawalAllowed: true,
    prematureWithdrawalPenalty: "0.50% interest penalty",
    effectiveDate: "2026-05-10",
    lastUpdated: "14 May 2026, 02:00 PM"
  }
];

function makeNavHistory(startNav: number, days: number, dailyReturn: number, wave: number, shockEvery = 0): { date: string; nav: number }[] {
  const start = new Date("2025-06-01T00:00:00+05:30");
  let nav = startNav;

  return Array.from({ length: days }, (_, index) => {
    const cycle = Math.sin(index / 13) * wave + Math.cos(index / 29) * (wave / 2);
    const shock = shockEvery && index % shockEvery === 0 ? -wave * 1.8 : 0;
    nav *= 1 + dailyReturn + cycle + shock;
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { date: date.toISOString().slice(0, 10), nav: Number(nav.toFixed(4)) };
  });
}

export const mutualFunds: MutualFundInstrument[] = [
  {
    id: "mf-abc-liquid",
    instrument: "Liquid Mutual Fund",
    provider: "ABC Asset Management",
    schemeName: "ABC Liquid Fund - Direct Growth",
    schemeCode: "ABC-LQD-DG",
    planOption: "Direct Growth",
    settlementTimeline: "T+1",
    exitLoad: "Nil after 7 days",
    minimumInvestment: 5000,
    lastUpdated: "27 May 2026, 08:45 AM",
    navHistory: makeNavHistory(1020, 366, 0.00016, 0.000012)
  },
  {
    id: "mf-axis-overnight",
    instrument: "Overnight Fund",
    provider: "Axis Mutual Fund",
    schemeName: "Axis Overnight Fund - Direct Growth",
    schemeCode: "AXIS-ON-DG",
    planOption: "Direct Growth",
    settlementTimeline: "T+1",
    exitLoad: "Nil",
    minimumInvestment: 1000,
    lastUpdated: "27 May 2026, 08:40 AM",
    navHistory: makeNavHistory(1185, 366, 0.00013, 0.000008)
  },
  {
    id: "mf-dsp-money",
    instrument: "Money Market Fund",
    provider: "DSP Mutual Fund",
    schemeName: "DSP Money Market Fund - Direct Growth",
    schemeCode: "DSP-MM-DG",
    planOption: "Direct Growth",
    settlementTimeline: "T+1",
    exitLoad: "Nil",
    minimumInvestment: 5000,
    lastUpdated: "27 May 2026, 08:30 AM",
    navHistory: makeNavHistory(1550, 366, 0.00018, 0.000018, 97)
  },
  {
    id: "mf-new-liquid",
    instrument: "Liquid Mutual Fund",
    provider: "Kodo Pilot AMC",
    schemeName: "Kodo Pilot Liquid Fund - Direct Growth",
    schemeCode: "KODO-LQD-DG",
    planOption: "Direct Growth",
    settlementTimeline: "T+1",
    exitLoad: "Nil",
    minimumInvestment: 100000,
    lastUpdated: "27 May 2026, 08:35 AM",
    navHistory: makeNavHistory(1000, 24, 0.00015, 0.00001)
  }
];

export const currentAccount: CurrentAccountInstrument = {
  id: "current-hdfc",
  instrument: "Current Account",
  provider: "Existing Bank",
  productName: "HDFC Bank Current Account",
  annualRate: 0,
  minimumInvestment: 0,
  liquidity: "Immediate",
  lastUpdated: "Live balance"
};

export function calculateFdReturn(principal: number, annualRate: number, tenureDays: number) {
  return principal * annualRate * tenureDays / 365;
}

function closestRate(fd: FixedDepositInstrument, tenureDays: number) {
  const tenures = Object.keys(fd.annualRates).map(Number).sort((a, b) => a - b);
  const closest = tenures.reduce((best, tenure) => Math.abs(tenure - tenureDays) < Math.abs(best - tenureDays) ? tenure : best, tenures[0]);
  return fd.annualRates[closest];
}

export function rollingReturns(navHistory: { nav: number }[], tenureDays: number) {
  if (navHistory.length <= tenureDays) return [];
  const returns: number[] = [];
  for (let start = 0; start + tenureDays < navHistory.length; start += 1) {
    const startNav = navHistory[start]?.nav;
    const endNav = navHistory[start + tenureDays]?.nav;
    if (startNav && endNav) returns.push(endNav / startNav - 1);
  }
  return returns;
}

function percentile(values: number[], percentileValue: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * percentileValue;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export function mfScenarios(navHistory: { nav: number }[], tenureDays: number): YieldScenario | undefined {
  const returns = rollingReturns(navHistory, tenureDays);
  if (returns.length < 10) return undefined;
  return scenariosFromReturns(returns);
}

function scenariosFromReturns(returns: number[]): YieldScenario {
  return {
    conservative: percentile(returns, 0.25),
    balanced: percentile(returns, 0.5),
    aggressive: percentile(returns, 0.75)
  };
}

function scenarioMoney(principal: number, scenarios: YieldScenario): YieldScenario {
  return {
    conservative: principal * scenarios.conservative,
    balanced: principal * scenarios.balanced,
    aggressive: principal * scenarios.aggressive
  };
}

function annualise(returnValue: number, tenureDays: number) {
  return Math.pow(1 + returnValue, 365 / tenureDays) - 1;
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function annualiseScenarios(scenarios: YieldScenario, tenureDays: number): YieldScenario {
  return {
    conservative: annualise(scenarios.conservative, tenureDays),
    balanced: annualise(scenarios.balanced, tenureDays),
    aggressive: annualise(scenarios.aggressive, tenureDays)
  };
}

function rangeLabel(values: YieldScenario, formatter: (value: number) => string) {
  return `${formatter(values.conservative)} - ${formatter(values.aggressive)}`;
}

export function buildYieldRows(principal: number, tenureDays: number): YieldComparisonRow[] {
  const fdRows: YieldComparisonRow[] = fixedDeposits.map((fd) => {
    const tenureAvailable = tenureDays >= fd.minTenureDays && tenureDays <= fd.maxTenureDays;
    const amountAvailable = principal >= fd.minimumInvestment;
    const annualRate = closestRate(fd, tenureDays);
    const estimatedReturn = calculateFdReturn(principal, annualRate, tenureDays);
    const periodReturn = annualRate * tenureDays / 365;

    return {
      id: fd.id,
      instrument: fd.instrument,
      name: fd.productName,
      provider: fd.provider,
      returnType: "Fixed",
      selectedTenureDays: tenureDays,
      periodReturnLabel: formatPercent(periodReturn),
      estimatedReturnLabel: formatCurrency(estimatedReturn),
      annualisedReturnLabel: `${formatPercent(annualRate)} p.a.`,
      liquidity: fd.prematureWithdrawalPenalty === "Nil" ? "Premature withdrawal allowed" : "Premature withdrawal penalty applicable",
      minimumInvestment: fd.minimumInvestment,
      available: tenureAvailable && amountAvailable,
      dataSufficient: true,
      dataMessage: !tenureAvailable ? "FD unavailable for selected tenure" : !amountAvailable ? "Below minimum investment" : undefined,
      lastUpdated: fd.lastUpdated,
      periodReturn,
      estimatedReturn,
      annualisedReturn: annualRate
    };
  });

  const mfRows: YieldComparisonRow[] = mutualFunds.map((fund) => {
    const scenarios = mfScenarios(fund.navHistory, tenureDays);
    const amountAvailable = principal >= fund.minimumInvestment;
    const estimatedScenarios = scenarios ? scenarioMoney(principal, scenarios) : undefined;
    const annualisedScenarios = scenarios ? annualiseScenarios(scenarios, tenureDays) : undefined;
    const dataSufficient = Boolean(scenarios);

    return {
      id: fund.id,
      instrument: fund.instrument,
      name: fund.schemeName,
      provider: fund.provider,
      returnType: "Indicative Range",
      selectedTenureDays: tenureDays,
      periodReturnLabel: scenarios ? rangeLabel(scenarios, formatPercent) : "Insufficient NAV history",
      estimatedReturnLabel: estimatedScenarios ? rangeLabel(estimatedScenarios, formatCurrency) : "Not available",
      annualisedReturnLabel: annualisedScenarios ? rangeLabel(annualisedScenarios, formatPercent) : "Not available",
      liquidity: fund.settlementTimeline,
      minimumInvestment: fund.minimumInvestment,
      available: amountAvailable && dataSufficient,
      dataSufficient,
      dataMessage: !dataSufficient ? "Insufficient NAV history for selected tenure" : !amountAvailable ? "Below minimum investment" : undefined,
      lastUpdated: fund.lastUpdated,
      periodReturn: scenarios?.balanced,
      estimatedReturn: estimatedScenarios?.balanced,
      annualisedReturn: annualisedScenarios?.balanced,
      scenarios,
      estimatedScenarios,
      annualisedScenarios
    };
  });

  const currentReturn = principal * currentAccount.annualRate * tenureDays / 365;
  const currentPeriodReturn = currentAccount.annualRate * tenureDays / 365;
  const currentRow: YieldComparisonRow = {
    id: currentAccount.id,
    instrument: currentAccount.instrument,
    name: currentAccount.productName,
    provider: currentAccount.provider,
    returnType: "Idle Cash",
    selectedTenureDays: tenureDays,
    periodReturnLabel: formatPercent(currentPeriodReturn),
    estimatedReturnLabel: formatCurrency(currentReturn),
    annualisedReturnLabel: formatPercent(currentAccount.annualRate),
    liquidity: currentAccount.liquidity,
    minimumInvestment: currentAccount.minimumInvestment,
    available: true,
    dataSufficient: true,
    lastUpdated: currentAccount.lastUpdated,
    periodReturn: currentPeriodReturn,
    estimatedReturn: currentReturn,
    annualisedReturn: currentAccount.annualRate
  };

  return [...fdRows, ...mfRows, currentRow].sort(sortYieldRows);
}

export function buildMfCategoryRows(principal: number, tenureDays: number, fundRows = buildYieldRows(principal, tenureDays)): YieldCategoryRow[] {
  const mfTypes: YieldCategoryRow["instrument"][] = ["Liquid Mutual Fund", "Overnight Fund", "Money Market Fund"];

  return mfTypes.map((instrument): YieldCategoryRow => {
    const funds = mutualFunds.filter((fund) => fund.instrument === instrument);
    const rows = fundRows.filter((row) => row.instrument === instrument);
    const pooledReturns = funds.flatMap((fund) => principal >= fund.minimumInvestment ? rollingReturns(fund.navHistory, tenureDays) : []);
    const scenarios = pooledReturns.length >= 10 ? scenariosFromReturns(pooledReturns) : undefined;
    const meanPeriodReturn = pooledReturns.length >= 10 ? mean(pooledReturns) : undefined;
    const meanEstimatedReturn = meanPeriodReturn === undefined ? undefined : principal * meanPeriodReturn;
    const meanAnnualisedReturn = meanPeriodReturn === undefined ? undefined : annualise(meanPeriodReturn, tenureDays);
    const estimatedScenarios = scenarios ? scenarioMoney(principal, scenarios) : undefined;
    const annualisedScenarios = scenarios ? annualiseScenarios(scenarios, tenureDays) : undefined;
    const eligibleFundCount = rows.filter((row) => row.available).length;
    const insufficientHistoryCount = rows.filter((row) => !row.dataSufficient).length;
    const minimumInvestmentBlockedCount = rows.filter((row) => principal < row.minimumInvestment).length;
    const updates = rows.map((row) => row.lastUpdated).sort();
    const latestUpdate = updates[updates.length - 1] ?? "Not available";
    const liquidity = rows.some((row) => row.liquidity === "Same-day") ? "Same-day" : "T+1";

    return {
      id: `category-${instrument.toLowerCase().replaceAll(" ", "-")}`,
      instrument,
      name: instrument.replace(" Mutual Fund", " Funds"),
      returnType: "Indicative Range",
      selectedTenureDays: tenureDays,
      periodReturnLabel: scenarios ? rangeLabel(scenarios, formatPercent) : "Insufficient NAV history",
      estimatedReturnLabel: estimatedScenarios ? rangeLabel(estimatedScenarios, formatCurrency) : "Not available",
      annualisedReturnLabel: annualisedScenarios ? rangeLabel(annualisedScenarios, formatPercent) : "Not available",
      liquidity,
      minimumInvestment: rows.length ? Math.min(...rows.map((row) => row.minimumInvestment)) : 0,
      available: Boolean(scenarios) && eligibleFundCount > 0,
      dataSufficient: Boolean(scenarios),
      dataMessage: scenarios ? undefined : "Insufficient NAV history across category",
      lastUpdated: latestUpdate,
      periodReturn: scenarios?.balanced,
      estimatedReturn: estimatedScenarios?.balanced,
      annualisedReturn: annualisedScenarios?.balanced,
      meanPeriodReturn,
      meanEstimatedReturn,
      meanAnnualisedReturn,
      meanAnnualisedReturnLabel: meanAnnualisedReturn === undefined ? "Not available" : formatPercent(meanAnnualisedReturn),
      scenarios,
      estimatedScenarios,
      annualisedScenarios,
      fundCount: funds.length,
      eligibleFundCount,
      insufficientHistoryCount,
      minimumInvestmentBlockedCount,
      fundRows: rows.sort(sortYieldRows)
    };
  }).sort(sortCategoryRows);
}

function sortCategoryRows(a: YieldCategoryRow, b: YieldCategoryRow) {
  if (a.available !== b.available) return a.available ? -1 : 1;
  const returnDelta = (b.estimatedReturn ?? -Infinity) - (a.estimatedReturn ?? -Infinity);
  if (returnDelta) return returnDelta;
  const liquidityDelta = liquidityRank(b.liquidity) - liquidityRank(a.liquidity);
  if (liquidityDelta) return liquidityDelta;
  return b.eligibleFundCount - a.eligibleFundCount;
}

function liquidityRank(liquidity: LiquidityType) {
  const order: Record<LiquidityType, number> = {
    Immediate: 5,
    "Same-day": 4,
    "T+1": 3,
    "Premature withdrawal allowed": 2,
    "Premature withdrawal penalty applicable": 1,
    "Locked until maturity": 0
  };
  return order[liquidity];
}

function sortYieldRows(a: YieldComparisonRow, b: YieldComparisonRow) {
  if (a.available !== b.available) return a.available ? -1 : 1;
  if (a.dataSufficient !== b.dataSufficient) return a.dataSufficient ? -1 : 1;
  const returnDelta = (b.estimatedReturn ?? -Infinity) - (a.estimatedReturn ?? -Infinity);
  if (returnDelta) return returnDelta;
  const liquidityDelta = liquidityRank(b.liquidity) - liquidityRank(a.liquidity);
  if (liquidityDelta) return liquidityDelta;
  return a.lastUpdated.localeCompare(b.lastUpdated);
}

export const instrumentTypes: ("All" | InstrumentType)[] = [
  "All",
  "Fixed Deposit",
  "Liquid Mutual Fund",
  "Overnight Fund",
  "Money Market Fund",
  "Current Account"
];

export const returnTypes: ("All" | ReturnType)[] = ["All", "Fixed", "Indicative Range", "Market-linked", "Idle Cash"];

export const liquidityOptions: ("All" | LiquidityType)[] = [
  "All",
  "Immediate",
  "Same-day",
  "T+1",
  "Premature withdrawal allowed",
  "Premature withdrawal penalty applicable",
  "Locked until maturity"
];
