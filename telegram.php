<?php
declare(strict_types=1);

/**
 * Accepts POST JSON from the form, sends lead to Telegram server-side only,
 * responds with JSON so the browser can redirect without exposing secrets.
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
    exit;
}

$configPath = __DIR__ . '/telegram-config.php';
if (!is_file($configPath)) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Missing telegram-config.php. Copy telegram-config.sample.php to telegram-config.php and add your credentials.',
    ]);
    exit;
}

$config = require $configPath;
if (!is_array($config)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Invalid telegram-config.php format.']);
    exit;
}

$botToken = trim((string) ($config['bot_token'] ?? ''));
$chatId = trim((string) ($config['chat_id'] ?? ''));

// Hosting panels often expose env vars but not getenv(); merge fallbacks.
if ($botToken === '') {
    $botToken = trim((string) (getenv('TELEGRAM_BOT_TOKEN') ?: ''));
}
if ($chatId === '') {
    $chatId = trim((string) (getenv('TELEGRAM_CHAT_ID') ?: ''));
}
// $_SERVER sometimes populated when getenv does not work on shared hosting.
if ($botToken === '' && isset($_SERVER['TELEGRAM_BOT_TOKEN'])) {
    $botToken = trim((string) $_SERVER['TELEGRAM_BOT_TOKEN']);
}
if ($chatId === '' && isset($_SERVER['TELEGRAM_CHAT_ID'])) {
    $chatId = trim((string) $_SERVER['TELEGRAM_CHAT_ID']);
}

if ($botToken === '' || $chatId === '') {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Telegram credentials are not configured. Edit telegram-config.php (bot_token and chat_id).',
    ]);
    exit;
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody ?? '', true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid payload.']);
    exit;
}

function escape_html(string $value): string
{
    return str_replace(
        ['&', '<', '>'],
        ['&amp;', '&lt;', '&gt;'],
        $value
    );
}

$name = trim(($payload['firstName'] ?? '') . ' ' . ($payload['lastName'] ?? ''));
$rows = [
    'Name' => $name !== '' ? $name : null,
    'Email' => $payload['email'] ?? null,
    'Phone' => $payload['phone'] ?? null,
    'ZIP' => $payload['zipCode'] ?? null,
    'State' => $payload['state'] ?? null,
    'Debt Amount' => $payload['debtAmount'] ?? null,
    'Debt Type' => $payload['debtType'] ?? null,
    'Monthly Payment' => $payload['monthlyPayment'] ?? null,
    'Employment' => $payload['employmentStatus'] ?? null,
    'Consent' => !empty($payload['consent']) ? 'Yes' : 'No',
];

$lines = [];
$lines[] = '<b>New Loan Prequalification Lead</b>';
$lines[] = '';
foreach ($rows as $label => $value) {
    if ($value !== null && $value !== '') {
        $lines[] = '<b>' . escape_html((string) $label) . ':</b> ' . escape_html((string) $value);
    }
}
$lines[] = '';
$lines[] = '<i>Submitted: ' . gmdate('c') . '</i>';

$telegramPayload = json_encode([
    'chat_id' => $chatId,
    'text' => implode("\n", $lines),
    'parse_mode' => 'HTML',
    'disable_web_page_preview' => true,
]);

$url = 'https://api.telegram.org/bot' . $botToken . '/sendMessage';

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'PHP cURL extension is required on the server.']);
    exit;
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => $telegramPayload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 25,
]);

$response = curl_exec($ch);
$curlError = curl_error($ch);
$statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Failed to reach Telegram: ' . $curlError]);
    exit;
}

$decoded = json_decode((string) $response, true);
if ($statusCode < 200 || $statusCode >= 300 || !is_array($decoded) || empty($decoded['ok'])) {
    $description = is_array($decoded) && isset($decoded['description'])
        ? (string) $decoded['description']
        : 'Telegram API error.';
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => $description]);
    exit;
}

echo json_encode(['ok' => true]);
