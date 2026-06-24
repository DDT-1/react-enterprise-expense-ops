<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

session_destroy();

json_response(['ok' => true]);
