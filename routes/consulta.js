const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.post('/os', async (req, res) => {
    const cpf = String(req.body.cpf || '').replace(/\D/g, '');
    if (!/^\d{11}$/.test(cpf)) {
        return res.status(400).json({ error: 'Informe um CPF com 11 dígitos.' });
    }

    try {
        const [rows] = await db.execute(`
            SELECT o.id_os, o.status_os,
                   DATE_FORMAT(o.data_abertura, '%d/%m/%Y') AS data_abertura,
                   COALESCE(e.modelo, e.tipo, 'Equipamento') AS aparelho
            FROM clientes c
            JOIN equipamentos e ON e.id_cliente = c.id_cliente
            JOIN ordens_servico o ON o.id_equipamento = e.id_equipamento
            WHERE c.cpf = ?
            ORDER BY o.data_abertura DESC, o.id_os DESC`, [cpf]);
        res.json({ ordens: rows });
    } catch (error) {
        console.error('Erro na consulta pública de OS:', error);
        res.status(500).json({ error: 'Não foi possível consultar as ordens agora.' });
    }
});

module.exports = router;
