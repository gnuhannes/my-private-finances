import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccounts } from "../hooks/useAccounts";
import { useCsvProfiles } from "../hooks/useCsvProfiles";
import {
  useCreateWatchConfig,
  useDeleteWatchConfig,
  useUpdateWatchSettings,
  useWatchConfigs,
  useWatchSettings,
} from "../hooks/useWatchFolder";
import styles from "./WatchFolderPanel.module.css";

export function WatchFolderPanel() {
  const { t } = useTranslation();
  const { data: settings } = useWatchSettings();
  const { data: configs = [] } = useWatchConfigs();
  const { data: accounts = [] } = useAccounts();
  const { profiles } = useCsvProfiles();

  const updateSettings = useUpdateWatchSettings();
  const createConfig = useCreateWatchConfig();
  const deleteConfig = useDeleteWatchConfig();

  const [editingPath, setEditingPath] = useState(false);
  const [pathDraft, setPathDraft] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubfolder, setNewSubfolder] = useState("");
  const [newAccountId, setNewAccountId] = useState<number | "">("");
  const [newProfileId, setNewProfileId] = useState<number | "">("");

  function startEditPath() {
    setPathDraft(settings?.root_path ?? "");
    setEditingPath(true);
  }

  function savePath() {
    if (pathDraft.trim()) {
      updateSettings.mutate(pathDraft.trim(), {
        onSuccess: () => setEditingPath(false),
      });
    }
  }

  function handleAddConfig() {
    if (!newSubfolder.trim() || newAccountId === "") return;
    createConfig.mutate(
      {
        subfolder_name: newSubfolder.trim(),
        account_id: Number(newAccountId),
        profile_id: newProfileId !== "" ? Number(newProfileId) : null,
      },
      {
        onSuccess: () => {
          setShowAddForm(false);
          setNewSubfolder("");
          setNewAccountId("");
          setNewProfileId("");
        },
      },
    );
  }

  const accountName = (id: number) => accounts.find((a) => a.id === id)?.name ?? String(id);
  const profileName = (id: number | null) =>
    id == null
      ? t("watchFolder.noProfile")
      : (profiles.data?.find((p) => p.id === id)?.name ?? String(id));

  return (
    <div className={styles.panel}>
      {/* Root path */}
      <div className={styles.pathRow}>
        <span className={styles.pathLabel}>{t("watchFolder.rootPath")}</span>
        {editingPath ? (
          <div className={styles.pathEdit}>
            <input
              className={styles.pathInput}
              value={pathDraft}
              onChange={(e) => setPathDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") savePath();
                if (e.key === "Escape") setEditingPath(false);
              }}
              autoFocus
            />
            <button type="button" onClick={savePath} disabled={updateSettings.isPending}>
              {t("common.save")}
            </button>
            <button type="button" onClick={() => setEditingPath(false)}>
              {t("common.cancel")}
            </button>
          </div>
        ) : (
          <div className={styles.pathDisplay}>
            <code className={styles.pathValue}>{settings?.root_path ?? "…"}</code>
            <button type="button" onClick={startEditPath}>
              {t("common.edit")}
            </button>
          </div>
        )}
      </div>

      {/* Subfolder configs */}
      <div className={styles.configsHeader}>
        <span className={styles.configsTitle}>{t("watchFolder.subfolders")}</span>
        <button type="button" onClick={() => setShowAddForm((v) => !v)}>
          {showAddForm ? t("common.cancel") : t("common.add")}
        </button>
      </div>

      {showAddForm && (
        <div className={styles.addForm}>
          <input
            className={styles.formInput}
            placeholder={t("watchFolder.subfolderPlaceholder")}
            value={newSubfolder}
            onChange={(e) => setNewSubfolder(e.target.value)}
          />
          <select
            className={styles.formSelect}
            value={newAccountId}
            onChange={(e) => setNewAccountId(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">{t("watchFolder.selectAccount")}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            className={styles.formSelect}
            value={newProfileId}
            onChange={(e) => setNewProfileId(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">{t("watchFolder.noProfile")}</option>
            {profiles.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddConfig}
            disabled={!newSubfolder.trim() || newAccountId === "" || createConfig.isPending}
          >
            {t("watchFolder.addSubfolder")}
          </button>
          {createConfig.isError && <p className={styles.error}>{t("watchFolder.addError")}</p>}
        </div>
      )}

      {configs.length === 0 ? (
        <p className={styles.empty}>{t("watchFolder.noConfigs")}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("watchFolder.colSubfolder")}</th>
              <th>{t("watchFolder.colAccount")}</th>
              <th>{t("watchFolder.colProfile")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {configs.map((cfg) => (
              <tr key={cfg.id}>
                <td>
                  <code>{cfg.subfolder_name}</code>
                </td>
                <td>{accountName(cfg.account_id)}</td>
                <td>{profileName(cfg.profile_id)}</td>
                <td>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => deleteConfig.mutate(cfg.id)}
                  >
                    {t("common.delete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
