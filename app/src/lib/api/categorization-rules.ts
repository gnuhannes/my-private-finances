import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./client";

export type CategorizationRule = {
  id: number;
  position: number;
  field: string;
  operator: string;
  value: string;
  category_id: number;
};

export type RuleCreate = {
  field: string;
  operator: string;
  value: string;
  category_id: number;
};

export type RuleUpdate = {
  field?: string;
  operator?: string;
  value?: string;
  category_id?: number;
};

export type ApplyResult = {
  categorized: number;
};

export function getRules(): Promise<CategorizationRule[]> {
  return apiGet<CategorizationRule[]>("/api/categorization-rules");
}

export function createRule(data: RuleCreate): Promise<CategorizationRule> {
  return apiPost<CategorizationRule>("/api/categorization-rules", data);
}

export function updateRule(id: number, data: RuleUpdate): Promise<CategorizationRule> {
  return apiPatch<CategorizationRule>(`/api/categorization-rules/${id}`, data);
}

export function deleteRule(id: number): Promise<void> {
  return apiDelete(`/api/categorization-rules/${id}`);
}

export function reorderRules(ruleIds: number[]): Promise<CategorizationRule[]> {
  return apiPut<CategorizationRule[]>("/api/categorization-rules/reorder", {
    rule_ids: ruleIds,
  });
}

export function applyRules(): Promise<ApplyResult> {
  return apiPost<ApplyResult>("/api/categorization-rules/apply", {});
}
