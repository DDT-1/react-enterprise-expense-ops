import { FileCheck2, History, Plus, UsersRound, WalletCards } from "lucide-react";
import { roleLabels } from "../constants";
import type { User, UserRole } from "../types";

interface AppSidebarProps {
  user: User;
  currentRole: UserRole;
  canViewGlobal: boolean;
  roleWorkflowSteps: string[];
  onNavigate: (id: string) => void;
}

export function AppSidebar({ user, currentRole, canViewGlobal, roleWorkflowSteps, onNavigate }: AppSidebarProps) {
  const isEmployee = currentRole === "employee";
  const isFinance = currentRole === "finance";
  const isAdmin = currentRole === "admin";

  return (
    <aside className="workspace-sidebar">
      <div className="brand-block sidebar-brand">
        <span className="app-mark">EO</span>
        <div>
          <p className="eyebrow">企业费用管理</p>
          <h1>费用报销与预算审批平台</h1>
        </div>
      </div>

      <nav className="workspace-nav" aria-label="业务模块导航">
        {isEmployee ? (
          <button type="button" onClick={() => onNavigate("request-form")}>
            <Plus size={16} aria-hidden="true" />
            新建报销
          </button>
        ) : null}
        {isFinance ? (
          <button type="button" onClick={() => onNavigate("review-panel")}>
            <FileCheck2 size={16} aria-hidden="true" />
            待审队列
          </button>
        ) : null}
        {isAdmin ? (
          <button type="button" onClick={() => onNavigate("account-admin")}>
            <UsersRound size={16} aria-hidden="true" />
            账号权限
          </button>
        ) : null}
        <button type="button" onClick={() => onNavigate("budget-panel")}>
          <WalletCards size={16} aria-hidden="true" />
          {isFinance ? "预算控制" : isAdmin ? "全局概览" : "我的进度"}
        </button>
        <button type="button" onClick={() => onNavigate("request-list")}>
          <FileCheck2 size={16} aria-hidden="true" />
          {isEmployee ? "我的申请" : isFinance ? "审批台账" : "全局台账"}
        </button>
        {canViewGlobal ? (
          <button type="button" onClick={() => onNavigate("analysis-panel")}>
            <History size={16} aria-hidden="true" />
            费用分析
          </button>
        ) : null}
      </nav>

      <div className="sidebar-account">
        <span className="user-avatar">{user.username.slice(0, 1).toUpperCase()}</span>
        <div>
          <strong>{user.username}</strong>
          <p>{roleLabels[user.role]}</p>
        </div>
      </div>

      <div className="workflow-list" aria-label="业务流程">
        {roleWorkflowSteps.map((step) => (
          <span key={step}>{step}</span>
        ))}
      </div>
    </aside>
  );
}
