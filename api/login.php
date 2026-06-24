<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

ensure_business_columns();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => '只支持 POST'], 405);
}

$data = read_json();
$username = validate_username((string) ($data['username'] ?? ''));
$password = (string) ($data['password'] ?? '');

$stmt = db()->prepare('SELECT id, username, password_hash, role FROM users WHERE username = ? LIMIT 1');
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    json_response(['error' => '用户名或密码不正确'], 401);
}

$_SESSION['user_id'] = (int) $user['id'];

json_response(['user' => public_user($user)]);
