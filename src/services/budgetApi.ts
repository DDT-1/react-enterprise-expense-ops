import { api } from "./apiClient";

export function saveMonthBudget(monthBudget: number) {
  return api<{ monthBudget: number }>("/budget.php", {
    method: "POST",
    body: { monthBudget },
  });
}
