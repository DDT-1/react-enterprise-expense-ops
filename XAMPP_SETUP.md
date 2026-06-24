# 企业费用报销与预算审批平台 XAMPP 运行说明

这个项目分成两部分：

- 前端：React + TypeScript + Vite
- 后端：PHP 接口 + XAMPP MySQL 数据库

## 1. 启动 XAMPP

打开 XAMPP Control Panel，启动：

- Apache
- MySQL

## 2. 创建数据库

打开浏览器进入：

```text
http://localhost/phpmyadmin
```

在 phpMyAdmin 里选择“导入”，导入这个文件：

```text
D:\frontend\database\schema.sql
```

导入后会创建：

- `enterprise_expense_ops` 数据库
- `users` 用户表，包含员工/财务/管理员角色
- `budgets` 部门预算表
- `entries` 报销申请表，包含部门、申请人、票据编号、支付方式、审核状态、驳回原因

## 3. 放置 PHP 接口

把项目里的 `api` 文件夹复制到你的 Apache 目录：

```text
E:\xw\htdocs\enterprise-expense-ops\api
```

复制后接口地址应该类似：

```text
http://127.0.0.1/enterprise-expense-ops/api/me.php
```

## 4. 运行前端

在 `D:\frontend` 里运行：

```bash
npm.cmd run dev
```

打开终端显示的本地地址，例如：

```text
http://127.0.0.1:5173
```

## 5. 使用方式

1. 可以先注册管理员账号，演示邀请码是 `ADMIN2026`。
2. 管理员进入“账号管理”，可以创建员工、财务或管理员账号。
3. 也可以直接注册员工账号，演示邀请码是 `EMPLOYEE2026`。
4. 也可以直接注册财务账号，演示邀请码是 `FINANCE2026`。
5. 员工提交申请时可以填写票据编号和支付方式。
6. 员工提交申请后，状态是“待审核”。
7. 财务或管理员账号可以点击“通过”或“驳回”。
8. 已通过的申请会占用部门预算，并进入费用分类、部门费用和审批记录统计。
9. 金额可以填 `1280`，也可以填 `900+180*2`。

## 6. 如果接口地址不同

如果你的接口不是放在 `enterprise-expense-ops/api`，可以新建 `.env.local`：

```text
VITE_API_BASE=http://127.0.0.1/你的目录名/api
```

然后重新运行：

```bash
npm.cmd run dev
```
