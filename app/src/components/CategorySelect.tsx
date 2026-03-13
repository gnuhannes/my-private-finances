import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Category } from "../lib/api/categories";
import styles from "./CategorySelect.module.css";

export type CategorySuggestion = {
  categoryId: number;
  confidence: number;
};

type Props = {
  categories: Category[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  suggestion?: CategorySuggestion;
  className?: string;
  size?: "sm" | "md";
};

type TreeNode = { cat: Category; depth: number; children: TreeNode[] };

function buildTree(categories: Category[]): TreeNode[] {
  const knownIds = new Set(categories.map((c) => c.id));
  const byParent = new Map<number, Category[]>();
  const treeRoots: Category[] = [];

  for (const c of categories) {
    if (c.parent_id === null || !knownIds.has(c.parent_id)) {
      treeRoots.push(c);
    } else {
      const siblings = byParent.get(c.parent_id) ?? [];
      siblings.push(c);
      byParent.set(c.parent_id, siblings);
    }
  }

  function buildNodes(cats: Category[], depth: number): TreeNode[] {
    return cats.map((cat) => ({
      cat,
      depth,
      children: buildNodes(byParent.get(cat.id) ?? [], depth + 1),
    }));
  }

  return buildNodes(treeRoots, 0);
}

function filterTree(
  nodes: TreeNode[],
  matches: (c: Category) => boolean,
): TreeNode[] {
  return nodes.flatMap((node) => {
    if (matches(node.cat)) {
      return [node]; // parent matches: keep entire subtree intact
    }
    const filteredChildren = filterTree(node.children, matches);
    if (filteredChildren.length > 0) {
      return [{ ...node, children: filteredChildren }];
    }
    return [];
  });
}

function flattenTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

export function CategorySelect({
  categories,
  value,
  onChange,
  placeholder,
  allowEmpty = false,
  emptyLabel = "—",
  suggestion,
  className,
  size = "md",
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const ph = placeholder ?? t("categorySelect.placeholder");

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${focusedIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  const selectedCat = value !== null ? categories.find((c) => c.id === value) : null;
  const suggestedCat = suggestion ? categories.find((c) => c.id === suggestion.categoryId) : null;

  const q = search.trim().toLowerCase();
  const matches = (c: Category) => q === "" || c.name.toLowerCase().includes(q);

  const tree = buildTree(categories);
  const filteredTree = q === "" ? tree : filterTree(tree, matches);
  const flat = flattenTree(filteredTree);

  const showSuggestion = !!suggestedCat && (q === "" || matches(suggestedCat));
  const hasResults = flat.length > 0;

  // Flat ordered list of selectable option IDs, mirroring render order
  const options: Array<number | null> = [];
  if (allowEmpty) options.push(null);
  if (showSuggestion) options.push(suggestedCat.id);
  for (const { cat } of flat) options.push(cat.id);

  const commit = (id: number | null) => {
    onChange(id);
    setOpen(false);
    setSearch("");
    setFocusedIndex(-1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (flat.length === 1) {
          commit(flat[0].cat.id);
        } else if (focusedIndex >= 0 && focusedIndex < options.length) {
          commit(options[focusedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setSearch("");
        break;
    }
  };

  const itemClass = (id: number | null, depth = 0) => {
    const idx = id === null ? options.indexOf(null) : options.indexOf(id);
    return [
      styles.item,
      depth === 0 ? styles.parent : "",
      value === id ? styles.active : "",
      focusedIndex === idx ? styles.focused : "",
    ]
      .filter(Boolean)
      .join(" ");
  };

  return (
    <div
      ref={containerRef}
      className={[styles.container, size === "sm" ? styles.sm : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className={styles.trigger}
        onClick={() => {
          if (open) setFocusedIndex(-1);
          setOpen((o) => !o);
          setSearch("");
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selectedCat ? styles.valueText : styles.placeholder}>
          {selectedCat ? selectedCat.name : ph}
        </span>
        {suggestedCat && value === null && (
          <span
            className={styles.suggestionBadge}
            title={`${t("categorySelect.suggested")}: ${suggestedCat.name} (${Math.round(suggestion!.confidence * 100)}%)`}
          >
            {Math.round(suggestion!.confidence * 100)}%
          </span>
        )}
        <span className={styles.chevron} aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className={styles.dropdown} role="listbox">
          <div className={styles.searchWrap}>
            <input
              ref={searchRef}
              type="text"
              className={styles.searchInput}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setFocusedIndex(-1);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={t("categorySelect.search")}
              autoComplete="off"
            />
          </div>
          <div ref={listRef} className={styles.list}>
            {allowEmpty && (
              <button
                type="button"
                role="option"
                aria-selected={value === null}
                data-idx={options.indexOf(null)}
                className={itemClass(null)}
                onClick={() => commit(null)}
              >
                {emptyLabel}
              </button>
            )}

            {showSuggestion && (
              <>
                <div className={styles.groupLabel}>{t("categorySelect.suggested")}</div>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === suggestedCat.id}
                  data-idx={options.indexOf(suggestedCat.id)}
                  className={itemClass(suggestedCat.id)}
                  onClick={() => commit(suggestedCat.id)}
                >
                  {suggestedCat.name}
                  <span className={styles.confBadge}>
                    {Math.round(suggestion!.confidence * 100)}%
                  </span>
                </button>
                {hasResults && <div className={styles.divider} />}
              </>
            )}

            {flat.map(({ cat, depth }) => (
              <button
                key={cat.id}
                type="button"
                role="option"
                aria-selected={value === cat.id}
                data-idx={options.indexOf(cat.id)}
                className={itemClass(cat.id, depth)}
                onClick={() => commit(cat.id)}
                style={{ paddingLeft: `${12 + depth * 14}px` }}
              >
                {cat.name}
              </button>
            ))}

            {!hasResults && <p className={styles.empty}>{t("categorySelect.noResults")}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
