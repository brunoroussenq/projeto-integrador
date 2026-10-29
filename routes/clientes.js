const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.post('/', async (req, res) => {
    try {
        const { nome, whatsapp, email } = req.body;
        const [result] = await db.execute('INSERT INTO clientes (nome, whatsapp, email) VALUES (?, ?, ?)', [nome, whatsapp, email]);
        res.status(201).json({ success: true, message: 'Cliente cadastrado!', id: result.insertId });
    } catch (error) { res.status(500).json({ success: false, error: 'Erro.' }); }
});

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM clientes ORDER BY id_cliente DESC');
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Erro.' }); }
});

router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM clientes WHERE id_cliente = ?', [req.params.id]);
        if(rows.length > 0) res.json(rows[0]); else res.status(404).json({ error: 'Cliente não encontrado' });
    } catch (error) { res.status(500).json({ error: 'Erro ao buscar cliente.' }); }
});

router.put('/:id', async (req, res) => {
    try {
        const { nome, whatsapp, email, status } = req.body;
        await db.execute('UPDATE clientes SET nome = ?, whatsapp = ?, email = ?, status = ? WHERE id_cliente = ?', [nome, whatsapp, email, status, req.params.id]);
        res.json({ success: true, message: 'Cliente atualizado!' });
    } catch (error) { res.status(500).json({ success: false, error: 'Erro ao atualizar cliente.' }); }
});
module.exports = router;