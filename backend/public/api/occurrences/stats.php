<?php
// backend/public/api/occurrences/stats.php

require_once __DIR__ . '/../../../src/middlewares/auth.php';
require_once __DIR__ . '/../../../config/database.php';

requireLogin();

header('Content-Type: application/json; charset=utf-8');

try {
    $where = "";
    $params = [];

    // Se for empresa solucionadora, filtra os KPIs apenas para a categoria que ela atende
    if ($_SESSION['role'] === 'resolver' && $_SESSION['category_id'] !== null) {
        $where = "WHERE o.category_id = :category_id";
        $params[':category_id'] = $_SESSION['category_id'];
    }

    // 1. Contagem por status
    $sqlStatus = "SELECT status, COUNT(*) AS total FROM occurrences o $where GROUP BY status";
    $stmtStatus = $pdo->prepare($sqlStatus);
    $stmtStatus->execute($params);
    $statusRows = $stmtStatus->fetchAll(PDO::FETCH_ASSOC);

    $counts = [
        'total'       => 0,
        'pending'     => 0,
        'in_analysis' => 0,
        'resolved'    => 0,
        'rejected'    => 0
    ];

    foreach ($statusRows as $row) {
        $st = $row['status'];
        $qty = (int) $row['total'];
        if (isset($counts[$st])) {
            $counts[$st] = $qty;
        }
        $counts['total'] += $qty;
    }

    // 2. Contagem por categoria
    $sqlCat = "SELECT c.name AS category_name, COUNT(o.id) AS total
               FROM categories c
               LEFT JOIN occurrences o ON c.id = o.category_id
               " . ($where ? "WHERE c.id = :category_id" : "") . "
               GROUP BY c.id, c.name
               ORDER BY total DESC";
    $stmtCat = $pdo->prepare($sqlCat);
    $stmtCat->execute($params);
    $byCategory = $stmtCat->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success'     => true,
        'scope'       => $_SESSION['role'] === 'resolver' ? 'company_category' : 'city_wide',
        'counts'      => $counts,
        'by_category' => $byCategory
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log('Erro nas estatísticas do Urbs: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro ao carregar indicadores.']);
}