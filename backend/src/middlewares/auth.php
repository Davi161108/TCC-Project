<?php
// backend/src/middlewares/auth.php

// Inicia a sessão caso ainda não tenha sido iniciada
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Bloqueia o acesso se o utilizador não estiver logado.
 */
function requireLogin() {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Acesso negado. Precisas de fazer login para continuar.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

/**
 * Bloqueia o acesso se o utilizador não for administrador.
 */
function requireAdmin() {
    requireLogin(); // Garante que pelo menos está logado

    if ($_SESSION['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Acesso restrito. Área exclusiva para administradores.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}