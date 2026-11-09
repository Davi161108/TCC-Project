
<?php

/**
 * Urbs - Conexão com o banco de dados
 * Utilizando PDO e MySQL
*/

$host = getenv('DB_HOST') ?: 'localhost';
$database = getenv('DB_NAME') ?: 'urbs';
$username = getenv('DB_USER') ?: 'root';
$password = getenv('DB_PASS') ?: '';

try {
    $pdo = new PDO(
        "mysql:host={$host};dbname={$database};charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );

} catch (PDOException $e) {
    error_log('Erro de conexão Urbs: ' . $e->getMessage());

    http_response_code(500);
    exit('Não foi possível conectar ao banco de dados.');
}