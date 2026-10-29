const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/stats', async (req, res) => {
    try {
        const [diagnostico] = await db.execute("SELECT COUNT(*) as qtd FROM ordens_servico WHERE status_os IN ('Recebido', 'Diagnostico')");
        const [concluido] = await db.execute("SELECT COUNT(*) as qtd FROM ordens_servico WHERE status_os IN ('Aprovado', 'Concluido', 'Faturado/Pago', 'Faturado')");
        const [peca] = await db.execute("SELECT COUNT(*) as qtd FROM ordens_servico WHERE status_os = 'Aguardando_Peca'");
        res.json({ diagnostico: diagnostico[0].qtd, concluido: concluido[0].qtd, peca: peca[0].qtd });
    } catch (error) { res.status(500).json({ error: 'Erro ao carregar dashboard.' }); }
});
module.exports = router;