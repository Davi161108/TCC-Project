<?php
// backend/public/api/occurrences/list.php

require_once __DIR__ . '/../../../src/middlewares/auth.php';
require_once __DIR__ . '/../../../config/database.php';

// Exigir login para ver as ocorrências (proteção de dados)
requireLogin();

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido. Utilize GET.']);
    exit;
}

try {
    // Fazer um JOIN para trazer o nome da categoria e o nome do utilizador, 
    // em vez de trazer apenas os IDs (muito mais útil para o Frontend!)
    $sql = "SELECT o.id, o.title, o.description, o.latitude, o.longitude, o.status, o.created_at,
                   c.name as category_name, u.name as user_name
            FROM occurrences o
            JOIN categories c ON o.category_id = c.id
            JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC";
            
    $stmt = $pdo->query($sql);
    $occurrences = $stmt->fetchAll(PDO::FETCH_ASSOC);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'total' => count($occurrences),
        'data' => $occurrences
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log('Erro ao listar ocorrências no Urbs: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao buscar as ocorrências.']);
}