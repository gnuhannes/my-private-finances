import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SuggestionsTable } from "../components/SuggestionsTable";
import { useAcceptSuggestion, useSuggestions, useTrainModel } from "../hooks/useMl";
import type { TrainResult } from "../lib/api/ml";
import styles from "./Suggestions.module.css";

export default function Suggestions() {
  const { t } = useTranslation();
  const suggestionsQuery = useSuggestions();
  const trainMutation = useTrainModel();
  const acceptMutation = useAcceptSuggestion();

  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [lastTrainResult, setLastTrainResult] = useState<TrainResult | null>(null);

  const allSuggestions = suggestionsQuery.data ?? [];
  const visibleSuggestions = allSuggestions.filter((s) => !skipped.has(s.transaction_id));
  const highConfidenceSuggestions = visibleSuggestions.filter((s) => s.confidence >= 0.8);

  function handleSkip(transactionId: number) {
    setSkipped((prev) => new Set([...prev, transactionId]));
  }

  function handleAcceptAll() {
    for (const s of highConfidenceSuggestions) {
      acceptMutation.mutate({ transactionId: s.transaction_id, categoryId: s.category_id });
    }
  }

  function handleTrain() {
    setLastTrainResult(null);
    trainMutation.mutate(undefined, {
      onSuccess: (result) => setLastTrainResult(result),
    });
  }

  const isColdStart =
    suggestionsQuery.isError || (trainMutation.isError && !trainMutation.isPending);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t("suggestions.title")}</h1>
          <p className={styles.subtitle}>{t("suggestions.subtitle")}</p>
        </div>
        <button
          type="button"
          className={styles.trainBtn}
          onClick={handleTrain}
          disabled={trainMutation.isPending}
        >
          {trainMutation.isPending ? t("suggestions.training") : t("suggestions.trainModel")}
        </button>
      </div>

      {lastTrainResult && (
        <p className={styles.trainResult}>
          {t("suggestions.trainSuccess", {
            samples: lastTrainResult.num_samples,
            categories: lastTrainResult.num_categories,
          })}
        </p>
      )}

      {trainMutation.isError && <p className={styles.error}>{t("suggestions.trainFailed")}</p>}

      {highConfidenceSuggestions.length > 0 && (
        <div className={styles.bulkActions}>
          <button
            type="button"
            className={styles.acceptAllBtn}
            onClick={handleAcceptAll}
            disabled={acceptMutation.isPending}
          >
            {t("suggestions.acceptAllHighConfidence", { count: highConfidenceSuggestions.length })}
          </button>
        </div>
      )}

      {suggestionsQuery.isLoading && <p className={styles.status}>{t("common.loading")}</p>}

      {isColdStart && !suggestionsQuery.isLoading && (
        <div className={styles.emptyState}>
          <p>{t("suggestions.coldStartHint")}</p>
        </div>
      )}

      {!suggestionsQuery.isLoading && !isColdStart && visibleSuggestions.length === 0 && (
        <p className={styles.empty}>{t("suggestions.noSuggestions")}</p>
      )}

      {visibleSuggestions.length > 0 && (
        <SuggestionsTable
          items={visibleSuggestions}
          onAccept={(txId, catId) =>
            acceptMutation.mutate({ transactionId: txId, categoryId: catId })
          }
          onSkip={handleSkip}
        />
      )}
    </div>
  );
}
