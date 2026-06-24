import { paymentMethodLabels, reimbursementCategories, statusLabels } from "../constants";
import type {
  ApprovalActivity,
  CategoryTotal,
  DepartmentTotal,
  EntryFilters,
  LedgerEntry,
  LedgerSummary,
  RequestStatus,
} from "../types";

export function getSummary(entries: LedgerEntry[], monthBudget: number): LedgerSummary {
  const reimbursementEntries = entries.filter((entry) => entry.type === "expense");
  const approvedEntries = reimbursementEntries.filter((entry) => entry.status === "approved");
  const pendingEntries = reimbursementEntries.filter((entry) => entry.status === "pending");
  const rejectedEntries = reimbursementEntries.filter((entry) => entry.status === "rejected");

  const approvedExpense = sumAmounts(approvedEntries);
  const pendingExpense = sumAmounts(pendingEntries);
  const rejectedExpense = sumAmounts(rejectedEntries);
  const budgetPercent = monthBudget > 0 ? Math.min(100, Math.round((approvedExpense / monthBudget) * 100)) : 0;

  return {
    allocatedBudget: monthBudget,
    approvedExpense,
    pendingExpense,
    rejectedExpense,
    availableBudget: monthBudget - approvedExpense,
    budgetPercent,
    pendingCount: pendingEntries.length,
    approvedCount: approvedEntries.length,
    rejectedCount: rejectedEntries.length,
  };
}

// 分类统计只统计“已通过”的报销，这样预算看板不会被待审或驳回申请污染。
export function getCategoryTotals(entries: LedgerEntry[]): CategoryTotal[] {
  const approvedExpenseEntries = entries.filter((entry) => entry.type === "expense" && entry.status === "approved");
  const totalExpense = sumAmounts(approvedExpenseEntries);
  const totals = approvedExpenseEntries.reduce<Record<string, number>>((record, entry) => {
    record[entry.category] = (record[entry.category] ?? 0) + entry.amount;
    return record;
  }, {});

  const categories = [
    ...reimbursementCategories,
    ...Object.keys(totals).filter((category) => !reimbursementCategories.includes(category)),
  ];

  return categories.map((category) => {
    const total = totals[category] ?? 0;
    return {
      category,
      total,
      percent: totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0,
    };
  });
}

export function getDepartmentTotals(entries: LedgerEntry[]): DepartmentTotal[] {
  const approvedExpenseEntries = entries.filter((entry) => entry.type === "expense" && entry.status === "approved");
  const totalExpense = sumAmounts(approvedExpenseEntries);
  const totals = approvedExpenseEntries.reduce<Record<string, { total: number; count: number }>>((record, entry) => {
    const current = record[entry.department] ?? { total: 0, count: 0 };
    record[entry.department] = {
      total: current.total + entry.amount,
      count: current.count + 1,
    };
    return record;
  }, {});

  return Object.entries(totals)
    .map(([department, item]) => ({
      department,
      total: item.total,
      count: item.count,
      percent: totalExpense > 0 ? Math.round((item.total / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function getApprovalActivities(entries: LedgerEntry[], limit = 6): ApprovalActivity[] {
  return entries
    .filter((entry) => entry.status !== "pending")
    .sort((a, b) => {
      const left = a.reviewedAt ? new Date(a.reviewedAt).getTime() : 0;
      const right = b.reviewedAt ? new Date(b.reviewedAt).getTime() : 0;
      return right - left;
    })
    .slice(0, limit)
    .map((entry) => ({
      id: entry.id,
      note: entry.note,
      applicantName: entry.applicantName,
      department: entry.department,
      status: entry.status,
      rejectReason: entry.rejectReason,
      reviewedAt: entry.reviewedAt,
    }));
}

export function filterEntries(entries: LedgerEntry[], filters: EntryFilters) {
  const keyword = filters.keyword.trim().toLowerCase();

  return entries.filter((entry) => {
    const statusMatch = filters.status === "all" || entry.status === filters.status;
    const dateMatch = !filters.date || entry.date === filters.date;
    const departmentMatch = !filters.department || entry.department === filters.department;
    const searchableText = [
      entry.note,
      entry.category,
      entry.date,
      entry.department,
      entry.applicantName,
      entry.receiptNo,
      paymentMethodLabels[entry.paymentMethod],
      String(entry.amount),
      entry.type === "income" ? "预算入账" : "报销申请",
      statusLabels[entry.status],
      entry.rejectReason,
    ]
      .join(" ")
      .toLowerCase();
    const keywordMatch = !keyword || searchableText.includes(keyword);

    return statusMatch && dateMatch && departmentMatch && keywordMatch;
  });
}

export function getStatusTone(status: RequestStatus) {
  if (status === "approved") return "green";
  if (status === "rejected") return "red";
  return "amber";
}

// 金额输入的小计算器：把 120+30*2、100/4 这种表达式算成真正的数字。
export function evaluateAmountExpression(expression: string): number | null {
  const source = expression.replace(/\s/g, "").replace(/[×xX]/g, "*").replace(/÷/g, "/");
  if (!source) return null;

  let index = 0;

  function parseExpression(): number {
    let value = parseTerm();
    while (source[index] === "+" || source[index] === "-") {
      const operator = source[index++];
      const right = parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseFactor();
    while (source[index] === "*" || source[index] === "/") {
      const operator = source[index++];
      const right = parseFactor();
      if (operator === "/" && right === 0) {
        throw new Error("divide by zero");
      }
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  }

  function parseFactor(): number {
    if (source[index] === "+") {
      index += 1;
      return parseFactor();
    }

    if (source[index] === "-") {
      index += 1;
      return -parseFactor();
    }

    if (source[index] === "(") {
      index += 1;
      const value = parseExpression();
      if (source[index] !== ")") {
        throw new Error("missing bracket");
      }
      index += 1;
      return value;
    }

    return parseNumber();
  }

  function parseNumber(): number {
    const start = index;
    while (/[0-9.]/.test(source[index] ?? "")) {
      index += 1;
    }
    const raw = source.slice(start, index);
    if (!raw || raw.split(".").length > 2) {
      throw new Error("invalid number");
    }
    return Number(raw);
  }

  try {
    const value = parseExpression();
    if (index !== source.length || !Number.isFinite(value) || value <= 0) {
      return null;
    }
    return Math.round(value * 100) / 100;
  } catch {
    return null;
  }
}

export function formatMoney(value: number) {
  return `¥${Number(value).toFixed(2)}`;
}

function sumAmounts(entries: LedgerEntry[]) {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}
