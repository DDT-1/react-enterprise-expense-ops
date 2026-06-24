<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

$user = require_user();
$userId = (int) $user['id'];
$role = validate_role((string) $user['role']);

if (!in_array($role, ['finance', 'admin'], true)) {
    json_response(['error' => '只有财务或管理员账号可以维护预算'], 403);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => '只支持 POST'], 405);
}

$data = read_json();
$monthBudget = (float) ($data['monthBudget'] ?? 0);

if ($monthBudget <= 0) {
    json_response(['error' => '部门预算必须大于 0'], 422);
}

$stmt = db()->prepare(
    'INSERT INTO budgets (user_id, month_budget)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE month_budget = VALUES(month_budget)'
);
$stmt->execute([$userId, $monthBudget]);

json_response(['monthBudget' => $monthBudget]);
