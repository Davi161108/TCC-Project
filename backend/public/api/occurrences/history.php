<?php
// backend/public/api/occurrences/history.php

require_once __DIR__ . '/../../../src/middlewares/auth.php';
require_once __DIR__ . '/../../../config/database.php';

requireLogin();

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido. Utilize GET.']);
    exit;
}

$occurrence_id = filter_var($_GET['occurrence_id'] ?? 0, FILTER_VALIDATE_INT);

if (!$occurrence_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Informe um occurrence_id válido na URL.']);
    exit;
}

try {
    $sql = "SELECT h.id, h.previous_status, h.new_status, h.comment, h.created_at,
                   u.name AS changed_by, u.role AS changed_by_role, u.company_name
            FROM occurrence_history h
            JOIN users u ON h.user_id = u.id
            WHERE h.occurrence_id = :occurrence_id
            ORDER BY h.created_at ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':occurrence_id' => $occurrence_id]);
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'occurrence_id' => $occurrence_id,
        'history' => $history
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log('Erro ao buscar histórico no Urbs: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao buscar o histórico.']);
}