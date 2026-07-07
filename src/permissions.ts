import type { LedgerEntry, UserRole } from "./types";

export interface RolePermissions {
  canSubmitExpense: boolean;
  canReviewExpense: boolean;
  canViewGlobalLedger: boolean;
  canManageBudget: boolean;
  canManageUsers: boolean;
}

export const rolePermissions: Record<UserRole, RolePermissions> = {
  employee: {
    canSubmitExpense: true,
    canReviewExpense: false,
    canViewGlobalLedger: false,
    canManageBudget: false,
    canManageUsers: false,
  },
  finance: {
    canSubmitExpense: false,
    canReviewExpense: true,
    canViewGlobalLedger: true,
    canManageBudget: true,
    canManageUsers: false,
  },
  admin: {
    canSubmitExpense: false,
    canReviewExpense: false,
    canViewGlobalLedger: true,
    canManageBudget: false,
    canManageUsers: true,
  },
};

export function getRolePermissions(role: UserRole) {
  return rolePermissions[role];
}

export function getRoleGuide(role: UserRole) {
  if (role === "admin") {
    return {
      title: "管理员权限控制台",
      copy: "重点维护账号、角色和全局数据安全，关注谁能进入系统、谁能查看业务数据。",
    };
  }

  if (role === "finance") {
    return {
      title: "财务审批工作台",
      copy: "重点处理待审报销、控制预算占用，并把审批结果沉淀成可导出的业务台账。",
    };
  }

  return {
    title: "员工报销工作台",
    copy: "重点提交自己的报销申请，查看审核进度，补充票据和说明信息。",
  };
}

export function getRoleWorkflowSteps(role: UserRole) {
  if (role === "admin") return ["账号", "权限", "审计", "归档"];
  if (role === "finance") return ["待审", "核票", "预算", "入账"];
  return ["填单", "提交", "等审", "完成"];
}

export function canDeleteEntryByRole(role: UserRole, entry: LedgerEntry) {
  return role === "admin" || (role === "employee" && entry.status === "pending");
}
