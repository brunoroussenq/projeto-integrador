const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM pecas ORDER BY descricao ASC');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Erro ao buscar peças.' }); }
});

router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM pecas WHERE id_peca = ?', [req.params.id]);
        if(rows.length > 0) res.json(rows[0]); else res.status(404).json({ error: 'Peça não encontrada' });
    } catch (error) { res.status(500).json({ error: 'Erro ao buscar peça.' }); }
});

router.post('/', async (req, res) => {
    try {
        const { codigo_ref, descricao, quantidade_estoque, estoque_minimo, preco_venda } = req.body;
        const [result] = await db.execute(
            'INSERT INTO pecas (codigo_ref, descricao, quantidade_estoque, estoque_minimo, preco_venda) VALUES (?, ?, ?, ?, ?)',
            [codigo_ref, descricao, quantidade_estoque || 0, estoque_minimo || 2, preco_venda || 0]
        );
        res.status(201).json({ success: true, message: 'Peça salva!', id: result.insertId });
    } catch (error) { res.status(500).json({ success: false, error: 'Erro ao salvar peça.' }); }
});

router.put('/:id', async (req, res) => {
    try {
        const { codigo_ref, descricao, quantidade_estoque, estoque_minimo, preco_venda } = req.body;
        await db.execute(
            'UPDATE pecas SET codigo_ref = ?, descricao = ?, estoque_minimo = ?, preco_venda = ? WHERE id_peca = ?',
            [codigo_ref, descricao, estoque_minimo, preco_venda, req.params.id]
        );
        res.json({ success: true, message: 'Peça atualizada!' });
    } catch (error) { res.status(500).json({ success: false, error: 'Erro ao atualizar peça.' }); }
});

router.get('/:id/movimentos', async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT id_movimento, tipo, quantidade, saldo_anterior, saldo_atual, motivo,
                    DATE_FORMAT(data_movimento, '%d/%m/%Y %H:%i') AS data_movimento
             FROM movimentos_estoque WHERE id_peca = ? ORDER BY id_movimento DESC LIMIT 100`,
            [req.params.id]
        );
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Erro ao buscar movimentações.' }); }
});

router.post('/:id/movimentos', async (req, res) => {
    const quantidade = Number(req.body.quantidade);
    const tipo = req.body.tipo;
    const motivo = String(req.body.motivo || '').trim();
    if (!Number.isInteger(quantidade) || quantidade <= 0 || !['Entrada', 'Saída'].includes(tipo) || !motivo) {
        return res.status(400).json({ success: false, error: 'Informe tipo, quantidade positiva e motivo.' });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [pecas] = await connection.execute('SELECT quantidade_estoque FROM pecas WHERE id_peca = ? FOR UPDATE', [req.params.id]);
        if (!pecas.length) {
            await connection.rollback();
            return res.status(404).json({ success: false, error: 'Peça não encontrada.' });
        }
        const anterior = Number(pecas[0].quantidade_estoque);
        const atual = anterior + (tipo === 'Entrada' ? quantidade : -quantidade);
        if (atual < 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, error: `Saldo insuficiente. Disponível: ${anterior}.` });
        }
        await connection.execute('UPDATE pecas SET quantidade_estoque = ? WHERE id_peca = ?', [atual, req.params.id]);
        await connection.execute(
            'INSERT INTO movimentos_estoque (id_peca, tipo, quantidade, saldo_anterior, saldo_atual, motivo) VALUES (?, ?, ?, ?, ?, ?)',
            [req.params.id, tipo, quantidade, anterior, atual, motivo]
        );
        await connection.commit();
        res.status(201).json({ success: true, saldo: atual, message: 'Movimentação registrada.' });
    } catch (error) {
        if (connection) await connection.rollback();
        res.status(500).json({ success: false, error: 'Erro ao registrar movimentação.' });
    } finally {
        if (connection) connection.release();
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM pecas WHERE id_peca = ?', [req.params.id]);
        res.json({ success: true, message: 'Peça excluída!' });
    } catch (error) { res.status(500).json({ success: false, error: 'Erro ao excluir peça.' }); }
});
module.exports = router;
