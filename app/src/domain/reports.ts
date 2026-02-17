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

export type CategoryTotalDto = {
  category_name: string | null;
  total: string;
};

export type CategoryBreakdownItem = {
  category: string;
  amount: number;
};

export function mapCategoryBreakdownForChart(items: CategoryTotalDto[]): CategoryBreakdownItem[] {
  return items
    .map((c) => {
      const category = c.category_name ?? "Uncategorized";
      const amount = Math.abs(Number(c.total));

      if (!Number.isFinite(amount)) {
        return null;
      }

      return { category, amount } satisfies CategoryBreakdownItem;
    })
    .filter((x): x is CategoryBreakdownItem => x !== null);
}
