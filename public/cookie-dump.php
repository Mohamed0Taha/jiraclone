<?php
header('Content-Type: application/json');
$raw = $_SERVER['HTTP_COOKIE'] ?? '';
echo json_encode([
  'raw_length' => strlen($raw),
  'raw' => $raw,
  'parsed' => array_map('trim', array_filter(explode(';', $raw))),
]);