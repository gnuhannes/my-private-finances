import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export type Category = {
  id: number;
  name: string;
  parent_id: number | null;
};

export type CategoryCreate = {
  name: string;
  parent_id?: number | null;
};

export type CategoryUpdate = {
  name?: string;
  parent_id?: number | null;
};

export function getCategories(): Promise<Category[]> {
  return apiGet<Category[]>("/api/categories");
}

export function createCategory(data: CategoryCreate): Promise<Category> {
  return apiPost<Category>("/api/categories", data);
}

export function updateCategory(id: number, data: CategoryUpdate): Promise<Category> {
  return apiPatch<Category>(`/api/categories/${id}`, data);
}

export function deleteCategory(id: number): Promise<void> {
  return apiDelete(`/api/categories/${id}`);
}
