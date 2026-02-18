import type { RecurringPattern } from "../lib/api/recurringPatterns";
import styles from "./RecurringPatternsTable.module.css";

type Props = {
  items: RecurringPattern[];
  formatAmount: (v: string) => string;
  onToggleActive?: (id: number, isActive: boolean) => void;
  onToggleConfirmed?: (id: number, confirmed: boolean) => void;
};

function confidenceLabel(confidence: string): string {
  const v = parseFloat(confidence);
  if (v >= 0.85) return "High";
  if (v >= 0.7) return "Medium";
  return "Low";
}

function frequencyLabel(f: string): string {
  return f.charAt(0).toUpperCase() + f.slice(1);
}

export function RecurringPatternsTable({
  items,
  formatAmount,
  onToggleActive,
  onToggleConfirmed,
}: Props) {
  return (
    <div className={styles.card}>
      <h2 className={styles.heading}>Recurring Transactions</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Payee</th>
            <th className={styles.right}>Amount</th>
            <th>Frequency</th>
            <th>Confidence</th>
            <th>Last Seen</th>
            <th>Count</th>
            {(onToggleActive || onToggleConfirmed) && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className={!p.is_active ? styles.inactive : undefined}>
              <td>{p.payee}</td>
              <td className={styles.right}>{formatAmount(p.typical_amount)}</td>
              <td>{frequencyLabel(p.frequency)}</td>
              <td>
                <span
                  className={`${styles.badge} ${
                    parseFloat(p.confidence) >= 0.85
                      ? styles.badgeHigh
                      : parseFloat(p.confidence) >= 0.7
                        ? styles.badgeMedium
                        : styles.badgeLow
                  }`}
                >
                  {confidenceLabel(p.confidence)}
                </span>
              </td>
              <td>{p.last_seen}</td>
              <td>{p.occurrence_count}</td>
              {(onToggleActive || onToggleConfirmed) && (
                <td>
                  <div className={styles.actions}>
                    {onToggleActive && (
                      <button type="button" onClick={() => onToggleActive(p.id, !p.is_active)}>
                        {p.is_active ? "Dismiss" : "Restore"}
                      </button>
                    )}
                    {onToggleConfirmed && !p.user_confirmed && (
                      <button type="button" onClick={() => onToggleConfirmed(p.id, true)}>
                        Confirm
                      </button>
                    )}
                    {p.user_confirmed && <span className={styles.confirmed}>Confirmed</span>}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
