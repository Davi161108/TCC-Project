<?php
// backend/src/middlewares/auth.php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Exige que qualquer usuário esteja logado (citizen, resolver ou master)
 */
function requireLogin(): void {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Acesso negado. Faça login para continuar.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

/**
 * Permite acesso para Empresas Solucionadoras (resolver) e Admin Master (master)
 */
function requireResolverOrMaster(): void {
    requireLogin();

    if (!in_array($_SESSION['role'], ['resolver', 'master'], true)) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Acesso restrito a empresas solucionadoras e administradores.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

/**
 * Permite acesso EXCLUSIVO ao Administrador Master (aprovação de empresas, gestão geral)
 */
function requireMaster(): void {
    requireLogin();

    if ($_SESSION['role'] !== 'master') {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Acesso restrito exclusivamente ao Administrador Master.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}