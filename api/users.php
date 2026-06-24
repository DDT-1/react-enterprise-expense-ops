<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

ensure_business_columns();

$currentUser = require_user();
$currentRole = validate_role((string) $currentUser['role']);

if ($currentRole !== 'admin') {
    json_response(['error' => '只有管理员可以管理账号'], 403);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = db()->query(
        "SELECT id, username, role, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
         FROM users
         ORDER BY created_at DESC, id DESC"
    );

    $users = array_map(static function (array $user): array {
        return [
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'role' => validate_role((string) $user['role']),
            'createdAt' => $user['createdAt'],
        ];
    }, $stmt->fetchAll());

    json_response(['users' => $users]);
}

if ($method === 'POST') {
    $data = read_json();
    $username = validate_username((string) ($data['username'] ?? ''));
    $password = validate_password((string) ($data['password'] ?? ''));
    $role = validate_role((string) ($data['role'] ?? 'employee'));

    $exists = db()->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
    $exists->execute([$username]);

    if ($exists->fetch()) {
        json_response(['error' => '这个用户名已经存在'], 409);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = db()->prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)');
    $stmt->execute([$username, $hash, $role]);

    $userId = (int) db()->lastInsertId();
    $budget = db()->prepare('INSERT INTO budgets (user_id, month_budget) VALUES (?, 50000)');
    $budget->execute([$userId]);

    json_response([
        'user' => [
            'id' => $userId,
            'username' => $username,
            'role' => $role,
            'createdAt' => date('Y-m-d H:i:s'),
        ],
    ], 201);
}

json_response(['error' => '不支持的请求方法'], 405);
