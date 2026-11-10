<?php
/**
 * Create the first PRIME administrator from the command line.
 *
 * Run from the api directory after applying database migrations. The script
 * reads DB_* values from the process environment or api/.env and requires
 * ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in the process environment.
 * It never accepts credentials over HTTP and refuses to overwrite an account.
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script can only be run from the command line.\n");
    exit(1);
}

$root = dirname(__DIR__);
$envFile = $root . DIRECTORY_SEPARATOR . '.env';

if (is_file($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        $processValue = getenv($key);
        if (!preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $key) || ($processValue !== false && $processValue !== '')) {
            continue;
        }
        if (strlen($value) >= 2 && in_array($value[0], ['"', "'"], true) && $value[-1] === $value[0]) {
            $value = substr($value, 1, -1);
        }
        putenv($key . '=' . $value);
    }
}

function requiredEnv(string $name): string
{
    $value = trim((string) (getenv($name) ?: ''));
    if ($value === '') {
        throw new RuntimeException("Set {$name} in your process environment before running this script.");
    }
    return $value;
}

function uuidV4(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    return sprintf('%s-%s-%s-%s-%s', substr($hex, 0, 8), substr($hex, 8, 4), substr($hex, 12, 4), substr($hex, 16, 4), substr($hex, 20, 12));
}

try {
    $name = requiredEnv('ADMIN_NAME');
    $email = strtolower(requiredEnv('ADMIN_EMAIL'));
    $password = (string) (getenv('ADMIN_PASSWORD') ?: '');
    $driver = strtolower(trim((string) (getenv('DB_DRIVER') ?: 'mysql')));
    $host = trim((string) (getenv('DB_HOST') ?: 'localhost'));
    $port = trim((string) (getenv('DB_PORT') ?: '3306'));
    $database = trim((string) (getenv('DB_NAME') ?: ''));
    $username = (string) (getenv('DB_USER') ?: 'root');
    $dbPassword = (string) (getenv('DB_PASSWORD') ?: '');
    $charset = trim((string) (getenv('DB_CHARSET') ?: 'utf8mb4'));
    $prefix = (string) (getenv('DB_PREFIX') ?: '');

    if ($driver !== 'mysql') {
        throw new RuntimeException('This bootstrap script currently supports MySQL/MariaDB only.');
    }
    if ($database === '') {
        throw new RuntimeException('DB_NAME is missing. Configure the LavaLust database in api/.env first.');
    }
    if (!preg_match('/^[A-Za-z0-9_]*$/', $prefix)) {
        throw new RuntimeException('DB_PREFIX may contain only letters, numbers, and underscores.');
    }
    if ($name === '' || strlen($name) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 255) {
        throw new RuntimeException('Enter a valid administrator name and email address (maximum 100 and 255 characters).');
    }
    if (strlen($password) < 12) {
        throw new RuntimeException('ADMIN_PASSWORD must be at least 12 characters.');
    }

    $dsn = "mysql:host={$host};port={$port};dbname={$database};charset={$charset}";
    $pdo = new PDO($dsn, $username, $dbPassword, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    $rolesTable = '`' . $prefix . 'roles`';
    $usersTable = '`' . $prefix . 'users`';
    $exists = $pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (?, ?)');
    $exists->execute([$prefix . 'roles', $prefix . 'users']);
    if ((int) $exists->fetchColumn() !== 2) {
        throw new RuntimeException('The roles/users tables are missing. Apply the LavaLust database migrations first.');
    }

    $findUser = $pdo->prepare("SELECT id FROM {$usersTable} WHERE email = ? LIMIT 1");
    $findUser->execute([$email]);
    if ($findUser->fetch()) {
        throw new RuntimeException("An account already uses {$email}; no account was changed.");
    }

    $pdo->beginTransaction();
    $findRole = $pdo->prepare("SELECT id FROM {$rolesTable} WHERE LOWER(name) = LOWER(?) LIMIT 1 FOR UPDATE");
    $findRole->execute(['Administrator']);
    $role = $findRole->fetch();

    if (!$role) {
        $roleId = uuidV4();
        $createRole = $pdo->prepare("INSERT INTO {$rolesTable} (id, name, description, is_system, created_at, updated_at) VALUES (?, 'Administrator', 'Built-in PRIME administrator role', 1, NOW(), NOW())");
        $createRole->execute([$roleId]);
    } else {
        $roleId = (string) $role['id'];
        $promoteRole = $pdo->prepare("UPDATE {$rolesTable} SET is_system = 1, updated_at = NOW() WHERE id = ?");
        $promoteRole->execute([$roleId]);
    }

    $createUser = $pdo->prepare("INSERT INTO {$usersTable} (id, role_id, email, password, name, contact_number, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, 1, NOW(), NOW())");
    $createUser->execute([uuidV4(), $roleId, $email, password_hash($password, PASSWORD_DEFAULT), $name]);
    $pdo->commit();

    putenv('ADMIN_PASSWORD');
    $password = '';
    fwrite(STDOUT, "Administrator account created for {$email}. You can now sign in at /admin/login.\n");
} catch (Throwable $error) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    putenv('ADMIN_PASSWORD');
    fwrite(STDERR, 'Admin bootstrap failed: ' . $error->getMessage() . "\n");
    exit(1);
}
