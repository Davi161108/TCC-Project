<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

// Limpar as variáveis da sessão
$_SESSION = [];

// Destruir a sessão no servidor
session_destroy();

// Apagar o cookie de sessão no navegador
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

echo json_encode([
    'success' => true,
    'message' => 'Logout realizado com sucesso.'
], JSON_UNESCAPED_UNICODE);
exit;