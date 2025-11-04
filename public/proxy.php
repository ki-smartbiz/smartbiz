<?php
declare(strict_types=1);

// --- DEBUG nur kurz aktiv lassen ---
ini_set('display_errors', '1');
error_reporting(E_ALL);

// Wenn /app und /private Geschwister sind:
$guess = __DIR__ . '/../private/proxy_core.php';
$real  = realpath($guess);

if (!$real || !is_readable($real)) {
  http_response_code(500);
  header('Content-Type: text/plain; charset=utf-8');
  echo "Proxy core not found or unreadable.\n";
  echo "Tried: $guess\n";
  echo "Base: " . __DIR__ . "\n";
  exit;
}

require $real;
