
-- =====================================================
-- CitySense
-- Banco de dados: MySQL
-- Versão: 1.0
-- =====================================================

CREATE DATABASE IF NOT EXISTS citysense
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE citysense;

-- =====================================================
-- 1. TABELA DE USUÁRIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,

    role ENUM(
        'citizen',
        'organization',
        'admin'
    ) NOT NULL DEFAULT 'citizen',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================
-- 2. TABELA DE CATEGORIAS
-- =====================================================

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- =====================================================
-- 3. TABELA DE OCORRÊNCIAS
-- =====================================================

CREATE TABLE IF NOT EXISTS occurrences (
    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,
    category_id INT NOT NULL,

    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,

    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,

    status ENUM(
        'pending',
        'in_analysis',
        'resolved',
        'rejected'
    ) NOT NULL DEFAULT 'pending',

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_occurrences_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_occurrences_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_occurrences_user (user_id),
    INDEX idx_occurrences_category (category_id),
    INDEX idx_occurrences_status (status),
    INDEX idx_occurrences_location (latitude, longitude),
    INDEX idx_occurrences_created (created_at)

) ENGINE=InnoDB;

-- =====================================================
-- 4. TABELA DE HISTÓRICO
-- =====================================================

CREATE TABLE IF NOT EXISTS occurrence_history (
    id INT AUTO_INCREMENT PRIMARY KEY,

    occurrence_id INT NOT NULL,
    user_id INT NOT NULL,

    previous_status ENUM(
        'pending',
        'in_analysis',
        'resolved',
        'rejected'
    ) NULL,

    new_status ENUM(
        'pending',
        'in_analysis',
        'resolved',
        'rejected'
    ) NOT NULL,

    comment VARCHAR(500) NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_history_occurrence
        FOREIGN KEY (occurrence_id)
        REFERENCES occurrences(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_history_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    INDEX idx_history_occurrence (occurrence_id),
    INDEX idx_history_user (user_id),
    INDEX idx_history_created (created_at)

) ENGINE=InnoDB;

-- =====================================================
-- 5. CATEGORIAS INICIAIS
-- =====================================================

INSERT IGNORE INTO categories (name, description) VALUES
(
    'Buracos em vias públicas',
    'Buracos e danos na pavimentação de ruas e avenidas.'
),
(
    'Iluminação pública',
    'Postes apagados, lâmpadas defeituosas e problemas de iluminação.'
),
(
    'Calçadas danificadas',
    'Calçadas quebradas, obstruídas ou em más condições.'
),
(
    'Descarte irregular de lixo',
    'Acúmulo ou descarte inadequado de resíduos.'
),
(
    'Sinalização danificada',
    'Placas, faixas e sinalizações urbanas danificadas.'
),
(
    'Outros problemas',
    'Outras ocorrências relacionadas à infraestrutura urbana.'
);

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
