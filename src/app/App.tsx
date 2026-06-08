import { useState } from "react";
import { entryFromScenario, allRequiredLedgers, starterPortfolios, starterTransactions } from "./data/accountingData";
import type { LedgerRole } from "./types/accounting";
import { ERPIntegration } from "./components/ERPIntegration";
import { Layout, type Section } from "./components/Shared";
import { PortfolioAccounting } from "./components/PortfolioAccounting";
import { TransactionsAccounting } from "./components/TransactionsAccounting";
import { YieldVisualisation } from "./components/YieldVisualisation";

export function App() {
  const [section, setSection] = useState<Section>("transactions");
  const [portfolios, setPortfolios] = useState(starterPortfolios);
  const [transactions, setTransactions] = useState(() => starterTransactions(starterPortfolios));
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);

  const selectedPortfolio = selectedPortfolioId ? portfolios.find((portfolio) => portfolio.id === selectedPortfolioId) : undefined;
  const selectedTransaction = selectedTransactionId ? transactions.find((txn) => txn.id === selectedTransactionId) : undefined;

  function mapPortfolioLedger(portfolioId: string, role: LedgerRole, ledgerId: string) {
    const nextPortfolios = portfolios.map((portfolio) =>
      portfolio.id === portfolioId
        ? { ...portfolio, ledgerMapping: { ...portfolio.ledgerMapping, [role]: ledgerId }, lastUpdated: "Just now" }
        : portfolio
    );

    setPortfolios(nextPortfolios);
    setTransactions((current) =>
      current.map((txn) => {
        if (txn.portfolioId !== portfolioId || txn.accountingStatus === "Synced") return txn;
        const portfolio = nextPortfolios.find((item) => item.id === portfolioId)!;
        const nextEntry = entryFromScenario(txn.scenario, portfolio.ledgerMapping, txn.amount, txn.entry.voucherDate);
        return {
          ...txn,
          entry: { ...nextEntry, error: undefined },
          accountingStatus: allRequiredLedgers(portfolio.ledgerMapping, nextEntry) ? "Ready to sync" : "Unmapped"
        };
      })
    );
  }

  function updateTransactionLine(transactionId: string, lineId: string, ledgerId: string) {
    setTransactions((current) =>
      current.map((txn) => {
        if (txn.id !== transactionId) return txn;
        const lines = txn.entry.lines.map((line) => (line.id === lineId ? { ...line, ledgerId } : line));
        return {
          ...txn,
          entry: { ...txn.entry, lines, error: undefined },
          accountingStatus: lines.every((line) => Boolean(line.ledgerId)) ? "Ready to sync" : "Unmapped"
        };
      })
    );
  }

  function syncTransactions(ids: string[]) {
    const readyIds = ids.filter((id) => transactions.find((txn) => txn.id === id)?.accountingStatus === "Ready to sync");
    if (!readyIds.length) return;

    setTransactions((current) =>
      current.map((txn) => {
        if (!readyIds.includes(txn.id)) return txn;
        const isConflict = txn.id === "txn-5";
        return {
          ...txn,
          accountingStatus: isConflict ? "Duplicate conflict" : "Synced",
          entry: {
            ...txn.entry,
            voucherNumber: isConflict ? undefined : `JV-2026-${String(Number(txn.id.replace("txn-", ""))).padStart(6, "0")}`,
            reference: isConflict ? undefined : txn.refId,
            syncedAt: isConflict ? undefined : "27 May 2026, 12:05 PM",
            error: isConflict ? "DUPLICATE_CONFLICT: Voucher with same external reference exists but ledger payload does not match." : undefined
          }
        };
      })
    );
    setSelectedTransactionIds([]);
  }

  return (
    <Layout section={section} setSection={setSection}>
      {section === "portfolio" && (
        <PortfolioAccounting
          portfolios={portfolios}
          transactions={transactions}
          onOpenPortfolio={setSelectedPortfolioId}
          selectedPortfolio={selectedPortfolio}
          onClosePortfolio={() => setSelectedPortfolioId(null)}
          onMapLedger={mapPortfolioLedger}
        />
      )}
      {section === "transactions" && (
        <TransactionsAccounting
          transactions={transactions}
          activeTransaction={selectedTransaction}
          selectedIds={selectedTransactionIds}
          setSelectedIds={setSelectedTransactionIds}
          onOpenTransaction={setSelectedTransactionId}
          onCloseTransaction={() => setSelectedTransactionId(null)}
          onSyncTransactions={syncTransactions}
          onUpdateLine={updateTransactionLine}
        />
      )}
      {section === "yield" && <YieldVisualisation />}
      {section === "erp" && <ERPIntegration />}
    </Layout>
  );
}
