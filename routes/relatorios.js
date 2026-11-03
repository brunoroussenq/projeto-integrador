const express = require('express');
const router = express.Router();
const db = require('../config/db');

function periodo(req, coluna) {
    const params = [];
    let filtro = '';
    if (req.query.inicio && /^\d{4}-\d{2}-\d{2}$/.test(req.query.inicio)) {
        filtro += ` AND ${coluna} >= ?`;
        params.push(`${req.query.inicio} 00:00:00`);
    }
    if (req.query.fim && /^\d{4}-\d{2}-\d{2}$/.test(req.query.fim)) {
        filtro += ` AND ${coluna} < DATE_ADD(?, INTERVAL 1 DAY)`;
        params.push(req.query.fim);
    }
    return { filtro, params };
}

router.get('/vendas', async (req, res) => {
    try {
        const { filtro, params } = periodo(req, 'v.data_venda');
        const [rows] = await db.execute(`
            SELECT v.id_venda, v.id_os, v.valor_total, v.desconto, v.valor_final, v.forma_pagamento,
                   DATE_FORMAT(v.data_venda, '%d/%m/%Y %H:%i') AS data_venda,
                   c.nome AS cliente, e.modelo AS aparelho
            FROM vendas v
            JOIN ordens_servico o ON o.id_os = v.id_os
            JOIN equipamentos e ON e.id_equipamento = o.id_equipamento
            JOIN clientes c ON c.id_cliente = e.id_cliente
            WHERE 1=1 ${filtro}
            ORDER BY v.data_venda DESC`, params);
        const resumo = rows.reduce((acc, v) => {
            acc.quantidade++;
            acc.bruto += Number(v.valor_total || 0);
            acc.descontos += Number(v.desconto || 0);
            acc.total += Number(v.valor_final || 0);
            return acc;
        }, { quantidade: 0, bruto: 0, descontos: 0, total: 0 });
        res.json({ resumo, rows });
    } catch (error) {
        console.error('Erro ao gerar relatório de vendas:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório de vendas.' });
    }
});

router.get('/os', async (req, res) => {
    try {
        const { filtro, params } = periodo(req, 'o.data_abertura');
        const [rows] = await db.execute(`
            SELECT o.id_os, c.nome AS cliente, e.modelo AS aparelho, o.status_os,
                   o.valor_total, DATE_FORMAT(o.data_abertura, '%d/%m/%Y %H:%i') AS data_abertura
            FROM ordens_servico o
            JOIN equipamentos e ON e.id_equipamento = o.id_equipamento
            JOIN clientes c ON c.id_cliente = e.id_cliente
            WHERE 1=1 ${filtro}
            ORDER BY o.data_abertura DESC`, params);
        const resumo = rows.reduce((acc, os) => {
            acc.quantidade++;
            acc.valor += Number(os.valor_total || 0);
            acc.status[os.status_os] = (acc.status[os.status_os] || 0) + 1;
            return acc;
        }, { quantidade: 0, valor: 0, status: {} });
        res.json({ resumo, rows });
    } catch (error) {
        console.error('Erro ao gerar relatório de OS:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório de ordens de serviço.' });
    }
});

router.get('/estoque', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT p.id_peca, p.codigo_ref, p.descricao, p.quantidade_estoque, p.estoque_minimo,
                   p.preco_venda, COALESCE(saidas.quantidade_vendida, 0) AS quantidade_vendida
            FROM pecas p
            LEFT JOIN (
                SELECT id_peca, SUM(quantidade) AS quantidade_vendida
                FROM itens_os GROUP BY id_peca
            ) saidas ON saidas.id_peca = p.id_peca
            ORDER BY (p.quantidade_estoque <= p.estoque_minimo) DESC,
                     quantidade_vendida DESC, p.descricao ASC`);
        const resumo = rows.reduce((acc, p) => {
            acc.itens++;
            acc.valor_em_estoque += Number(p.preco_venda || 0) * Number(p.quantidade_estoque || 0);
            acc.baixo_estoque += Number(p.quantidade_estoque) <= Number(p.estoque_minimo) ? 1 : 0;
            return acc;
        }, { itens: 0, valor_em_estoque: 0, baixo_estoque: 0 });
        res.json({ resumo, rows });
    } catch (error) {
        console.error('Erro ao gerar relatório de estoque:', error);
        res.status(500).json({ error: 'Erro ao gerar relatório de estoque.' });
    }
});

module.exports = router;
