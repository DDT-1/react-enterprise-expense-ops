import { LogOut, RotateCcw } from "lucide-react";
import { roleLabels } from "../constants";
import type { User } from "../types";

interface WorkspaceHeaderProps {
  user: User;
  title: string;
  copy: string;
  canSeedDemoData: boolean;
  isSubmitting: boolean;
  onLoadSample: () => void;
  onLogout: () => void;
}

export function WorkspaceHeader({
  user,
  title,
  copy,
  canSeedDemoData,
  isSubmitting,
  onLoadSample,
  onLogout,
}: WorkspaceHeaderProps) {
  return (
    <header className="workspace-header">
      <div>
        <p className="eyebrow">{roleLabels[user.role]}工作台</p>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      <div className="header-actions">
        {canSeedDemoData ? (
          <button className="button" type="button" onClick={onLoadSample} disabled={isSubmitting}>
            <RotateCcw size={16} aria-hidden="true" />
            写入示例
          </button>
        ) : null}
        <button className="button" type="button" onClick={onLogout}>
          <LogOut size={16} aria-hidden="true" />
          退出
        </button>
      </div>
    </header>
  );
}
