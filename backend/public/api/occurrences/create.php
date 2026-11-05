<?php
// 1. Incluir e ativar o middleware de segurança PRIMEIRO!
require_once __DIR__ . '/../../../src/middlewares/auth.php';
requireLogin(); // Se não tiver sessão ativa, o script para aqui e devolve erro 401

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../../config/database.php';

function response(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    response(405, ['success' => false, 'message' => 'Utiliza o método POST.']);
}

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    response(400, ['success' => false, 'message' => 'Formato JSON inválido.']);
}

// Capturar os dados
$title = trim($input['title'] ?? '');
$description = trim($input['description'] ?? '');
$category_id = filter_var($input['category_id'] ?? 0, FILTER_VALIDATE_INT);
$latitude = filter_var($input['latitude'] ?? null, FILTER_VALIDATE_FLOAT);
$longitude = filter_var($input['longitude'] ?? null, FILTER_VALIDATE_FLOAT);

// Validações básicas
if ($title === '' || $description === '' || !$category_id || $latitude === false || $longitude === false) {
    response(400, [
        'success' => false,
        'message' => 'Preenche todos os campos obrigatórios (título, descrição, categoria e coordenadas).'
    ]);
}

// Validar limites geográficos básicos (opcional, mas recomendado)
if ($latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
    response(400, ['success' => false, 'message' => 'Coordenadas geográficas inválidas.']);
}

$userId = $_SESSION['user_id'];
$initialStatus = 'pending';

try {
    // Iniciar a transação
    $pdo->beginTransaction();

    // 1. Inserir a ocorrência
    $sqlOccurrence = "INSERT INTO occurrences (user_id, category_id, title, description, latitude, longitude, status)
                      VALUES (:user_id, :category_id, :title, :description, :latitude, :longitude, :status)";
    
    $stmtOcc = $pdo->prepare($sqlOccurrence);
    $stmtOcc->execute([
        ':user_id' => $userId,
        ':category_id' => $category_id,
        ':title' => $title,
        ':description' => $description,
        ':latitude' => $latitude,
        ':longitude' => $longitude,
        ':status' => $initialStatus
    ]);

    $occurrenceId = $pdo->lastInsertId();

    // 2. Inserir o histórico inicial
    $sqlHistory = "INSERT INTO occurrence_history (occurrence_id, user_id, previous_status, new_status, comment)
                   VALUES (:occurrence_id, :user_id, NULL, :new_status, :comment)";
    
    $stmtHist = $pdo->prepare($sqlHistory);
    $stmtHist->execute([
        ':occurrence_id' => $occurrenceId,
        ':user_id' => $userId,
        ':new_status' => $initialStatus,
        ':comment' => 'Ocorrência registada pelo cidadão.'
    ]);

    // Confirmar a transação (grava tudo de vez)
    $pdo->commit();

    response(201, [
        'success' => true,
        'message' => 'Ocorrência registada com sucesso!',
        'occurrence_id' => (int) $occurrenceId
    ]);

} catch (PDOException $e) {
    // Se der erro em alguma das inserções, desfaz tudo (Rollback)
    $pdo->rollBack();
    error_log('Erro ao registar ocorrência: ' . $e->getMessage());
    response(500, ['success' => false, 'message' => 'Erro interno ao gravar a ocorrência.']);
}