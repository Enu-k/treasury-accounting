export type InstrumentType =
  | "Fixed Deposit"
  | "Liquid Mutual Fund"
  | "Overnight Fund"
  | "Money Market Fund"
  | "Current Account";

export type ReturnType = "Fixed" | "Indicative Range" | "Market-linked" | "Idle Cash";

export type LiquidityType =
  | "Immediate"
  | "Same-day"
  | "T+1"
  | "Locked until maturity"
  | "Premature withdrawal allowed"
  | "Premature withdrawal penalty applicable";

export interface TenureOption {
  label: string;
  days: number;
}

export interface FixedDepositInstrument {
  id: string;
  instrument: "Fixed Deposit";
  provider: string;
  productName: string;
  minTenureDays: number;
  maxTenureDays: number;
  annualRates: Record<number, number>;
  minimumInvestment: number;
  prematureWithdrawalAllowed: boolean;
  prematureWithdrawalPenalty: string;
  effectiveDate: string;
  lastUpdated: string;
}

export interface NavPoint {
  date: string;
  nav: number;
}

export interface MutualFundInstrument {
  id: string;
  instrument: "Liquid Mutual Fund" | "Overnight Fund" | "Money Market Fund";
  provider: string;
  schemeName: string;
  schemeCode: string;
  planOption: string;
  settlementTimeline: "Same-day" | "T+1";
  exitLoad: string;
  minimumInvestment: number;
  lastUpdated: string;
  navHistory: NavPoint[];
}

export interface CurrentAccountInstrument {
  id: string;
  instrument: "Current Account";
  provider: string;
  productName: string;
  annualRate: number;
  minimumInvestment: number;
  liquidity: "Immediate";
  lastUpdated: string;
}

export interface YieldScenario {
  conservative: number;
  balanced: number;
  aggressive: number;
}

export interface YieldComparisonRow {
  id: string;
  instrument: InstrumentType;
  name: string;
  provider: string;
  returnType: ReturnType;
  selectedTenureDays: number;
  periodReturnLabel: string;
  estimatedReturnLabel: string;
  annualisedReturnLabel: string;
  liquidity: LiquidityType;
  minimumInvestment: number;
  available: boolean;
  dataSufficient: boolean;
  dataMessage?: string;
  lastUpdated: string;
  periodReturn?: number;
  estimatedReturn?: number;
  annualisedReturn?: number;
  scenarios?: YieldScenario;
  estimatedScenarios?: YieldScenario;
  annualisedScenarios?: YieldScenario;
  sourceUrl?: string;
  fetchedAt?: string;
  effectiveFrom?: string;
  amountSlab?: string;
  tenureLabel?: string;
  lastSyncStatus?: string;
  isLive?: boolean;
  schemeCode?: string;
  navDate?: string;
  navValue?: number;
  dataSource?: string;
  historyPoints?: number;
}

export interface YieldCategoryRow {
  id: string;
  instrument: "Liquid Mutual Fund" | "Overnight Fund" | "Money Market Fund";
  name: string;
  returnType: "Indicative Range";
  selectedTenureDays: number;
  periodReturnLabel: string;
  estimatedReturnLabel: string;
  annualisedReturnLabel: string;
  liquidity: "Same-day" | "T+1";
  minimumInvestment: number;
  available: boolean;
  dataSufficient: boolean;
  dataMessage?: string;
  lastUpdated: string;
  periodReturn?: number;
  estimatedReturn?: number;
  annualisedReturn?: number;
  meanPeriodReturn?: number;
  meanEstimatedReturn?: number;
  meanAnnualisedReturn?: number;
  meanAnnualisedReturnLabel?: string;
  scenarios?: YieldScenario;
  estimatedScenarios?: YieldScenario;
  annualisedScenarios?: YieldScenario;
  fundCount: number;
  eligibleFundCount: number;
  insufficientHistoryCount: number;
  minimumInvestmentBlockedCount: number;
  fundRows: YieldComparisonRow[];
}
