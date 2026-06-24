import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileCheck2,
  History,
  LogOut,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import {
  defaultMonthBudget,
  departmentOptions,
  paymentMethodLabels,
  reimbursementCategories,
  roleLabels,
  sampleEntries,
  statusLabels,
} from "./constants";
import { AppSidebar } from "./components/AppSidebar";
import { ReviewQueue } from "./components/ReviewQueue";
import { WorkspaceHeader } from "./components/WorkspaceHeader";
import {
  canDeleteEntryByRole,
  getRoleGuide,
  getRolePermissions,
  getRoleWorkflowSteps,
} from "./permissions";
import { getErrorMessage } from "./services/apiClient";
import { getCurrentUser, login, logout as logoutAccount, register } from "./services/authApi";
import { saveMonthBudget } from "./services/budgetApi";
import {
  clearExpenses,
  createExpense,
  deleteExpense,
  fetchLedger,
  seedExpenses,
  updateExpenseStatus,
} from "./services/expenseApi";
import { createManagedUser, fetchManagedUsers } from "./services/userApi";
import type {
  LedgerEntry,
  ManagedUser,
  PaymentMethod,
  RequestFilterStatus,
  RequestStatus,
  User,
  UserRole,
} from "./types";
import {
  evaluateAmountExpression,
  filterEntries,
  formatMoney,
  getApprovalActivities,
  getCategoryTotals,
  getDepartmentTotals,
  getStatusTone,
  getSummary,
} from "./utils/ledger";

const pageSize = 5;

type CardTone = "green" | "red" | "blue" | "amber";

interface OverviewCardConfig {
  icon: ReactNode;
  label: string;
  value: string;
  caption: string;
  tone: CardTone;
  onClick: () => void;
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [roleDraft, setRoleDraft] = useState<UserRole>("employee");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [monthBudget, setMonthBudget] = useState(defaultMonthBudget);
  const [budgetDraft, setBudgetDraft] = useState(String(defaultMonthBudget));
  const [entries, setEntries] = useState<LedgerEntry[]>([]);

  const [amountExpression, setAmountExpression] = useState("");
  const [category, setCategory] = useState(reimbursementCategories[0]);
  const [department, setDepartment] = useState(departmentOptions[0]);
  const [applicantName, setApplicantName] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("personal_pay");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());

  const [entryFilterStatus, setEntryFilterStatus] = useState<RequestFilterStatus>("all");
  const [entryKeyword, setEntryKeyword] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [entryDepartment, setEntryDepartment] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [accountUsername, setAccountUsername] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountRole, setAccountRole] = useState<UserRole>("employee");
  const [accountRoleFilter, setAccountRoleFilter] = useState<UserRole | "all">("all");

  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [apiError, setApiError] = useState("");
  const [toast, setToast] = useState("");

  const calculatedAmount = useMemo(() => evaluateAmountExpression(amountExpression), [amountExpression]);
  const summary = useMemo(() => getSummary(entries, monthBudget), [entries, monthBudget]);
  const categoryTotals = useMemo(() => getCategoryTotals(entries), [entries]);
  const departmentTotals = useMemo(() => getDepartmentTotals(entries), [entries]);
  const approvalActivities = useMemo(() => getApprovalActivities(entries), [entries]);
  const pendingEntries = useMemo(() => entries.filter((entry) => entry.status === "pending"), [entries]);
  const reviewQueue = useMemo(() => pendingEntries.slice(0, 4), [pendingEntries]);
  const filteredEntries = useMemo(
    () =>
      filterEntries(entries, {
        status: entryFilterStatus,
        keyword: entryKeyword,
        date: entryDate,
        department: entryDepartment,
      }),
    [entries, entryFilterStatus, entryKeyword, entryDate, entryDepartment],
  );
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const pagedEntries = useMemo(
    () => filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredEntries, currentPage],
  );
  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [entries, selectedEntryId],
  );
  const filteredManagedUsers = useMemo(
    () => managedUsers.filter((item) => accountRoleFilter === "all" || item.role === accountRoleFilter),
    [managedUsers, accountRoleFilter],
  );

  const currentRole = user?.role ?? "employee";
  const isEmployee = currentRole === "employee";
  const isFinance = currentRole === "finance";
  const isAdmin = currentRole === "admin";
  const permissions = getRolePermissions(currentRole);
  const canReview = permissions.canReviewExpense;
  const canViewGlobal = permissions.canViewGlobalLedger;
  const canManageUsers = permissions.canManageUsers;
  const roleGuide = getRoleGuide(currentRole);
  const roleWorkflowSteps = getRoleWorkflowSteps(currentRole);
  const overviewCards: OverviewCardConfig[] = isAdmin
    ? [
        {
          icon: <UsersRound size={18} />,
          label: "系统账号",
          value: `${managedUsers.length} 个`,
          caption: "员工 / 财务 / 管理员",
          tone: "blue",
          onClick: () => scrollToSection("account-admin"),
        },
        {
          icon: <Clock3 size={18} />,
          label: "待审单据",
          value: `${summary.pendingCount} 条`,
          caption: formatMoney(summary.pendingExpense),
          tone: "amber",
          onClick: () => focusRequestList("pending"),
        },
        {
          icon: <FileCheck2 size={18} />,
          label: "全局台账",
          value: `${entries.length} 条`,
          caption: "用于权限审计和数据排查",
          tone: "green",
          onClick: () => focusRequestList("all"),
        },
        {
          icon: <WalletCards size={18} />,
          label: "预算剩余",
          value: formatMoney(summary.availableBudget),
          caption: `预算 ${formatMoney(summary.allocatedBudget)}`,
          tone: "blue",
          onClick: () => scrollToSection("budget-panel"),
        },
      ]
    : isFinance
      ? [
          {
            icon: <Clock3 size={18} />,
            label: "待处理",
            value: `${summary.pendingCount} 条`,
            caption: formatMoney(summary.pendingExpense),
            tone: "amber",
            onClick: () => scrollToSection("review-panel"),
          },
          {
            icon: <BadgeCheck size={18} />,
            label: "已通过",
            value: `${summary.approvedCount} 条`,
            caption: formatMoney(summary.approvedExpense),
            tone: "green",
            onClick: () => focusRequestList("approved"),
          },
          {
            icon: <XCircle size={18} />,
            label: "已驳回",
            value: `${summary.rejectedCount} 条`,
            caption: formatMoney(summary.rejectedExpense),
            tone: "red",
            onClick: () => focusRequestList("rejected"),
          },
          {
            icon: <WalletCards size={18} />,
            label: "预算剩余",
            value: formatMoney(summary.availableBudget),
            caption: `已用 ${summary.budgetPercent}%`,
            tone: "blue",
            onClick: () => scrollToSection("budget-panel"),
          },
        ]
      : [
          {
            icon: <Clock3 size={18} />,
            label: "我的待审",
            value: `${summary.pendingCount} 条`,
            caption: formatMoney(summary.pendingExpense),
            tone: "amber",
            onClick: () => focusRequestList("pending"),
          },
          {
            icon: <BadgeCheck size={18} />,
            label: "已通过",
            value: `${summary.approvedCount} 条`,
            caption: formatMoney(summary.approvedExpense),
            tone: "green",
            onClick: () => focusRequestList("approved"),
          },
          {
            icon: <XCircle size={18} />,
            label: "被驳回",
            value: `${summary.rejectedCount} 条`,
            caption: "可按原因重新提交",
            tone: "red",
            onClick: () => focusRequestList("rejected"),
          },
          {
            icon: <FileCheck2 size={18} />,
            label: "我的申请",
            value: `${entries.length} 条`,
            caption: "只展示当前账号数据",
            tone: "blue",
            onClick: () => focusRequestList("all"),
          },
        ];

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [entryFilterStatus, entryKeyword, entryDate, entryDepartment]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  async function checkSession() {
    setIsCheckingSession(true);
    try {
      const data = await getCurrentUser();
      setUser(data.user);
      if (data.user) {
        setApplicantName(data.user.username);
        await loadLedger();
        if (data.user.role === "admin") {
          await loadUsers();
        }
      }
      setApiError("");
    } catch (error) {
      setApiError(getErrorMessage(error));
    } finally {
      setIsCheckingSession(false);
    }
  }

  async function loadLedger() {
    setIsLoadingLedger(true);
    try {
      const data = await fetchLedger();
      setMonthBudget(data.monthBudget);
      setBudgetDraft(String(data.monthBudget));
      setEntries(data.entries);
      setApiError("");
    } catch (error) {
      setApiError(getErrorMessage(error));
    } finally {
      setIsLoadingLedger(false);
    }
  }

  async function loadUsers() {
    try {
      const data = await fetchManagedUsers();
      setManagedUsers(data.users);
      setApiError("");
    } catch (error) {
      setApiError(getErrorMessage(error));
    }
  }

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  function appendAmountToken(token: string) {
    setAmountExpression((current) => `${current}${token}`);
  }

  function backspaceAmount() {
    setAmountExpression((current) => current.slice(0, -1));
  }

  function clearAmount() {
    setAmountExpression("");
  }

  function applyCalculatedAmount() {
    if (!calculatedAmount) {
      notify("先输入能计算的金额");
      return;
    }
    setAmountExpression(String(calculatedAmount));
    setIsCalculatorOpen(false);
  }

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const data =
        authMode === "login"
          ? await login({ username, password })
          : await register({ username, password, role: roleDraft, inviteCode });
      setUser(data.user);
      setApplicantName(data.user.username);
      setPassword("");
      setInviteCode("");
      await loadLedger();
      if (data.user.role === "admin") {
        await loadUsers();
      }
      notify(authMode === "login" ? "登录成功" : "注册成功");
    } catch (error) {
      setApiError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function logout() {
    await logoutAccount();
    setUser(null);
    setEntries([]);
    setManagedUsers([]);
    setUsername("");
    setPassword("");
    notify("已退出登录");
  }

  async function addEntry(event: FormEvent) {
    event.preventDefault();
    if (!calculatedAmount || calculatedAmount <= 0) {
      notify("金额可以填数字，也可以填 128+32*2 这种算式");
      return;
    }

    setIsSubmitting(true);
    try {
      await createExpense({
        type: "expense",
        amount: calculatedAmount,
        category,
        note: note.trim() || `${category}报销申请`,
        date,
        department,
        applicantName: applicantName.trim() || user?.username || "未命名申请人",
        receiptNo: receiptNo.trim(),
        paymentMethod,
        status: "pending",
        rejectReason: "",
      });
      setAmountExpression("");
      setNote("");
      setReceiptNo("");
      await loadLedger();
      notify("报销申请已提交，等待财务审核");
    } catch (error) {
      setApiError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function reviewEntry(id: number, status: RequestStatus) {
    const rejectReason =
      status === "rejected" ? window.prompt("请输入驳回原因", "票据信息不完整")?.trim() || "票据信息不完整" : "";

    await updateExpenseStatus(id, status, rejectReason);
    await loadLedger();
    notify(status === "approved" ? "申请已通过" : "申请已驳回");
  }

  async function deleteEntry(id: number) {
    await deleteExpense(id);
    setEntries((current) => current.filter((entry) => entry.id !== id));
    setSelectedEntryId((current) => (current === id ? null : current));
  }

  async function withdrawEntry(id: number) {
    await deleteEntry(id);
    notify("待审申请已撤回");
  }

  function canDeleteEntry(entry: LedgerEntry) {
    return canDeleteEntryByRole(currentRole, entry);
  }

  async function clearEntries() {
    await clearExpenses();
    setEntries([]);
    setSelectedEntryId(null);
    notify(canViewGlobal ? "已清空全部业务数据" : "已清空我的申请");
  }

  async function saveBudget() {
    const value = Number(budgetDraft);
    if (!Number.isFinite(value) || value <= 0) {
      notify("部门预算要大于 0");
      return;
    }

    const data = await saveMonthBudget(value);
    setMonthBudget(data.monthBudget);
    setBudgetDraft(String(data.monthBudget));
    notify("部门预算已保存");
  }

  async function createManagedAccount(event: FormEvent) {
    event.preventDefault();
    setIsCreatingAccount(true);
    try {
      await createManagedUser({
        username: accountUsername,
        password: accountPassword,
        role: accountRole,
      });
      setAccountUsername("");
      setAccountPassword("");
      setAccountRole("employee");
      await loadUsers();
      notify("账号已创建");
    } catch (error) {
      setApiError(getErrorMessage(error));
    } finally {
      setIsCreatingAccount(false);
    }
  }

  async function loadSample() {
    setIsSubmitting(true);
    try {
      await clearEntries();
      await seedExpenses(sampleEntries);
      await loadLedger();
      notify("业务示例已写入数据库");
    } catch (error) {
      setApiError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function exportFilteredEntries() {
    const headers = ["申请人", "部门", "分类", "金额", "日期", "票据编号", "支付方式", "状态", "说明", "驳回原因"];
    const rows = filteredEntries.map((entry) => [
      entry.applicantName,
      entry.department,
      entry.category,
      entry.amount.toFixed(2),
      entry.date,
      entry.receiptNo || "-",
      paymentMethodLabels[entry.paymentMethod],
      statusLabels[entry.status],
      entry.note,
      entry.rejectReason || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expense-requests-${todayISO()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify("当前筛选结果已导出");
  }

  function focusRequestList(status: RequestFilterStatus) {
    setEntryFilterStatus(status);
    setEntryKeyword("");
    setEntryDate("");
    setEntryDepartment("");
    window.setTimeout(() => document.getElementById("request-list")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (isCheckingSession) {
    return (
      <div className="loading-screen">
        <WalletCards size={28} aria-hidden="true" />
        <p>正在连接企业预算接口...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        authMode={authMode}
        roleDraft={roleDraft}
        username={username}
        password={password}
        inviteCode={inviteCode}
        apiError={apiError}
        isSubmitting={isSubmitting}
        onModeChange={setAuthMode}
        onRoleChange={setRoleDraft}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onInviteCodeChange={setInviteCode}
        onSubmit={submitAuth}
      />
    );
  }

  return (
    <div className="app-shell">
      <AppSidebar
        user={user}
        currentRole={currentRole}
        canViewGlobal={canViewGlobal}
        roleWorkflowSteps={roleWorkflowSteps}
        onNavigate={scrollToSection}
      />

      <div className="workspace-main">
        <WorkspaceHeader
          user={user}
          title={roleGuide.title}
          copy={roleGuide.copy}
          canSeedDemoData={permissions.canSeedDemoData}
          isSubmitting={isSubmitting}
          onLoadSample={loadSample}
          onLogout={logout}
        />

        <section className="overview-grid" aria-label="报销概览">
          {overviewCards.map((card) => (
            <OverviewCard
              icon={card.icon}
              label={card.label}
              value={card.value}
              caption={card.caption}
              tone={card.tone}
              onClick={card.onClick}
              key={card.label}
            />
          ))}
        </section>

        {apiError ? <Notice>{apiError}</Notice> : null}

        <main className={`layout role-${currentRole}`}>
        {isEmployee ? (
        <section className="panel entry-panel" id="request-form">
          <div className="section-head">
            <div>
              <p className="eyebrow">报销录入</p>
              <h2>新建报销申请</h2>
            </div>
            <span className="save-pill">提交后状态为待审核</span>
          </div>

          <form className="entry-form" onSubmit={addEntry}>
            <div className="form-grid">
              <label className="field">
                <span>申请人</span>
                <input value={applicantName} placeholder={user.username} onChange={(event) => setApplicantName(event.target.value)} />
              </label>
              <label className="field">
                <span>所属部门</span>
                <select value={department} onChange={(event) => setDepartment(event.target.value)}>
                  {departmentOptions.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>票据编号</span>
                <input value={receiptNo} placeholder="例如 INV-202606-001" onChange={(event) => setReceiptNo(event.target.value)} />
              </label>
              <label className="field">
                <span>支付方式</span>
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
                  {Object.entries(paymentMethodLabels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="amount-box">
              <div className="amount-field-row">
                <label className="field">
                  <span>报销金额 / 算式</span>
                  <input
                    value={amountExpression}
                    inputMode="decimal"
                    placeholder="例如 1280 或 900+180*2"
                    onChange={(event) => setAmountExpression(event.target.value)}
                  />
                </label>
                <button className="button compact" type="button" onClick={() => setIsCalculatorOpen((open) => !open)}>
                  <Calculator size={15} aria-hidden="true" />
                  计算器
                </button>
              </div>

              <div className={`calc-result ${amountExpression && !calculatedAmount ? "is-error" : ""}`}>
                <Calculator size={15} aria-hidden="true" />
                {amountExpression
                  ? calculatedAmount
                    ? `计算结果：${formatMoney(calculatedAmount)}`
                    : "算式格式不对，支持 + - * / 和括号"
                  : "可直接输入金额，也可以打开计算器"}
              </div>

              {isCalculatorOpen ? (
                <div className="calculator-popover">
                  <div className="calculator-head">
                    <strong>金额计算器</strong>
                    <button className="icon-button" type="button" onClick={() => setIsCalculatorOpen(false)} aria-label="关闭计算器">
                      <XCircle size={15} aria-hidden="true" />
                    </button>
                  </div>
                  <CalculatorPad
                    onInput={appendAmountToken}
                    onBackspace={backspaceAmount}
                    onClear={clearAmount}
                    onApply={applyCalculatedAmount}
                  />
                </div>
              ) : null}
            </div>

            <div className="form-grid">
              <label className="field">
                <span>费用分类</span>
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  {reimbursementCategories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>发生日期</span>
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              </label>
            </div>

            <label className="field">
              <span>报销说明</span>
              <input value={note} placeholder="例如：杭州客户拜访高铁票" onChange={(event) => setNote(event.target.value)} />
            </label>

            <button className="button primary full" type="submit" disabled={isSubmitting}>
              <Plus size={16} aria-hidden="true" />
              提交报销申请
            </button>
          </form>
        </section>
        ) : null}

        {isFinance ? (
          <ReviewQueue
            summary={summary}
            entries={reviewQueue}
            onOpenDetail={setSelectedEntryId}
            onReview={reviewEntry}
          />
        ) : null}

        <section className="panel summary-panel" id="budget-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">{isFinance ? "预算控制" : isAdmin ? "系统概览" : "我的进度"}</p>
              <h2>{isFinance ? "部门预算看板" : isAdmin ? "权限与数据概览" : "我的报销进度"}</h2>
            </div>
          </div>

          {isFinance ? (
            <>
              <div className="budget-edit">
                <label className="budget-field">
                  <span>部门月预算</span>
                  <input value={budgetDraft} inputMode="numeric" onChange={(event) => setBudgetDraft(event.target.value)} />
                </label>
                <button className="button" type="button" onClick={saveBudget}>
                  <Save size={16} aria-hidden="true" />
                  保存预算
                </button>
              </div>

              <div className="stat-grid">
                <StatCard icon={<BadgeCheck size={18} />} label="已通过支出" value={formatMoney(summary.approvedExpense)} tone="green" />
                <StatCard icon={<Clock3 size={18} />} label="待审核金额" value={formatMoney(summary.pendingExpense)} tone="amber" />
                <StatCard icon={<WalletCards size={18} />} label="可用预算" value={formatMoney(summary.availableBudget)} tone="blue" />
              </div>

              <div className="budget-card">
                <div>
                  <span>预算使用进度</span>
                  <strong>{summary.budgetPercent}%</strong>
                </div>
                <div className="progress-bar" aria-label={`预算使用 ${summary.budgetPercent}%`}>
                  <i style={{ width: `${summary.budgetPercent}%` }} />
                </div>
                {summary.availableBudget < 0 ? (
                  <p className="warning">
                    <AlertCircle size={15} aria-hidden="true" />
                    已通过报销超过部门预算，需要复核后续申请。
                  </p>
                ) : (
                  <p>只有审核通过的申请会占用预算，待审核金额用于财务排队处理。</p>
                )}
              </div>
            </>
          ) : isAdmin ? (
            <>
              <div className="stat-grid">
                <StatCard icon={<UsersRound size={18} />} label="账号数量" value={`${managedUsers.length} 个`} tone="blue" />
                <StatCard icon={<FileCheck2 size={18} />} label="全局单据" value={`${entries.length} 条`} tone="green" />
                <StatCard icon={<Clock3 size={18} />} label="待审单据" value={`${summary.pendingCount} 条`} tone="amber" />
              </div>

              <div className="budget-card employee-note">
                <div>
                  <span>管理员职责</span>
                  <strong>账号、权限和数据审计优先</strong>
                </div>
                <p>管理员端主要维护谁能使用系统、各角色能做什么，并查看全局台账；预算维护和日常审批交给财务端处理。</p>
              </div>
            </>
          ) : (
            <>
              <div className="stat-grid">
                <StatCard icon={<Clock3 size={18} />} label="待审核" value={`${summary.pendingCount} 条`} tone="amber" />
                <StatCard icon={<BadgeCheck size={18} />} label="已通过" value={`${summary.approvedCount} 条`} tone="green" />
                <StatCard icon={<XCircle size={18} />} label="已驳回" value={`${summary.rejectedCount} 条`} tone="red" />
              </div>

              <div className="budget-card employee-note">
                <div>
                  <span>员工端权限</span>
                  <strong>{summary.pendingCount ? "等待财务处理" : "暂无待处理申请"}</strong>
                </div>
                <p>员工端只负责提交申请和查看进度；部门预算由财务端维护，审核通过后才会计入预算。</p>
              </div>
            </>
          )}
        </section>

        <section className="panel list-panel" id="request-list">
          <div className="section-head">
            <div>
              <p className="eyebrow">{isEmployee ? "我的申请" : isFinance ? "审批台账" : "全局台账"}</p>
              <h2>{isEmployee ? "我的报销申请" : isFinance ? "报销审批列表" : "全平台报销记录"}</h2>
            </div>
            <div className="section-actions">
              <span>{isLoadingLedger ? "加载中..." : `${filteredEntries.length} / ${entries.length} 条`}</span>
              {isAdmin ? (
                <button className="button compact danger" type="button" onClick={clearEntries}>
                  清空全局
                </button>
              ) : null}
              <button className="button compact" type="button" onClick={exportFilteredEntries} disabled={!filteredEntries.length}>
                <Download size={15} aria-hidden="true" />
                导出
              </button>
            </div>
          </div>

          <div className="entry-filters">
            <div className="filter-tabs" role="group" aria-label="按审核状态筛选申请">
              {[
                ["all", "全部"],
                ["pending", "待审核"],
                ["approved", "已通过"],
                ["rejected", "已驳回"],
              ].map(([value, label]) => (
                <button
                  className={entryFilterStatus === value ? "is-active" : ""}
                  type="button"
                  key={value}
                  onClick={() => setEntryFilterStatus(value as RequestFilterStatus)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="filter-field">
              <span>关键词</span>
              <input
                value={entryKeyword}
                placeholder={canViewGlobal ? "搜申请人、部门、分类或说明" : "搜分类、说明、票据或金额"}
                onChange={(event) => setEntryKeyword(event.target.value)}
              />
            </label>
            {canViewGlobal ? (
              <label className="filter-field">
                <span>部门</span>
                <select value={entryDepartment} onChange={(event) => setEntryDepartment(event.target.value)}>
                  <option value="">全部部门</option>
                  {departmentOptions.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="filter-field">
              <span>日期</span>
              <input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} />
            </label>
            <button
              className="button"
              type="button"
              onClick={() => {
                setEntryFilterStatus("all");
                setEntryKeyword("");
                setEntryDate("");
                setEntryDepartment("");
              }}
            >
              重置筛选
            </button>
          </div>

          {filteredEntries.length ? (
            <>
              <div className="entry-list">
                {pagedEntries.map((entry) => (
                  <article className={`entry-row ${selectedEntryId === entry.id ? "is-selected" : ""}`} key={entry.id}>
                    <div className={`entry-dot ${entry.status}`} />
                    <div className="entry-main">
                      <div className="entry-title-line">
                        <strong>{entry.note}</strong>
                        <StatusBadge status={entry.status} />
                      </div>
                      <p>
                        {entry.applicantName} · {entry.department} · {entry.category} · {entry.date}
                      </p>
                      <p>
                        票据：{entry.receiptNo || "未填写"} · 支付方式：{paymentMethodLabels[entry.paymentMethod]}
                      </p>
                      {entry.status === "rejected" && entry.rejectReason ? <p className="reject-text">驳回原因：{entry.rejectReason}</p> : null}
                    </div>
                    <span className="amount-text">{formatMoney(entry.amount)}</span>
                    <div className="row-actions">
                      <button className="mini-button" type="button" onClick={() => setSelectedEntryId(entry.id)}>
                        详情
                      </button>
                      {canReview && entry.status === "pending" ? (
                        <>
                          <button className="mini-button approve" type="button" onClick={() => reviewEntry(entry.id, "approved")}>
                            通过
                          </button>
                          <button className="mini-button reject" type="button" onClick={() => reviewEntry(entry.id, "rejected")}>
                            驳回
                          </button>
                        </>
                      ) : null}
                      {canDeleteEntry(entry) ? (
                        isEmployee && entry.status === "pending" ? (
                          <button className="mini-button" type="button" onClick={() => withdrawEntry(entry.id)}>
                            撤回
                          </button>
                        ) : (
                          <button className="icon-button" type="button" onClick={() => deleteEntry(entry.id)} aria-label="删除这条申请">
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        )
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
              <div className="pagination">
                <button className="button compact" type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
                  <ChevronLeft size={15} aria-hidden="true" />
                  上一页
                </button>
                <span>
                  第 {currentPage} / {totalPages} 页
                </span>
                <button
                  className="button compact"
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                >
                  下一页
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>{entries.length ? "没有找到符合条件的申请，可以换个状态、部门或关键词。" : "还没有报销申请。先提交一笔差旅或办公采购申请。"}</p>
            </div>
          )}
        </section>

        {canViewGlobal ? (
        <section className="panel chart-panel" id="analysis-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">费用分析</p>
              <h2>费用分析与审批记录</h2>
            </div>
          </div>

          <div className="analysis-grid">
            <div className="analysis-block">
              <h3>已通过费用分类</h3>
              <div className="category-list">
                {categoryTotals.map((item) => (
                  <div className={`category-row ${item.total === 0 ? "is-zero" : ""}`} key={item.category}>
                    <div>
                      <span>{item.category}</span>
                      <strong>{formatMoney(item.total)}</strong>
                    </div>
                    <div className="category-bar">
                      <i style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="analysis-block">
              <h3>部门费用占比</h3>
              {departmentTotals.length ? (
                <div className="category-list">
                  {departmentTotals.map((item) => (
                    <div className="category-row" key={item.department}>
                      <div>
                        <span>
                          {item.department} · {item.count} 笔
                        </span>
                        <strong>{formatMoney(item.total)}</strong>
                      </div>
                      <div className="category-bar">
                        <i style={{ width: `${item.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state compact">
                  <p>暂无已通过申请。</p>
                </div>
              )}
            </div>
          </div>

          <div className="approval-timeline">
            <div className="timeline-head">
              <History size={16} aria-hidden="true" />
              <h3>最近审批记录</h3>
            </div>
            {approvalActivities.length ? (
              <div className="timeline-list">
                {approvalActivities.map((activity) => (
                  <article className="timeline-item" key={activity.id}>
                    <StatusBadge status={activity.status} />
                    <div>
                      <strong>{activity.note}</strong>
                      <p>
                        {activity.applicantName} · {activity.department} · {activity.reviewedAt || "未记录时间"}
                      </p>
                      {activity.rejectReason ? <p className="reject-text">驳回原因：{activity.rejectReason}</p> : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state compact">
                <p>暂无审批记录。</p>
              </div>
            )}
          </div>
        </section>
        ) : null}

        {canManageUsers ? (
          <section className="panel admin-panel" id="account-admin">
            <div className="section-head">
              <div>
                <p className="eyebrow">系统权限</p>
                <h2>账号与角色管理</h2>
              </div>
              <button className="button compact" type="button" onClick={loadUsers}>
                刷新账号
              </button>
            </div>

            <div className="permission-grid">
              <div className="permission-card">
                <ShieldCheck size={18} aria-hidden="true" />
                <strong>角色权限</strong>
                <p>员工只能提交和查看自己的申请；财务可以审核和维护预算；管理员可以管理账号并查看全平台数据。</p>
              </div>
              <div className="permission-card">
                <UsersRound size={18} aria-hidden="true" />
                <strong>创建账号</strong>
                <p>正式流程由管理员创建员工或财务账号，避免任何人直接注册成财务。</p>
              </div>
            </div>

            <form className="account-form" onSubmit={createManagedAccount}>
              <label className="field">
                <span>用户名</span>
                <input value={accountUsername} placeholder="例如 finance01" onChange={(event) => setAccountUsername(event.target.value)} />
              </label>
              <label className="field">
                <span>初始密码</span>
                <input
                  type="password"
                  value={accountPassword}
                  placeholder="至少 6 位"
                  onChange={(event) => setAccountPassword(event.target.value)}
                />
              </label>
              <label className="field">
                <span>角色</span>
                <select value={accountRole} onChange={(event) => setAccountRole(event.target.value as UserRole)}>
                  {(["employee", "finance", "admin"] as const).map((role) => (
                    <option value={role} key={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button primary" type="submit" disabled={isCreatingAccount}>
                <Plus size={16} aria-hidden="true" />
                创建账号
              </button>
            </form>

            <div className="account-toolbar">
              <span>账号筛选</span>
              <div className="role-switch compact" role="group" aria-label="按账号角色筛选">
                {(["all", "employee", "finance", "admin"] as const).map((role) => (
                  <button
                    className={accountRoleFilter === role ? "is-active" : ""}
                    type="button"
                    key={role}
                    onClick={() => setAccountRoleFilter(role)}
                  >
                    {role === "all" ? "全部" : roleLabels[role]}
                  </button>
                ))}
              </div>
            </div>

            <div className="user-list">
              {filteredManagedUsers.length ? (
                filteredManagedUsers.map((item) => (
                  <article className="user-row" key={item.id}>
                    <span className="user-avatar">{item.username.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>{item.username}</strong>
                      <p>创建时间：{item.createdAt || "未记录"}</p>
                    </div>
                    <span className={`role-badge ${item.role}`}>{roleLabels[item.role]}</span>
                  </article>
                ))
              ) : (
                <div className="empty-state compact">
                  <p>{managedUsers.length ? "当前角色下暂无账号，可以切换筛选条件。" : "暂无账号数据，点击“刷新账号”重新获取。"}</p>
                </div>
              )}
            </div>
          </section>
        ) : null}
        </main>
      </div>

      {selectedEntry ? (
        <EntryDetailDrawer
          entry={selectedEntry}
          canReview={canReview}
          canDelete={canDeleteEntry(selectedEntry)}
          deleteLabel={isEmployee && selectedEntry.status === "pending" ? "撤回申请" : "删除单据"}
          onClose={() => setSelectedEntryId(null)}
          onReview={reviewEntry}
          onDelete={isEmployee && selectedEntry.status === "pending" ? withdrawEntry : deleteEntry}
        />
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

function AuthScreen({
  authMode,
  roleDraft,
  username,
  password,
  inviteCode,
  apiError,
  isSubmitting,
  onModeChange,
  onRoleChange,
  onUsernameChange,
  onPasswordChange,
  onInviteCodeChange,
  onSubmit,
}: {
  authMode: "login" | "register";
  roleDraft: UserRole;
  username: string;
  password: string;
  inviteCode: string;
  apiError: string;
  isSubmitting: boolean;
  onModeChange: (mode: "login" | "register") => void;
  onRoleChange: (role: UserRole) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onInviteCodeChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="auth-intro">
          <div className="brand-block">
            <span className="app-mark">EO</span>
            <div>
              <p className="eyebrow">企业费用管理</p>
              <h1>费用报销与预算审批平台</h1>
            </div>
          </div>
          <p>一个模拟真实公司费用流转的内部平台：员工提交报销，财务审核预算，管理员维护账号和角色权限。</p>

          <div className="role-cards">
            <button
              className={`role-card ${roleDraft === "employee" ? "is-active" : ""}`}
              type="button"
              onClick={() => {
                onModeChange("register");
                onRoleChange("employee");
              }}
            >
              <UserRound size={20} aria-hidden="true" />
              <strong>员工账号</strong>
              <span>使用企业邀请码注册，提交报销并查看进度</span>
            </button>
            <button
              className={`role-card ${roleDraft === "finance" ? "is-active" : ""}`}
              type="button"
              onClick={() => {
                onModeChange("register");
                onRoleChange("finance");
              }}
            >
              <Building2 size={20} aria-hidden="true" />
              <strong>财务账号</strong>
              <span>需要财务邀请码，审核报销和维护预算</span>
            </button>
            <button
              className={`role-card ${roleDraft === "admin" ? "is-active" : ""}`}
              type="button"
              onClick={() => {
                onModeChange("register");
                onRoleChange("admin");
              }}
            >
              <ShieldCheck size={20} aria-hidden="true" />
              <strong>管理员账号</strong>
              <span>需要管理员邀请码，创建账号并管理角色</span>
            </button>
          </div>
        </div>

        <section className="auth-card">
          <div className="auth-card-head">
            <div>
              <p className="eyebrow">{authMode === "login" ? "账号登录" : "创建账号"}</p>
              <h2>{authMode === "login" ? "登录系统" : `注册${roleLabels[roleDraft]}账号`}</h2>
            </div>
            <button className="button compact" type="button" onClick={() => onModeChange(authMode === "login" ? "register" : "login")}>
              {authMode === "login" ? "去注册" : "去登录"}
            </button>
          </div>

          {apiError ? <Notice>{apiError}</Notice> : null}

          <form className="auth-form" onSubmit={onSubmit}>
            <div className="type-switch" role="group" aria-label="登录或注册">
              <button className={authMode === "login" ? "is-active" : ""} type="button" onClick={() => onModeChange("login")}>
                登录
              </button>
              <button className={authMode === "register" ? "is-active" : ""} type="button" onClick={() => onModeChange("register")}>
                注册
              </button>
            </div>

            {authMode === "register" ? (
              <div className="role-switch" role="group" aria-label="选择账号角色">
                {(["employee", "finance", "admin"] as const).map((role) => (
                  <button className={roleDraft === role ? "is-active" : ""} type="button" key={role} onClick={() => onRoleChange(role)}>
                    {roleLabels[role]}
                  </button>
                ))}
              </div>
            ) : null}

            <label className="field">
              <span>用户名</span>
              <input value={username} placeholder="例如 zhangsan" onChange={(event) => onUsernameChange(event.target.value)} />
            </label>
            <label className="field">
              <span>密码</span>
              <input type="password" value={password} placeholder="至少 6 位" onChange={(event) => onPasswordChange(event.target.value)} />
            </label>

            {authMode === "register" ? (
              <label className="field">
                <span>{roleDraft === "finance" ? "财务邀请码" : roleDraft === "admin" ? "管理员邀请码" : "企业邀请码"}</span>
                <input
                  value={inviteCode}
                  placeholder={
                    roleDraft === "finance" ? "演示：FINANCE2026" : roleDraft === "admin" ? "演示：ADMIN2026" : "演示：EMPLOYEE2026"
                  }
                  onChange={(event) => onInviteCodeChange(event.target.value)}
                />
              </label>
            ) : null}

            <button className="button primary full" type="submit" disabled={isSubmitting}>
              {authMode === "login" ? "登录并进入工作台" : `创建${roleLabels[roleDraft]}账号`}
            </button>
          </form>

          <div className="setup-note">
            <strong>第一次运行提示</strong>
            <span>先在 XAMPP 启动 Apache 和 MySQL，并在 phpMyAdmin 导入 database/schema.sql。演示邀请码：EMPLOYEE2026 / FINANCE2026 / ADMIN2026。</span>
          </div>
        </section>
      </section>
    </main>
  );
}

function CalculatorPad({
  onInput,
  onBackspace,
  onClear,
  onApply,
}: {
  onInput: (token: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onApply: () => void;
}) {
  const buttons = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "0", ".", "+", "="];

  return (
    <div className="calculator-pad" aria-label="金额小计算器">
      {buttons.map((button) => (
        <button
          className={`${["+", "-", "×", "÷"].includes(button) ? "operator" : ""} ${button === "=" ? "equals" : ""}`}
          type="button"
          key={button}
          onClick={() => (button === "=" ? onApply() : onInput(button))}
        >
          {button}
        </button>
      ))}
      <button className="utility" type="button" onClick={() => onInput("(")}>
        (
      </button>
      <button className="utility" type="button" onClick={() => onInput(")")}>
        )
      </button>
      <button className="utility" type="button" onClick={onBackspace}>
        退格
      </button>
      <button className="utility danger" type="button" onClick={onClear}>
        清空
      </button>
    </div>
  );
}

function OverviewCard({
  icon,
  label,
  value,
  caption,
  tone,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  caption: string;
  tone: "green" | "red" | "blue" | "amber";
  onClick: () => void;
}) {
  return (
    <button className={`overview-card ${tone}`} type="button" onClick={onClick}>
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{caption}</small>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const icon = {
    pending: <Clock3 size={13} aria-hidden="true" />,
    approved: <FileCheck2 size={13} aria-hidden="true" />,
    rejected: <XCircle size={13} aria-hidden="true" />,
  }[status];

  return (
    <span className={`status-badge ${getStatusTone(status)}`}>
      {icon}
      {statusLabels[status]}
    </span>
  );
}

function EntryDetailDrawer({
  entry,
  canReview,
  canDelete,
  deleteLabel,
  onClose,
  onReview,
  onDelete,
}: {
  entry: LedgerEntry;
  canReview: boolean;
  canDelete: boolean;
  deleteLabel: string;
  onClose: () => void;
  onReview: (id: number, status: RequestStatus) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  return (
    <div className="detail-backdrop" role="presentation" onClick={onClose}>
      <aside className="detail-drawer" aria-label="报销单详情" onClick={(event) => event.stopPropagation()}>
        <div className="detail-head">
          <div>
            <p className="eyebrow">单据详情</p>
            <h2>{entry.note}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭详情">
            <XCircle size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="detail-amount">
          <span>申请金额</span>
          <strong>{formatMoney(entry.amount)}</strong>
          <StatusBadge status={entry.status} />
        </div>

        <div className="detail-grid">
          <DetailItem label="申请人" value={entry.applicantName} />
          <DetailItem label="所属部门" value={entry.department} />
          <DetailItem label="费用分类" value={entry.category} />
          <DetailItem label="发生日期" value={entry.date} />
          <DetailItem label="票据编号" value={entry.receiptNo || "未填写"} />
          <DetailItem label="支付方式" value={paymentMethodLabels[entry.paymentMethod]} />
        </div>

        <div className="detail-section">
          <h3>审批进度</h3>
          <div className="detail-timeline">
            <div>
              <span className="timeline-dot done" />
              <p>申请已提交</p>
            </div>
            <div>
              <span className={`timeline-dot ${entry.status === "pending" ? "" : "done"}`} />
              <p>
                {entry.status === "pending"
                  ? "等待财务审核"
                  : `${statusLabels[entry.status]}${entry.reviewedAt ? ` · ${entry.reviewedAt}` : ""}`}
              </p>
            </div>
          </div>
          {entry.status === "rejected" && entry.rejectReason ? <p className="reject-text">驳回原因：{entry.rejectReason}</p> : null}
        </div>

        <div className="detail-actions">
          {canReview && entry.status === "pending" ? (
            <>
              <button className="button primary" type="button" onClick={() => onReview(entry.id, "approved")}>
                通过申请
              </button>
              <button className="button danger" type="button" onClick={() => onReview(entry.id, "rejected")}>
                驳回申请
              </button>
            </>
          ) : null}
          {canDelete ? (
            <button className="button" type="button" onClick={() => onDelete(entry.id)}>
              {deleteLabel}
            </button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice">
      <AlertCircle size={16} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "green" | "red" | "blue" | "amber";
}) {
  return (
    <article className={`stat-card ${tone}`}>
      <span>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function escapeCsv(value: string | number) {
  const text = String(value).replace(/"/g, '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
}
