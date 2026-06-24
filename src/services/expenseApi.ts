import type { LedgerEntry, LedgerResponse, RequestStatus } from "../types";
import { api } from "./apiClient";

export type CreateExpenseInput = Omit<LedgerEntry, "id" | "reviewedAt">;

export function fetchLedger() {
  return api<LedgerResponse>("/entries.php");
}

export function createExpense(input: CreateExpenseInput) {
  return api("/entries.php", {
    method: "POST",
    body: input,
  });
}

export function updateExpenseStatus(id: number, status: RequestStatus, rejectReason = "") {
  return api("/entries.php", {
    method: "PATCH",
    body: { id, status, rejectReason },
  });
}

export function deleteExpense(id: number) {
  return api(`/entries.php?id=${id}`, { method: "DELETE" });
}

export function clearExpenses() {
  return api("/entries.php?all=1", { method: "DELETE" });
}

export async function seedExpenses(entries: Array<Omit<LedgerEntry, "id">>) {
  for (const entry of entries) {
    await api("/entries.php", { method: "POST", body: entry });
  }
}
