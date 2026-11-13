<?php
// backend/public/api/partners/manage.php

require_once __DIR__ . '/../../../src/middlewares/auth.php';
require_once __DIR__ . '/../../../config/database.php';

// EXCLUSIVO para o Administrador Master
requireMaster();

header('Content-Type: application/json; charset=utf-8');

// 1. Listar solicitações (GET)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $sql = "SELECT pr.id, pr.company_name, pr.cnpj, pr.justification, pr.status, pr.created_at,
                       u.id AS user_id, u.name AS user_name, u.email AS user_email,
                       c.id AS category_id, c.name AS category_name
                FROM partner_requests pr
                JOIN users u ON pr.user_id = u.id
                JOIN categories c ON pr.category_id = c.id
                ORDER BY pr.created_at DESC";
        $stmt = $pdo->query($sql);

        echo json_encode([
            'success' => true,
            'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ], JSON_UNESCAPED_UNICODE);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro ao listar solicitações.']);
        exit;
    }
}

// 2. Aprovar ou Rejeitar solicitação (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $request_id = filter_var($input['request_id'] ?? 0, FILTER_VALIDATE_INT);
    $action = $input['action'] ?? ''; // 'approve' ou 'reject'

    if (!$request_id || !in_array($action, ['approve', 'reject'], true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Informe um request_id válido e a action (approve ou reject).']);
        exit;
    }

    try {
        $stmtReq = $pdo->prepare("SELECT * FROM partner_requests WHERE id = :id LIMIT 1");
        $stmtReq->execute([':id' => $request_id]);
        $reqData = $stmtReq->fetch(PDO::FETCH_ASSOC);

        if (!$reqData) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Solicitação não encontrada.']);
            exit;
        }

        $newStatus = ($action === 'approve') ? 'approved' : 'rejected';

        $pdo->beginTransaction();

        // Atualizar status da solicitação
        $stmtUpdateReq = $pdo->prepare("UPDATE partner_requests SET status = :status WHERE id = :id");
        $stmtUpdateReq->execute([':status' => $newStatus, ':id' => $request_id]);

        // Se aprovada, promove o usuário para 'resolver' e vincula empresa/CNPJ/categoria
        if ($action === 'approve') {
            $sqlPromote = "UPDATE users 
                           SET role = 'resolver', 
                               category_id = :category_id, 
                               company_name = :company_name, 
                               cnpj = :cnpj 
                           WHERE id = :user_id";
            $stmtPromote = $pdo->prepare($sqlPromote);
            $stmtPromote->execute([
                ':category_id'  => $reqData['category_id'],
                ':company_name' => $reqData['company_name'],
                ':cnpj'         => $reqData['cnpj'],
                ':user_id'      => $reqData['user_id']
            ]);
        }

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => $action === 'approve' 
                ? 'Empresa aprovada e promovida a Solucionadora com sucesso!' 
                : 'Solicitação rejeitada.'
        ], JSON_UNESCAPED_UNICODE);
        exit;

    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Erro ao gerenciar parceria no Urbs: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro interno ao processar solicitação.']);
        exit;
    }
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Método não permitido.']);