# 企业费用报销与预算审批平台

一个基于 React + TypeScript 的企业内部费用审批后台，核心场景是：

> 员工提交报销申请，财务审核申请，管理员维护账号角色，系统统计预算使用、费用分类和部门支出。

它不是纯静态页面，前端通过 PHP 接口和 MySQL 进行数据交互。

## 技术栈

- 前端：React 19、TypeScript、Vite、CSS Grid / Flex
- 后端：PHP、MySQL、XAMPP
- 工程化：Vitest 单元测试、Vite 生产构建、构建体积报告、本地计算性能基准

## 核心功能

- 登录注册：注册需要邀请码，员工、财务和管理员使用不同邀请码，避免高权限角色被随意创建。
- 账号管理：管理员可以在系统内创建员工、财务或管理员账号。
- 员工报销：提交申请人、部门、金额、分类、日期和说明。
- 票据字段：支持填写票据编号和支付方式，方便财务核对。
- 审批权限：财务可以通过或驳回待审核申请，员工只能查看自己的申请，管理员负责账号和全局数据管理。
- 预算看板：统计已通过支出、待审核金额、可用预算和预算使用率。
- 模块导航：顶部提供新建报销、预算看板、申请台账、费用分析和账号管理入口。
- 申请筛选：支持按审核状态、部门、日期和关键词筛选，并对结果分页展示。
- 数据导出：支持将当前筛选结果导出为 CSV 报表。
- 分类分析：展示已通过报销在不同费用分类下的占比。
- 部门分析：展示各部门已通过费用占比和申请数量。
- 审批记录：展示最近通过或驳回的审批时间线。
- 金额计算：金额输入支持 `900+180*2`、`1000/4` 等简单算式。
- 数据持久化：用户、预算、报销申请和审核状态保存到 MySQL。

## 工程化亮点

- 使用 Vite 搭建 React + TypeScript 项目，支持本地开发和生产构建。
- 使用 TypeScript 定义用户、角色、账号管理、报销申请、审核状态和筛选条件。
- 封装 `services` 接口层，按登录、报销、预算、账号管理拆分请求逻辑。
- 抽离 `permissions.ts` 权限模块，集中维护员工、财务、管理员的操作权限。
- 拆分侧边栏、顶部工作台、财务待审队列等组件，降低主组件复杂度。
- 将预算统计、费用分类、部门分析、申请筛选、审批记录和金额计算抽离到 `utils/ledger.ts`，便于测试和维护。
- 后端按角色限制接口权限，员工只能读取自己的申请，财务/管理员可审核，管理员可创建账号。
- 使用 `useMemo` 缓存统计、分类和筛选结果，减少重复计算。
- 使用 Vitest 测试金额计算、预算统计、分类汇总、部门分析、审批记录和筛选逻辑。
- 提供 `build:report` 和 `perf:ledger` 命令，检查生产包体积和本地计算性能。

## 运行方式

安装依赖：

```bash
npm install
```

启动前端：

```bash
npm run dev
```

常用检查：

```bash
npm test
npm run build
npm run build:report
npm run perf:ledger
```

## 后端和数据库

后端接口在 `api/` 目录，数据库脚本在 `database/schema.sql`。

本地运行时需要：

1. 在 XAMPP 中启动 Apache 和 MySQL。
2. 进入 `http://localhost/phpmyadmin`。
3. 导入 `database/schema.sql`。
4. 将 `api` 文件夹放到 `htdocs/enterprise-expense-ops/api`。

默认前端接口地址：

```text
http://127.0.0.1/enterprise-expense-ops/api
```

如果接口地址不同，可以新建 `.env.local`：

```text
VITE_API_BASE=http://127.0.0.1/你的目录名/api
```

## 目录结构

```text
src/
  App.tsx                 主页面和交互流程
  components/             侧边栏、顶部工作台、财务待审队列等页面组件
  constants.ts            分类、部门、角色文案、支付方式、示例申请、接口地址
  permissions.ts          员工、财务、管理员角色权限配置
  types.ts                用户、角色、报销申请、审核状态、统计数据类型
  services/               登录、报销、预算、账号管理等接口请求封装
  utils/ledger.ts         金额计算、筛选、统计、格式化等纯函数
  styles.css              后台布局和响应式样式

api/
  login.php               登录接口
  register.php            注册接口，校验员工/财务/管理员邀请码
  users.php               管理员账号管理接口
  me.php                  登录状态接口
  entries.php             报销申请查询、提交、审核、删除接口
  budget.php              部门预算保存接口
  logout.php              退出登录接口

database/
  schema.sql              MySQL 数据库建表脚本

tools/
  build_report.mjs        构建体积报告脚本
  ledger_perf_benchmark.mjs 本地计算性能基准脚本
```
