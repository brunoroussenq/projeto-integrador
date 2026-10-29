const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const [users] = await db.execute('SELECT id_usuario, nome, email FROM usuarios WHERE email = ? AND senha = ?', [email, senha]);
        if (users.length > 0) res.json({ success: true, user: users[0] });
        else res.status(401).json({ success: false, message: 'E-mail ou senha incorretos' });
    } catch (error) { res.status(500).json({ success: false, error: 'Erro no servidor.' }); }
});
module.exports = router;