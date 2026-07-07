import type { PaymentMethod, UserRole } from "./types";

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
