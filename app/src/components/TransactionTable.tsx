import type { TransactionItem } from "../lib/api";
import { formatMoneyString } from "../utils/money";
import styles from "./TransactionTable.module.css";

type Props = {
  items: TransactionItem[];
  currency: string;
};

export function TransactionTable({ items, currency }: Props) {
  if (items.length === 0) {
    return <p className={styles.empty}>No transactions found.</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Date</th>
          <th>Payee</th>
          <th>Purpose</th>
          <th className={styles.amount}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((tx) => (
          <tr key={tx.id}>
            <td>{tx.booking_date}</td>
            <td>{tx.payee ?? ""}</td>
            <td>{tx.purpose ?? ""}</td>
            <td className={styles.amount}>{formatMoneyString(tx.amount, currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
