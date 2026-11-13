<?php
// backend/public/api/occurrences/list.php

require_once __DIR__ . '/../../../src/middlewares/auth.php';
require_once __DIR__ . '/../../../config/database.php';

requireLogin();

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido. Utilize GET.']);
    exit;
}

try {
    $conditions = [];
    $params = [];

    // Filtro opcional por status (?status=pending)
    if (!empty($_GET['status'])) {
        $conditions[] = "o.status = :status";
        $params[':status'] = $_GET['status'];
    }

    // Se for um 'resolver' e pedir visão restrita da empresa (?my_company=1), força a categoria dele
    if ($_SESSION['role'] === 'resolver' && !empty($_GET['my_company']) && $_SESSION['category_id'] !== null) {
        $conditions[] = "o.category_id = :category_id";
        $params[':category_id'] = $_SESSION['category_id'];
    } elseif (!empty($_GET['category_id'])) {
        // Filtro manual por categoria (?category_id=1)
        $conditions[] = "o.category_id = :category_id";
        $params[':category_id'] = (int) $_GET['category_id'];
    }

    // Filtro opcional para o cidadão ver apenas as próprias ocorrências (?my_occurrences=1)
    if (!empty($_GET['my_occurrences'])) {
        $conditions[] = "o.user_id = :user_id";
        $params[':user_id'] = $_SESSION['user_id'];
    }

    $whereSql = count($conditions) > 0 ? 'WHERE ' . implode(' AND ', $conditions) : '';

    $sql = "SELECT o.id, o.title, o.description, o.latitude, o.longitude, o.status, o.created_at,
                   o.category_id, c.name AS category_name, u.name AS user_name
            FROM occurrences o
            JOIN categories c ON o.category_id = c.id
            JOIN users u ON o.user_id = u.id
            $whereSql
            ORDER BY o.created_at DESC";
            
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
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