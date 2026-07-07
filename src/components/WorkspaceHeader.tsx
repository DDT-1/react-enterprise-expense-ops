import { LogOut } from "lucide-react";
import { roleLabels } from "../constants";
import type { User } from "../types";

interface WorkspaceHeaderProps {
  user: User;
  title: string;
  copy: string;
  onLogout: () => void;
}

export function WorkspaceHeader({
  user,
  title,
  copy,
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
        <button className="button" type="button" onClick={onLogout}>
          <LogOut size={16} aria-hidden="true" />
          退出
        </button>
      </div>
    </header>
  );
}
