
<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/database.php';

try {
    $query = $pdo->query(
        "SELECT COUNT(*) AS total FROM categories"
    );

    $result = $query->fetch();

    echo json_encode([
        'success' => true,
        'message' => 'API Urbs funcionando!',
        'database' => 'Conectado',
        'categories_registered' => (int) $result['total']
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log('Erro na API Urbs: ' . $e->getMessage());

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Erro ao consultar o banco de dados.'
    ], JSON_UNESCAPED_UNICODE);
}
