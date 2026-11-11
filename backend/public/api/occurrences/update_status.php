<?php
// backend/public/api/occurrences/update_status.php

require_once __DIR__ . '/../../../src/middlewares/auth.php';
require_once __DIR__ . '/../../../config/database.php';

// Exige que seja Empresa Solucionadora (resolver) ou Master
requireResolverOrMaster();

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido. Utilize POST.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$occurrence_id = filter_var($input['occurrence_id'] ?? 0, FILTER_VALIDATE_INT);
$new_status = $input['status'] ?? '';
$comment = trim($input['comment'] ?? 'Status atualizado pela equipe responsável.');

$valid_statuses = ['pending', 'in_analysis', 'resolved', 'rejected'];

if (!$occurrence_id || !in_array($new_status, $valid_statuses, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Dados inválidos ou status incorreto.']);
    exit;
}

try {
    // 1. Buscar a ocorrência atual para checar a categoria e o status anterior
    $sqlCheck = "SELECT status, category_id FROM occurrences WHERE id = :id LIMIT 1";
    $stmtCheck = $pdo->prepare($sqlCheck);
    $stmtCheck->execute([':id' => $occurrence_id]);
    $occurrence = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if (!$occurrence) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Ocorrência não encontrada.']);
        exit;
    }

    // 2. Se for um 'resolver' vinculado a uma categoria, impedir que mexa na área de outra empresa
    if (
        $_SESSION['role'] === 'resolver' && 
        $_SESSION['category_id'] !== null && 
        (int) $occurrence['category_id'] !== (int) $_SESSION['category_id']
    ) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Acesso negado: esta ocorrência pertence a outra categoria de atendimento.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $previous_status = $occurrence['status'];

    // Iniciar transação para atualizar ocorrência e gravar histórico juntos
    $pdo->beginTransaction();

    // 3. Atualizar o status na tabela occurrences
    $sqlUpdate = "UPDATE occurrences SET status = :status WHERE id = :id";
    $stmtUpdate = $pdo->prepare($sqlUpdate);
    $stmtUpdate->execute([
        ':status' => $new_status,
        ':id' => $occurrence_id
    ]);

    // 4. Registrar a mudança no histórico com previous_status e new_status
    $sqlHistory = "INSERT INTO occurrence_history (occurrence_id, user_id, previous_status, new_status, comment) 
                   VALUES (:occurrence_id, :user_id, :previous_status, :new_status, :comment)";
    $stmtHistory = $pdo->prepare($sqlHistory);
    $stmtHistory->execute([
        ':occurrence_id'   => $occurrence_id,
        ':user_id'         => $_SESSION['user_id'],
        ':previous_status' => $previous_status,
        ':new_status'      => $new_status,
        ':comment'         => $comment
    ]);

    $pdo->commit();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Status atualizado com sucesso!',
        'previous_status' => $previous_status,
        'new_status' => $new_status
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Erro ao atualizar status no Urbs: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao atualizar status.']);
}