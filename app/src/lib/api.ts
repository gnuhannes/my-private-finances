export { ApiError, apiGet } from "./api/client";

export { getAccounts, createAccount, updateAccount } from "./api/accounts";
export type { Account, AccountCreatePayload, AccountUpdatePayload } from "./api/accounts";

export { getMonthlyReport } from "./api/reports";
export type { CategoryTotal, MonthlyReport, PayeeTotal, TopSpending } from "./api/reports";

export { getTransactions, updateTransactionCategory } from "./api/transactions";
export type {
  TransactionItem,
  TransactionListResponse,
  TransactionParams,
} from "./api/transactions";

export { importCsv, importPdf } from "./api/imports";
export type { ImportResult, ImportCsvParams, ImportPdfParams } from "./api/imports";

export {
  detectTransfers,
  getTransferCandidates,
  confirmTransfer,
  dismissTransfer,
} from "./api/transfers";
export type { TransferCandidate, TransferLeg } from "./api/transfers";

export { getNetWorth } from "./api/netWorth";
export type { NetWorthReport, NetWorthPoint, AccountNetWorthSummary } from "./api/netWorth";

export { getSpendingTrend } from "./api/trends";
export type { SpendingTrendReport, CategoryTrendItem } from "./api/trends";

export { getAnnualReport } from "./api/annual";
export type { AnnualReport, MonthSummary } from "./api/annual";
