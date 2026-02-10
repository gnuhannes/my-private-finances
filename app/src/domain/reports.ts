export type PayeeTotalDto = {
    payee: string | null;
    total: string; // money as string (decimal)
};

export type TopPayee = {
    payee: string;
    amount: number; // positive number for chart
};

export function mapTopPayeesForChart(items: PayeeTotalDto[]): TopPayee[] {
    return items
        .map((p) => {
            const payee = p.payee ?? "(unknown)";
            const amount = Math.abs(Number(p.total));

            if (!Number.isFinite(amount)) {
                return null;
            }

            return { payee, amount } satisfies TopPayee;
        })
        .filter((x): x is TopPayee => x !== null);
}
