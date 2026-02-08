export type Account = {
    id: number;
    name: string;
    currency: string;
};

export type PayeeTotal = {
    payee: string | null;
    total: string;
};

export type MonthlyReport = {
    account_id: number;
    month: string;
    currency: string;

    transactions_count: number;

    income_total: string;
    expense_total: string;
    net_total: string;

    top_payees: PayeeTotal[];
};

export class ApiError extends Error {
    status: number;
    body: unknown;

    constructor(status: number, body: unknown) {
        super(`API Error ${status}`);
        this.status = status;
        this.body = body;
    }
}

export async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(path, {headers: {Accept: "application/json"}});
    const body = await res.json().catch(() => null);

    if (!res.ok) {
        throw new ApiError(res.status, body);
    }

    return body as T;
}

export function getAccounts(): Promise<Account[]> {
    return apiGet<Account[]>("/api/accounts");
}

export function getMonthlyReport(params: {
    accountId: number;
    month: string;
}): Promise<MonthlyReport> {
    const q = new URLSearchParams({
        account_id: String(params.accountId),
        month: params.month,
    });
    return apiGet<MonthlyReport>(`/api/reports/monthly?${q.toString()}`);
}
