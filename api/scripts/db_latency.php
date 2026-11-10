<?php
// Diagnostic only: times DNS, connect and a few queries to the DB in .env.
// Run from the api folder:  php scripts\db_latency.php
// Prints timings only (no secrets). Safe to delete afterwards.

foreach (file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);
    if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
    [$k, $v] = explode('=', $line, 2);
    putenv(trim($k) . '=' . trim($v));
}

$host = getenv('DB_HOST');
$port = getenv('DB_PORT') ?: 3306;
$name = getenv('DB_NAME');
$user = getenv('DB_USER');
$pass = getenv('DB_PASSWORD');

function ms($t) { return round((microtime(true) - $t) * 1000) . ' ms'; }

$t = microtime(true);
$ip = gethostbyname($host);
echo "DNS lookup      : " . ms($t) . ($ip === $host ? "  (FAILED to resolve)" : "") . "\n";

$t = microtime(true);
try {
    $pdo = new PDO("mysql:host=$host;dbname=$name;charset=utf8mb4;port=$port", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 10,
    ]);
} catch (Throwable $e) {
    echo "Connect FAILED after " . ms($t) . ": " . $e->getMessage() . "\n";
    exit(1);
}
echo "PDO connect     : " . ms($t) . "\n";

for ($i = 1; $i <= 5; $i++) {
    $t = microtime(true);
    $pdo->query('SELECT 1')->fetchAll();
    echo "SELECT 1  (#$i)  : " . ms($t) . "\n";
}

$t = microtime(true);
$pdo->query('SELECT id FROM users LIMIT 1')->fetchAll();
echo "users query     : " . ms($t) . "\n";
