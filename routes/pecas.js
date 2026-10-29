const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM pecas ORDER BY descricao ASC');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Erro.' }); }
});
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM pecas WHERE id_peca = ?', [req.params.id]);
        if(rows.length > 0) res.json(rows[0]); else res.status(404).json({ error: 'Peça não encontrada' });
    } catch (error) { res.status(500).json({ error: 'Erro.' }); }
});
router.post('/', async (req, res) => {
    try {
        const { codigo_ref, descricao, quantidade_estoque, estoque_minimo, preco_venda } = req.body;
        const [result] = await db.execute(
            'INSERT INTO pecas (codigo_ref, descricao, quantidade_estoque, estoque_minimo, preco_venda) VALUES (?, ?, ?, ?, ?)',
            [codigo_ref, descricao, quantidade_estoque || 0, estoque_minimo || 2, preco_venda || 0]
        );
        res.status(201).json({ success: true, message: 'Peça salva!', id: result.insertId });
    } catch (error) { res.status(500).json({ success: false, error: 'Erro.' }); }
});
router.put('/:id', async (req, res) => {
    try {
        const { codigo_ref, descricao, quantidade_estoque, estoque_minimo, preco_venda } = req.body;
        await db.execute(
            'UPDATE pecas SET codigo_ref = ?, descricao = ?, quantidade_estoque = ?, estoque_minimo = ?, preco_venda = ? WHERE id_peca = ?',
            [codigo_ref, descricao, quantidade_estoque, estoque_minimo, preco_venda, req.params.id]
        );
        res.json({ success: true, message: 'Peça atualizada!' });
    } catch (error) { res.status(500).json({ success: false, error: 'Erro.' }); }
});
router.delete('/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM pecas WHERE id_peca = ?', [req.params.id]);
        res.json({ success: true, message: 'Peça excluída!' });
    } catch (error) { res.status(500).json({ success: false, error: 'Erro.' }); }
});
module.exports = router;