<?php
// backend/public/api/occurrences/delete.php

require_once __DIR__ . '/../../../src/middlewares/auth.php';
require_once __DIR__ . '/../../../config/database.php';

requireLogin();

header('Content-Type: application/json; charset=utf-8');

if (!in_array($_SERVER['REQUEST_METHOD'], ['POST', 'DELETE'], true)) {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido. Utilize DELETE ou POST.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$occurrence_id = filter_var($input['occurrence_id'] ?? 0, FILTER_VALIDATE_INT);

if (!$occurrence_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Informe o ID da ocorrência para exclusão.']);
    exit;
}

try {
    // 1. Verificar se a ocorrência existe e quem é o dono
    $stmtCheck = $pdo->prepare("SELECT user_id, status FROM occurrences WHERE id = :id LIMIT 1");
    $stmtCheck->execute([':id' => $occurrence_id]);
    $occurrence = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if (!$occurrence) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Ocorrência não encontrada.']);
        exit;
    }

    // 2. Regra de negócio de autorização:
    // Master pode apagar qualquer uma. Cidadão só apaga a própria se ainda estiver 'pending'.
    $isMaster = ($_SESSION['role'] === 'master');
    $isOwnerPending = ((int) $occurrence['user_id'] === (int) $_SESSION['user_id'] && $occurrence['status'] === 'pending');

    if (!$isMaster && !$isOwnerPending) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Sem permissão para excluir. Cidadãos só podem excluir ocorrências próprias ainda pendentes.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 3. Transação para remover o histórico vinculado e depois a ocorrência (evita erro de Foreign Key)
    $pdo->beginTransaction();

    $stmtDelHistory = $pdo->prepare("DELETE FROM occurrence_history WHERE occurrence_id = :id");
    $stmtDelHistory->execute([':id' => $occurrence_id]);

    $stmtDelOcc = $pdo->prepare("DELETE FROM occurrences WHERE id = :id");
    $stmtDelOcc->execute([':id' => $occurrence_id]);

    $pdo->commit();

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Ocorrência excluída com sucesso!'
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Erro ao excluir ocorrência no Urbs: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao excluir a ocorrência.']);
}