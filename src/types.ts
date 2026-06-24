// 账号角色：员工负责提交报销，财务负责审核和预算，管理员负责账号和权限。
export type UserRole = "employee" | "finance" | "admin";

// 支付方式，用来让报销记录更像真实业务单据。
export type PaymentMethod = "personal_pay" | "company_card" | "bank_transfer" | "cash";

// 内部仍沿用 expense/income，方便兼容原来的数据库字段。
// expense 表示报销申请，income 表示预算入账或预算调整。
export type EntryType = "expense" | "income";

// 报销单的审核状态。
export type RequestStatus = "pending" | "approved" | "rejected";

// 列表筛选时可以看全部，也可以只看某一种审核状态。
export type RequestFilterStatus = RequestStatus | "all";

export interface User {
  // 用户在数据库里的唯一编号。
  id: number;
  // 登录用户名。
  username: string;
  // 当前账号角色，决定页面是否展示审核按钮。
  role: UserRole;
}

export interface ManagedUser {
  // 管理员在账号管理里看到的用户编号。
  id: number;
  // 登录用户名。
  username: string;
  // 用户角色，决定这个账号进入系统后能看到哪些功能。
  role: UserRole;
  // 账号创建时间。
  createdAt: string;
}

// 一条费用记录的数据结构。它可以是一笔报销申请，也可以是一笔预算入账。
export interface LedgerEntry {
  // 记录在数据库里的唯一编号。
  id: number;
  // expense = 报销支出，income = 预算入账。
  type: EntryType;
  // 金额，统计预算使用、待审金额、分类汇总时会用到。
  amount: number;
  // 费用分类，例如差旅交通、办公采购、软件订阅。
  category: string;
  // 申请说明，例如“杭州客户拜访车票”。
  note: string;
  // 发生日期，格式是 YYYY-MM-DD。
  date: string;
  // 所属部门，例如研发部、市场部。
  department: string;
  // 申请人姓名或账号名。
  applicantName: string;
  // 票据编号或发票号，用于财务核对。
  receiptNo: string;
  // 支付方式，例如个人垫付、公司卡、银行转账。
  paymentMethod: PaymentMethod;
  // 审核状态：待审核、已通过、已驳回。
  status: RequestStatus;
  // 驳回原因，只有 rejected 时通常会有内容。
  rejectReason: string;
  // 审核时间，未审核时为 null。
  reviewedAt: string | null;
}

// 预算看板需要的统计数据，都是根据账单数组和预算计算出来的。
export interface LedgerSummary {
  // 系统当前配置的部门月预算。
  allocatedBudget: number;
  // 已通过的报销总额。
  approvedExpense: number;
  // 待审核的报销总额。
  pendingExpense: number;
  // 已驳回的报销总额。
  rejectedExpense: number;
  // 预算剩余额度，计算方式是部门月预算 - 已通过报销。
  availableBudget: number;
  // 预算使用百分比，用于进度条。
  budgetPercent: number;
  // 待审核申请数量。
  pendingCount: number;
  // 已通过申请数量。
  approvedCount: number;
  // 已驳回申请数量。
  rejectedCount: number;
}

// entries.php 返回的数据：既有预算，也有报销/预算记录列表。
export interface LedgerResponse {
  // 当前账号配置的部门月预算。
  monthBudget: number;
  // 当前可见的报销和预算记录。
  entries: LedgerEntry[];
}

// 分类统计里的每一行。
export interface CategoryTotal {
  // 分类名称。
  category: string;
  // 这个分类下已通过报销的总金额。
  total: number;
  // 这个分类占已通过报销总额的百分比。
  percent: number;
}

// 部门费用统计里的每一行。
export interface DepartmentTotal {
  // 部门名称。
  department: string;
  // 这个部门已通过报销的总金额。
  total: number;
  // 这个部门占已通过报销总额的百分比。
  percent: number;
  // 这个部门已通过报销的申请数量。
  count: number;
}

// 审批时间线里展示的记录。
export interface ApprovalActivity {
  id: number;
  note: string;
  applicantName: string;
  department: string;
  status: RequestStatus;
  rejectReason: string;
  reviewedAt: string | null;
}

// 报销列表筛选条件：状态、关键词、日期、部门。
export interface EntryFilters {
  // 审核状态：全部、待审核、已通过或已驳回。
  status: RequestFilterStatus;
  // 关键词，可以匹配申请人、部门、分类、说明、金额、状态等内容。
  keyword: string;
  // 指定日期，为空时表示不过滤日期。
  date: string;
  // 指定部门，为空时表示不过滤部门。
  department: string;
}
