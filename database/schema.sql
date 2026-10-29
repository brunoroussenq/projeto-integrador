CREATE DATABASE IF NOT EXISTS db_assistencia_os;
USE db_assistencia_os;

CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL
);
INSERT IGNORE INTO usuarios (id_usuario, nome, email, senha) VALUES (1, 'Administrador', 'admin@admin.com', '123456');

CREATE TABLE IF NOT EXISTS clientes (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    status ENUM('Ativo', 'Bloqueado') DEFAULT 'Ativo',
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS equipamentos (
    id_equipamento INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    marca VARCHAR(50),
    modelo VARCHAR(80),
    num_serie VARCHAR(80),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pecas (
    id_peca INT AUTO_INCREMENT PRIMARY KEY,
    codigo_ref VARCHAR(40) UNIQUE,
    descricao VARCHAR(150) NOT NULL,
    quantidade_estoque INT NOT NULL DEFAULT 0,
    estoque_minimo INT NOT NULL DEFAULT 2,
    preco_venda DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS ordens_servico (
    id_os INT AUTO_INCREMENT PRIMARY KEY,
    id_equipamento INT NOT NULL,
    defeito_relatado TEXT NOT NULL,
    laudo_tecnico TEXT,
    valor_mao_obra DECIMAL(10,2) DEFAULT 0.00,
    valor_total DECIMAL(10,2) DEFAULT 0.00,
    status_os ENUM('Recebido','Diagnostico','Aprovado','Aguardando_Peca','Concluido','Faturado/Pago','Cancelado') DEFAULT 'Recebido',
    data_abertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_equipamento) REFERENCES equipamentos(id_equipamento)
);

CREATE TABLE IF NOT EXISTS itens_os (
    id_item INT AUTO_INCREMENT PRIMARY KEY,
    id_os INT NOT NULL,
    id_peca INT NOT NULL,
    quantidade INT NOT NULL DEFAULT 1,
    valor_unitario DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_os) REFERENCES ordens_servico(id_os) ON DELETE CASCADE,
    FOREIGN KEY (id_peca) REFERENCES pecas(id_peca)
);

CREATE TABLE IF NOT EXISTS os_historico (
    id_historico INT AUTO_INCREMENT PRIMARY KEY,
    id_os INT NOT NULL,
    tipo ENUM('Observação', 'Status') NOT NULL,
    descricao TEXT NOT NULL,
    data_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_os) REFERENCES ordens_servico(id_os) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendas (
    id_venda INT AUTO_INCREMENT PRIMARY KEY,
    id_os INT NOT NULL UNIQUE,
    data_venda TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valor_total DECIMAL(10,2) NOT NULL,
    desconto DECIMAL(10,2) DEFAULT 0.00,
    valor_final DECIMAL(10,2) NOT NULL,
    forma_pagamento VARCHAR(255) NOT NULL,
    observacoes TEXT,
    FOREIGN KEY (id_os) REFERENCES ordens_servico(id_os) ON DELETE CASCADE
);
