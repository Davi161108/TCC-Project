<?php
// Iniciar a sessão. Isso precisa ser a primeira coisa antes de qualquer saída de dados.
session_start();

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../../config/database.php';

function response(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    response(405, [
        'success' => false,
        'message' => 'Método não permitido. Utilize POST.'
    ]);
}

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    response(400, [
        'success' => false,
        'message' => 'Dados inválidos ou formato JSON incorreto.'
    ]);
}

$email = strtolower(trim($input['email'] ?? ''));
$password = $input['password'] ?? '';

if ($email === '' || $password === '') {
    response(400, [
        'success' => false,
        'message' => 'Informe o e-mail e a senha.'
    ]);
}

try {
    // Buscar o usuário pelo e-mail
    $sql = "SELECT id, name, password, role FROM users WHERE email = :email LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Verificar se o usuário existe e se a senha bate com o hash salvo no banco
    if (!$user || !password_verify($password, $user['password'])) {
        // Usamos a mesma mensagem genérica para e-mail ou senha errados por segurança
        response(401, [
            'success' => false,
            'message' => 'E-mail ou senha incorretos.'
        ]);
    }

    // Criar as variáveis de sessão para manter o usuário logado
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['name'] = $user['name'];

    response(200, [
        'success' => true,
        'message' => 'Login realizado com sucesso!',
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'role' => $user['role']
        ]
    ]);

} catch (PDOException $e) {
    error_log('Erro no login CitySense: ' . $e->getMessage());
    response(500, [
        'success' => false,
        'message' => 'Não foi possível realizar o login devido a um erro no servidor.'
    ]);
}