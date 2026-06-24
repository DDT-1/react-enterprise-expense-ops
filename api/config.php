<?php
declare(strict_types=1);

const DB_HOST = '127.0.0.1';
const DB_NAME = 'enterprise_expense_ops';
const DB_USER = 'root';
const DB_PASS = '';
const EMPLOYEE_INVITE_CODE = 'EMPLOYEE2026';
const FINANCE_INVITE_CODE = 'FINANCE2026';
const ADMIN_INVITE_CODE = 'ADMIN2026';

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (preg_match('/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/', $origin)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
}

header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

session_set_cookie_params([
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function read_json(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);

    if (!is_array($data)) {
        json_response(['error' => '请求数据格式不正确'], 400);
    }

    return $data;
}

function ensure_business_columns(): void
{
    static $done = false;

    if ($done) {
        return;
    }

    ensure_column('users', 'role', "role ENUM('employee','finance') NOT NULL DEFAULT 'employee' AFTER password_hash");
    ensure_user_role_enum();
    ensure_column('entries', 'status', "status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' AFTER entry_date");
    ensure_column('entries', 'department', "department VARCHAR(30) NOT NULL DEFAULT '研发部' AFTER status");
    ensure_column('entries', 'applicant_name', "applicant_name VARCHAR(50) NOT NULL DEFAULT '' AFTER department");
    ensure_column('entries', 'receipt_no', "receipt_no VARCHAR(60) NOT NULL DEFAULT '' AFTER applicant_name");
    ensure_column('entries', 'payment_method', "payment_method ENUM('personal_pay','company_card','bank_transfer','cash') NOT NULL DEFAULT 'personal_pay' AFTER receipt_no");
    ensure_column('entries', 'reject_reason', "reject_reason VARCHAR(120) NOT NULL DEFAULT '' AFTER payment_method");
    ensure_column('entries', 'reviewed_at', "reviewed_at DATETIME NULL AFTER reject_reason");

    $done = true;
}

function ensure_user_role_enum(): void
{
    db()->exec("ALTER TABLE users MODIFY role ENUM('employee','finance','admin') NOT NULL DEFAULT 'employee'");
}

function ensure_column(string $table, string $column, string $definition): void
{
    if (!in_array($table, ['users', 'entries'], true)) {
        return;
    }

    $stmt = db()->prepare("SHOW COLUMNS FROM `{$table}` LIKE ?");
    $stmt->execute([$column]);

    if (!$stmt->fetch()) {
        db()->exec("ALTER TABLE `{$table}` ADD COLUMN {$definition}");
    }
}

function require_user_id(): int
{
    if (empty($_SESSION['user_id'])) {
        json_response(['error' => '请先登录'], 401);
    }

    return (int) $_SESSION['user_id'];
}

function current_user(): ?array
{
    ensure_business_columns();

    if (empty($_SESSION['user_id'])) {
        return null;
    }

    $stmt = db()->prepare('SELECT id, username, role FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([(int) $_SESSION['user_id']]);
    $user = $stmt->fetch();

    return $user ?: null;
}

function require_user(): array
{
    $user = current_user();

    if (!$user) {
        json_response(['error' => '请先登录'], 401);
    }

    return $user;
}

function public_user(array $user): array
{
    return [
        'id' => (int) $user['id'],
        'username' => $user['username'],
        'role' => validate_role((string) ($user['role'] ?? 'employee')),
    ];
}

function validate_username(string $username): string
{
    $username = trim($username);

    if (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username)) {
        json_response(['error' => '用户名只能使用 3-20 位英文、数字或下划线'], 422);
    }

    return $username;
}

function validate_password(string $password): string
{
    if (mb_strlen($password) < 6) {
        json_response(['error' => '密码至少 6 位'], 422);
    }

    return $password;
}

function validate_role(string $role): string
{
    return in_array($role, ['employee', 'finance', 'admin'], true) ? $role : 'employee';
}

function validate_invite_code(string $role, string $inviteCode): void
{
    $inviteCode = trim($inviteCode);
    $expectedCode = EMPLOYEE_INVITE_CODE;
    if ($role === 'finance') {
        $expectedCode = FINANCE_INVITE_CODE;
    }
    if ($role === 'admin') {
        $expectedCode = ADMIN_INVITE_CODE;
    }

    if (!hash_equals($expectedCode, $inviteCode)) {
        $message = '员工账号需要正确的企业邀请码';
        if ($role === 'finance') {
            $message = '财务账号需要正确的财务邀请码';
        }
        if ($role === 'admin') {
            $message = '管理员账号需要正确的管理员邀请码';
        }
        json_response(['error' => $message], 403);
    }
}
