const express = require('express');
const router = express.Router();
const db = require('../config/db');

function normalizarCpf(cpf) {
    return String(cpf || '').replace(/\D/g, '');
}

function cpfValido(cpf) {
    return /^\d{11}$/.test(cpf);
}

router.post('/', async (req, res) => {
    try {
        const { nome, whatsapp, email } = req.body;
        const cpf = normalizarCpf(req.body.cpf);
        if (!cpfValido(cpf)) return res.status(400).json({ success: false, error: 'Informe um CPF com 11 dígitos.' });
        const [result] = await db.execute('INSERT INTO clientes (nome, cpf, whatsapp, email) VALUES (?, ?, ?, ?)', [nome, cpf, whatsapp, email || null]);
        res.status(201).json({ success: true, message: 'Cliente cadastrado!', id: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, error: 'Já existe um cliente cadastrado com este CPF.' });
        res.status(500).json({ success: false, error: 'Erro.' });
    }
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
        const cpf = normalizarCpf(req.body.cpf);
        if (!cpfValido(cpf)) return res.status(400).json({ success: false, error: 'Informe um CPF com 11 dígitos.' });
        await db.execute('UPDATE clientes SET nome = ?, cpf = ?, whatsapp = ?, email = ?, status = ? WHERE id_cliente = ?', [nome, cpf, whatsapp, email || null, status, req.params.id]);
        res.json({ success: true, message: 'Cliente atualizado!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, error: 'Já existe um cliente cadastrado com este CPF.' });
        res.status(500).json({ success: false, error: 'Erro ao atualizar cliente.' });
    }
});
module.exports = router;
