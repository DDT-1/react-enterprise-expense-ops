<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

ensure_business_columns();

$user = require_user();
$userId = (int) $user['id'];
$role = validate_role((string) $user['role']);
$canReview = in_array($role, ['finance', 'admin'], true);
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $budgetStmt = db()->prepare('SELECT month_budget FROM budgets WHERE user_id = ? LIMIT 1');
    $budgetStmt->execute([$userId]);
    $budget = $budgetStmt->fetch();

    if (!$budget) {
        $insertBudget = db()->prepare('INSERT INTO budgets (user_id, month_budget) VALUES (?, 50000)');
        $insertBudget->execute([$userId]);
        $budget = ['month_budget' => '50000.00'];
    }

    $entriesStmt = db()->prepare(
        "SELECT e.id,
                e.type,
                e.amount,
                e.category,
                e.note,
                e.entry_date AS date,
                e.status,
                e.department,
                CASE WHEN e.applicant_name = '' THEN u.username ELSE e.applicant_name END AS applicantName,
                e.receipt_no AS receiptNo,
                e.payment_method AS paymentMethod,
                e.reject_reason AS rejectReason,
                DATE_FORMAT(e.reviewed_at, '%Y-%m-%d %H:%i:%s') AS reviewedAt
         FROM entries e
         INNER JOIN users u ON u.id = e.user_id
         WHERE (? = 1 OR e.user_id = ?)
         ORDER BY e.entry_date DESC, e.id DESC"
    );
    $entriesStmt->execute([$canReview ? 1 : 0, $userId]);
    $entries = array_map(static function (array $entry): array {
        return [
            'id' => (int) $entry['id'],
            'type' => $entry['type'],
            'amount' => (float) $entry['amount'],
            'category' => $entry['category'],
            'note' => $entry['note'],
            'date' => $entry['date'],
            'department' => $entry['department'],
            'applicantName' => $entry['applicantName'],
            'receiptNo' => $entry['receiptNo'],
            'paymentMethod' => $entry['paymentMethod'],
            'status' => $entry['status'],
            'rejectReason' => $entry['rejectReason'],
            'reviewedAt' => $entry['reviewedAt'],
        ];
    }, $entriesStmt->fetchAll());

    json_response([
        'monthBudget' => (float) $budget['month_budget'],
        'entries' => $entries,
    ]);
}

if ($method === 'POST') {
    $data = read_json();
    $type = (string) ($data['type'] ?? 'expense');
    $amount = (float) ($data['amount'] ?? 0);
    $category = trim((string) ($data['category'] ?? ''));
    $note = trim((string) ($data['note'] ?? ''));
    $date = trim((string) ($data['date'] ?? ''));
    $department = trim((string) ($data['department'] ?? ''));
    $applicantName = trim((string) ($data['applicantName'] ?? $user['username']));
    $receiptNo = trim((string) ($data['receiptNo'] ?? ''));
    $paymentMethod = validate_payment_method((string) ($data['paymentMethod'] ?? 'personal_pay'));
    $status = validate_status((string) ($data['status'] ?? ($type === 'income' ? 'approved' : 'pending')));
    $rejectReason = trim((string) ($data['rejectReason'] ?? ''));
    $reviewedAtInput = trim((string) ($data['reviewedAt'] ?? ''));

    if (!in_array($type, ['expense', 'income'], true)) {
        json_response(['error' => '记录类型不正确'], 422);
    }

    if ($amount <= 0) {
        json_response(['error' => '金额必须大于 0'], 422);
    }

    if ($category === '' || mb_strlen($category) > 30) {
        json_response(['error' => '分类不能为空，且不能超过 30 个字'], 422);
    }

    if ($department === '' || mb_strlen($department) > 30) {
        json_response(['error' => '部门不能为空，且不能超过 30 个字'], 422);
    }

    if ($applicantName === '' || mb_strlen($applicantName) > 50) {
        json_response(['error' => '申请人不能为空，且不能超过 50 个字'], 422);
    }

    if ($note === '') {
        $note = $category . '报销申请';
    }

    if (mb_strlen($note) > 120) {
        json_response(['error' => '说明不能超过 120 个字'], 422);
    }

    if (mb_strlen($receiptNo) > 60) {
        json_response(['error' => '票据编号不能超过 60 个字'], 422);
    }

    if (mb_strlen($rejectReason) > 120) {
        json_response(['error' => '驳回原因不能超过 120 个字'], 422);
    }

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        json_response(['error' => '日期格式不正确'], 422);
    }

    $reviewedAt = $status === 'pending' ? null : ($reviewedAtInput !== '' ? $reviewedAtInput : date('Y-m-d H:i:s'));

    $stmt = db()->prepare(
        'INSERT INTO entries (user_id, type, amount, category, note, entry_date, status, department, applicant_name, receipt_no, payment_method, reject_reason, reviewed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $userId,
        $type,
        $amount,
        $category,
        $note,
        $date,
        $status,
        $department,
        $applicantName,
        $receiptNo,
        $paymentMethod,
        $rejectReason,
        $reviewedAt,
    ]);

    json_response(['id' => (int) db()->lastInsertId()], 201);
}

if ($method === 'PATCH') {
    if (!$canReview) {
        json_response(['error' => '只有财务或管理员账号可以审核报销申请'], 403);
    }

    $data = read_json();
    $id = (int) ($data['id'] ?? 0);
    $status = validate_status((string) ($data['status'] ?? ''));
    $rejectReason = trim((string) ($data['rejectReason'] ?? ''));

    if ($id <= 0) {
        json_response(['error' => '缺少申请 id'], 422);
    }

    if (mb_strlen($rejectReason) > 120) {
        json_response(['error' => '驳回原因不能超过 120 个字'], 422);
    }

    $reviewedAt = $status === 'pending' ? null : date('Y-m-d H:i:s');
    $stmt = db()->prepare('UPDATE entries SET status = ?, reject_reason = ?, reviewed_at = ? WHERE id = ?');
    $stmt->execute([$status, $status === 'rejected' ? $rejectReason : '', $reviewedAt, $id]);

    json_response(['ok' => true]);
}

if ($method === 'DELETE') {
    if (($_GET['all'] ?? '') === '1') {
        if ($canReview) {
            db()->exec('DELETE FROM entries');
        } else {
            $stmt = db()->prepare('DELETE FROM entries WHERE user_id = ?');
            $stmt->execute([$userId]);
        }
        json_response(['ok' => true]);
    }

    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) {
        json_response(['error' => '缺少申请 id'], 422);
    }

    if ($canReview) {
        $stmt = db()->prepare('DELETE FROM entries WHERE id = ?');
        $stmt->execute([$id]);
    } else {
        $stmt = db()->prepare('DELETE FROM entries WHERE id = ? AND user_id = ?');
        $stmt->execute([$id, $userId]);
    }

    json_response(['ok' => true]);
}

json_response(['error' => '不支持的请求方法'], 405);

function validate_status(string $status): string
{
    if (!in_array($status, ['pending', 'approved', 'rejected'], true)) {
        json_response(['error' => '审核状态不正确'], 422);
    }

    return $status;
}

function validate_payment_method(string $paymentMethod): string
{
    if (!in_array($paymentMethod, ['personal_pay', 'company_card', 'bank_transfer', 'cash'], true)) {
        json_response(['error' => '支付方式不正确'], 422);
    }

    return $paymentMethod;
}
