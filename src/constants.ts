import type { LedgerEntry, PaymentMethod, UserRole } from "./types";

// 后端接口地址。默认对应 XAMPP 里的 htdocs/enterprise-expense-ops/api。
export const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1/enterprise-expense-ops/api";

export const defaultMonthBudget = 50000;

export const reimbursementCategories = [
  "差旅交通",
  "办公采购",
  "客户招待",
  "培训学习",
  "软件订阅",
  "行政杂费",
  "其他费用",
];

export const departmentOptions = ["研发部", "市场部", "运营部", "财务部", "人事行政"];

export const roleLabels: Record<UserRole, string> = {
  employee: "员工",
  finance: "财务",
  admin: "管理员",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  personal_pay: "个人垫付",
  company_card: "公司卡",
  bank_transfer: "银行转账",
  cash: "现金",
};

export const statusLabels = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
} as const;

// 演示数据：点击“写入业务示例”时，会通过接口保存到 MySQL。
export const sampleEntries: Array<Omit<LedgerEntry, "id">> = [
  {
    type: "expense",
    amount: 1280,
    category: "差旅交通",
    note: "上海客户拜访高铁与市内交通",
    date: "2026-06-03",
    department: "市场部",
    applicantName: "陈雨",
    receiptNo: "INV-20260603-001",
    paymentMethod: "personal_pay",
    status: "approved",
    rejectReason: "",
    reviewedAt: "2026-06-04 10:20:00",
  },
  {
    type: "expense",
    amount: 3600,
    category: "办公采购",
    note: "研发组显示器与键鼠采购",
    date: "2026-06-05",
    department: "研发部",
    applicantName: "林舟",
    receiptNo: "PO-DEV-20260605",
    paymentMethod: "company_card",
    status: "pending",
    rejectReason: "",
    reviewedAt: null,
  },
  {
    type: "expense",
    amount: 980,
    category: "软件订阅",
    note: "设计协作工具季度订阅",
    date: "2026-06-07",
    department: "运营部",
    applicantName: "周宁",
    receiptNo: "SUB-20260607-FIG",
    paymentMethod: "bank_transfer",
    status: "approved",
    rejectReason: "",
    reviewedAt: "2026-06-08 15:42:00",
  },
  {
    type: "expense",
    amount: 520,
    category: "客户招待",
    note: "报销说明缺少发票抬头",
    date: "2026-06-09",
    department: "市场部",
    applicantName: "许安",
    receiptNo: "",
    paymentMethod: "personal_pay",
    status: "rejected",
    rejectReason: "缺少合规发票信息",
    reviewedAt: "2026-06-10 09:18:00",
  },
];
