
<?php

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../../config/database.php';

// Função para padronizar as respostas da API
function response(int $status, array $data): void
{
    http_response_code($status);

    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE
    );

    exit;
}

// Aceitar somente requisições POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    response(405, [
        'success' => false,
        'message' => 'Método não permitido. Utilize POST.'
    ]);
}

// Receber os dados enviados em JSON
$input = json_decode(
    file_get_contents('php://input'),
    true
);

// Verificar se o JSON é válido
if (!is_array($input)) {
    response(400, [
        'success' => false,
        'message' => 'Dados inválidos ou formato JSON incorreto.'
    ]);
}

// Capturar e tratar os campos
$name = trim($input['name'] ?? '');
$email = strtolower(trim($input['email'] ?? ''));
$password = $input['password'] ?? '';

// Validar campos obrigatórios
if ($name === '' || $email === '' || $password === '') {
    response(400, [
        'success' => false,
        'message' => 'Preencha todos os campos obrigatórios.'
    ]);
}

// Validar tamanho do nome
$nameLength = function_exists('mb_strlen')
    ? mb_strlen($name, 'UTF-8')
    : strlen($name);

if ($nameLength > 120) {
    response(400, [
        'success' => false,
        'message' => 'O nome deve possuir no máximo 120 caracteres.'
    ]);
}

// Validar e-mail
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    response(400, [
        'success' => false,
        'message' => 'Informe um endereço de e-mail válido.'
    ]);
}

// Validar tamanho do e-mail
if (strlen($email) > 150) {
    response(400, [
        'success' => false,
        'message' => 'O e-mail deve possuir no máximo 150 caracteres.'
    ]);
}

// Validar senha
if (strlen($password) < 8) {
    response(400, [
        'success' => false,
        'message' => 'A senha deve possuir pelo menos 8 caracteres.'
    ]);
}

try {

    // Gerar hash seguro da senha
    $passwordHash = password_hash(
        $password,
        PASSWORD_DEFAULT
    );

    // Preparar a inserção no banco
    $sql = "INSERT INTO users (name, email, password)
            VALUES (:name, :email, :password)";

    $stmt = $pdo->prepare($sql);

    // Executar a consulta
    $stmt->execute([
        ':name' => $name,
        ':email' => $email,
        ':password' => $passwordHash
    ]);

    // Retornar sucesso
    response(201, [
        'success' => true,
        'message' => 'Usuário cadastrado com sucesso!',
        'user' => [
            'id' => (int) $pdo->lastInsertId(),
            'name' => $name,
            'email' => $email,
            'role' => 'citizen'
        ]
    ]);

} catch (PDOException $e) {

    // Verificar se o e-mail já está cadastrado
    if ($e->getCode() === '23000') {
        response(409, [
            'success' => false,
            'message' => 'Este e-mail já está cadastrado.'
        ]);
    }

    // Registrar erro internamente
    error_log('Erro no cadastro CitySense: ' . $e->getMessage());

    response(500, [
        'success' => false,
        'message' => 'Não foi possível realizar o cadastro.'
    ]);
}