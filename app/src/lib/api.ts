export { ApiError, apiGet } from "./api/client";

export { getAccounts } from "./api/accounts";
export type { Account } from "./api/accounts";

export { getMonthlyReport } from "./api/reports";
export type { CategoryTotal, MonthlyReport, PayeeTotal, TopSpending } from "./api/reports";

export { getTransactions, updateTransactionCategory } from "./api/transactions";
export type {
  TransactionItem,
  TransactionListResponse,
  TransactionParams,
} from "./api/transactions";

export { importCsv } from "./api/imports";
export type { ImportResult, ImportCsvParams } from "./api/imports";

export {
  detectTransfers,
  getTransferCandidates,
  confirmTransfer,
  dismissTransfer,
} from "./api/transfers";
export type { TransferCandidate, TransferLeg } from "./api/transfers";
