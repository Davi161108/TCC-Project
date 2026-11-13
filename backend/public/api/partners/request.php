<?php
// backend/public/api/partners/request.php

require_once __DIR__ . '/../../../src/middlewares/auth.php';
require_once __DIR__ . '/../../../config/database.php';

requireLogin();

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido. Utilize POST.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$company_name = trim($input['company_name'] ?? '');
$cnpj = trim($input['cnpj'] ?? '');
$category_id = filter_var($input['category_id'] ?? 0, FILTER_VALIDATE_INT);
$justification = trim($input['justification'] ?? '');

if ($company_name === '' || $cnpj === '' || !$category_id) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Informe a razão social/nome da empresa, o CNPJ/MEI e a categoria de atuação.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // Verificar se o usuário já possui uma solicitação pendente
    $stmtCheck = $pdo->prepare("SELECT id FROM partner_requests WHERE user_id = :user_id AND status = 'pending' LIMIT 1");
    $stmtCheck->execute([':user_id' => $_SESSION['user_id']]);

    if ($stmtCheck->fetch()) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => 'Você já possui uma solicitação em análise pelo Administrador Master.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $sql = "INSERT INTO partner_requests (user_id, category_id, company_name, cnpj, justification)
            VALUES (:user_id, :category_id, :company_name, :cnpj, :justification)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':user_id'       => $_SESSION['user_id'],
        ':category_id'   => $category_id,
        ':company_name'  => $company_name,
        ':cnpj'          => $cnpj,
        ':justification' => $justification
    ]);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Solicitação enviada com sucesso! Aguarde a aprovação do Administrador Master.'
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log('Erro ao solicitar parceria no Urbs: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro interno ao registrar solicitação.']);
}