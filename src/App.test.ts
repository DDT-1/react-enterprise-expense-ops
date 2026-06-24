import { describe, expect, it } from "vitest";
import type { LedgerEntry } from "./types";
import {
  evaluateAmountExpression,
  filterEntries,
  formatMoney,
  getApprovalActivities,
  getCategoryTotals,
  getDepartmentTotals,
  getSummary,
} from "./utils/ledger";

const entries: LedgerEntry[] = [
  {
    id: 1,
    type: "expense",
    amount: 1200,
    category: "差旅交通",
    note: "上海客户拜访高铁票",
    date: "2026-06-01",
    department: "市场部",
    applicantName: "陈雨",
    receiptNo: "INV-001",
    paymentMethod: "personal_pay",
    status: "approved",
    rejectReason: "",
    reviewedAt: "2026-06-02 10:00:00",
  },
  {
    id: 2,
    type: "expense",
    amount: 800,
    category: "办公采购",
    note: "显示器采购",
    date: "2026-06-02",
    department: "研发部",
    applicantName: "林舟",
    receiptNo: "PO-002",
    paymentMethod: "company_card",
    status: "pending",
    rejectReason: "",
    reviewedAt: null,
  },
  {
    id: 3,
    type: "expense",
    amount: 500,
    category: "差旅交通",
    note: "市内交通费",
    date: "2026-06-03",
    department: "市场部",
    applicantName: "许安",
    receiptNo: "INV-003",
    paymentMethod: "bank_transfer",
    status: "approved",
    rejectReason: "",
    reviewedAt: "2026-06-03 18:00:00",
  },
  {
    id: 4,
    type: "expense",
    amount: 300,
    category: "客户招待",
    note: "缺少发票抬头",
    date: "2026-06-04",
    department: "市场部",
    applicantName: "周宁",
    receiptNo: "",
    paymentMethod: "personal_pay",
    status: "rejected",
    rejectReason: "票据信息不完整",
    reviewedAt: "2026-06-05 09:00:00",
  },
];

describe("expense management helpers", () => {
  it("calculates budget dashboard summary", () => {
    expect(getSummary(entries, 5000)).toEqual({
      allocatedBudget: 5000,
      approvedExpense: 1700,
      pendingExpense: 800,
      rejectedExpense: 300,
      availableBudget: 3300,
      budgetPercent: 34,
      pendingCount: 1,
      approvedCount: 2,
      rejectedCount: 1,
    });
  });

  it("groups approved reimbursement entries by category", () => {
    expect(getCategoryTotals(entries)).toEqual([
      { category: "差旅交通", total: 1700, percent: 100 },
      { category: "办公采购", total: 0, percent: 0 },
      { category: "客户招待", total: 0, percent: 0 },
      { category: "培训学习", total: 0, percent: 0 },
      { category: "软件订阅", total: 0, percent: 0 },
      { category: "行政杂费", total: 0, percent: 0 },
      { category: "其他费用", total: 0, percent: 0 },
    ]);
  });

  it("keeps custom approved categories in category totals", () => {
    const customEntries: LedgerEntry[] = [
      ...entries,
      {
        id: 5,
        type: "expense",
        amount: 400,
        category: "设备维修",
        note: "会议室投影维修",
        date: "2026-06-05",
        department: "人事行政",
        applicantName: "沈南",
        receiptNo: "FIX-005",
        paymentMethod: "cash",
        status: "approved",
        rejectReason: "",
        reviewedAt: "2026-06-06 11:00:00",
      },
    ];

    expect(getCategoryTotals(customEntries).at(-1)).toEqual({ category: "设备维修", total: 400, percent: 19 });
  });

  it("groups approved reimbursement entries by department", () => {
    expect(getDepartmentTotals(entries)).toEqual([{ department: "市场部", total: 1700, percent: 100, count: 2 }]);
  });

  it("creates recent approval activities", () => {
    expect(getApprovalActivities(entries, 2)).toEqual([
      {
        id: 4,
        note: "缺少发票抬头",
        applicantName: "周宁",
        department: "市场部",
        status: "rejected",
        rejectReason: "票据信息不完整",
        reviewedAt: "2026-06-05 09:00:00",
      },
      {
        id: 3,
        note: "市内交通费",
        applicantName: "许安",
        department: "市场部",
        status: "approved",
        rejectReason: "",
        reviewedAt: "2026-06-03 18:00:00",
      },
    ]);
  });

  it("filters entries by status, keyword, department, and date", () => {
    expect(filterEntries(entries, { status: "approved", keyword: "高铁", department: "", date: "" })).toHaveLength(1);
    expect(filterEntries(entries, { status: "approved", keyword: "银行转账", department: "", date: "" })).toHaveLength(1);
    expect(filterEntries(entries, { status: "all", keyword: "市场部", department: "市场部", date: "2026-06-03" })).toEqual([
      entries[2],
    ]);
    expect(filterEntries(entries, { status: "pending", keyword: "", department: "研发部", date: "" })).toEqual([entries[1]]);
  });

  it("evaluates amount expressions", () => {
    expect(evaluateAmountExpression("120+80*2")).toBe(280);
    expect(evaluateAmountExpression("120+80×2")).toBe(280);
    expect(evaluateAmountExpression("(120+80)*2")).toBe(400);
    expect(evaluateAmountExpression("100/4")).toBe(25);
    expect(evaluateAmountExpression("100÷4")).toBe(25);
    expect(evaluateAmountExpression("10/0")).toBeNull();
    expect(evaluateAmountExpression("-5")).toBeNull();
  });

  it("formats money without extra complexity", () => {
    expect(formatMoney(18.236)).toBe("¥18.24");
  });
});
