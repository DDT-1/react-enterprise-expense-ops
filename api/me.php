<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

$user = current_user();

if (!$user) {
    session_destroy();
    json_response(['user' => null]);
}

json_response(['user' => public_user($user)]);
