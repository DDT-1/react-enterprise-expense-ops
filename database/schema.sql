CREATE DATABASE IF NOT EXISTS enterprise_expense_ops
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE enterprise_expense_ops;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('employee', 'finance', 'admin') NOT NULL DEFAULT 'employee',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS budgets (
  user_id INT UNSIGNED PRIMARY KEY,
  month_budget DECIMAL(10, 2) NOT NULL DEFAULT 50000.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_budgets_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS entries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type ENUM('expense', 'income') NOT NULL DEFAULT 'expense',
  amount DECIMAL(10, 2) NOT NULL,
  category VARCHAR(30) NOT NULL,
  note VARCHAR(120) NOT NULL,
  entry_date DATE NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  department VARCHAR(30) NOT NULL DEFAULT '研发部',
  applicant_name VARCHAR(50) NOT NULL DEFAULT '',
  receipt_no VARCHAR(60) NOT NULL DEFAULT '',
  payment_method ENUM('personal_pay', 'company_card', 'bank_transfer', 'cash') NOT NULL DEFAULT 'personal_pay',
  reject_reason VARCHAR(120) NOT NULL DEFAULT '',
  reviewed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_entries_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  INDEX idx_entries_user_date (user_id, entry_date),
  INDEX idx_entries_status_department (status, department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
