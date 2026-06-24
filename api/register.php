<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

ensure_business_columns();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => '只支持 POST'], 405);
}

$data = read_json();
$username = validate_username((string) ($data['username'] ?? ''));
$password = validate_password((string) ($data['password'] ?? ''));
$role = validate_role((string) ($data['role'] ?? 'employee'));
$inviteCode = (string) ($data['inviteCode'] ?? '');

validate_invite_code($role, $inviteCode);

$pdo = db();
$exists = $pdo->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
$exists->execute([$username]);

if ($exists->fetch()) {
    json_response(['error' => '这个用户名已经被注册'], 409);
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$stmt = $pdo->prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
$stmt->execute([$username, $hash, $role]);

$userId = (int) $pdo->lastInsertId();
$budget = $pdo->prepare('INSERT INTO budgets (user_id, month_budget) VALUES (?, 50000)');
$budget->execute([$userId]);

$_SESSION['user_id'] = $userId;

json_response([
    'user' => [
        'id' => $userId,
        'username' => $username,
        'role' => $role,
    ],
]);
