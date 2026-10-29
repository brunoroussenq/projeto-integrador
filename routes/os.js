const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT o.id_os, c.nome AS cliente, e.modelo AS aparelho, 
                   DATE_FORMAT(o.data_abertura, '%d/%m/%Y %H:%i') as data_abertura, 
                   o.status_os, o.valor_mao_obra, o.valor_total 
            FROM ordens_servico o 
            JOIN equipamentos e ON o.id_equipamento = e.id_equipamento 
            JOIN clientes c ON e.id_cliente = c.id_cliente 
            ORDER BY o.id_os DESC
        `;
        const [rows] = await db.execute(query);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Erro ao buscar OS.' }); }
});

router.get('/:id', async (req, res) => {
    try {
        const query = `
            SELECT o.*, DATE_FORMAT(o.data_abertura, '%d/%m/%Y %H:%i') as data_abertura_formatada, 
                   c.nome AS cliente, c.whatsapp, c.email, 
                   e.modelo AS aparelho, e.tipo AS tipo_equipamento, e.marca, e.num_serie 
            FROM ordens_servico o 
            JOIN equipamentos e ON o.id_equipamento = e.id_equipamento 
            JOIN clientes c ON e.id_cliente = c.id_cliente 
            WHERE o.id_os = ?
        `;
        const [rows] = await db.execute(query, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'OS não encontrada' });
        res.json(rows[0]);
    } catch (error) { res.status(500).json({ error: 'Erro ao buscar OS.' }); }
});

router.get('/:id/itens', async (req, res) => {
    try {
        const query = `
            SELECT i.id_item, i.id_peca, p.descricao, p.codigo_ref, i.quantidade, i.valor_unitario, 
                   (i.quantidade * i.valor_unitario) AS subtotal 
            FROM itens_os i 
            JOIN pecas p ON i.id_peca = p.id_peca 
            WHERE i.id_os = ? 
            ORDER BY i.id_item ASC
        `;
        const [rows] = await db.execute(query, [req.params.id]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Erro ao buscar itens da OS.' }); }
});

// Adicionar peça com verificação de bloqueio
router.post('/:id/itens', async (req, res) => {
    try {
        const id_os = req.params.id;
        const [osStatus] = await db.execute('SELECT status_os FROM ordens_servico WHERE id_os = ?', [id_os]);
        if (osStatus.length > 0 && (osStatus[0].status_os === 'Faturado/Pago' || osStatus[0].status_os === 'Faturado')) {
            return res.status(400).json({ success: false, error: 'Esta OS está faturada e não pode receber novas peças.' });
        }

        const { id_peca, quantidade } = req.body;
        const qtd = parseInt(quantidade) || 1;
        const [pecaRows] = await db.execute('SELECT preco_venda, descricao FROM pecas WHERE id_peca = ?', [id_peca]);
        if (pecaRows.length === 0) return res.status(404).json({ success: false, error: 'Peça não encontrada.' });
        const valor_unitario = Number(pecaRows[0].preco_venda);
        
        await db.execute('INSERT INTO itens_os (id_os, id_peca, quantidade, valor_unitario) VALUES (?, ?, ?, ?)', [id_os, id_peca, qtd, valor_unitario]);
        await db.execute('INSERT INTO os_historico (id_os, tipo, descricao) VALUES (?, ?, ?)', [id_os, 'Observação', `Peça adicionada: ${pecaRows[0].descricao} (${qtd}x R$ ${valor_unitario.toFixed(2)})`]);
        
        const [sumRows] = await db.execute('SELECT COALESCE(SUM(quantidade * valor_unitario), 0) AS total_pecas FROM itens_os WHERE id_os = ?', [id_os]);
        const [osRows] = await db.execute('SELECT valor_mao_obra FROM ordens_servico WHERE id_os = ?', [id_os]);
        const valor_total = Number(sumRows[0].total_pecas) + Number(osRows[0].valor_mao_obra || 0);
        
        await db.execute('UPDATE ordens_servico SET valor_total = ? WHERE id_os = ?', [valor_total, id_os]);
        res.status(201).json({ success: true, message: 'Peça vinculada!', total_pecas: Number(sumRows[0].total_pecas), valor_total });
    } catch (error) { res.status(500).json({ success: false, error: 'Erro ao vincular peça.' }); }
});

// Remover peça com verificação de bloqueio
router.delete('/:id/itens/:id_item', async (req, res) => {
    try {
        const { id, id_item } = req.params;
        const [osStatus] = await db.execute('SELECT status_os FROM ordens_servico WHERE id_os = ?', [id]);
        if (osStatus.length > 0 && (osStatus[0].status_os === 'Faturado/Pago' || osStatus[0].status_os === 'Faturado')) {
            return res.status(400).json({ success: false, error: 'Esta OS está faturada e suas peças não podem ser removidas.' });
        }

        const [itemRows] = await db.execute('SELECT i.quantidade, p.descricao FROM itens_os i JOIN pecas p ON i.id_peca = p.id_peca WHERE i.id_item = ? AND i.id_os = ?', [id_item, id]);
        await db.execute('DELETE FROM itens_os WHERE id_item = ? AND id_os = ?', [id_item, id]);
        if (itemRows.length > 0) await db.execute('INSERT INTO os_historico (id_os, tipo, descricao) VALUES (?, ?, ?)', [id, 'Observação', `Peça removida: ${itemRows[0].descricao}`]);
        
        const [sumRows] = await db.execute('SELECT COALESCE(SUM(quantidade * valor_unitario), 0) AS total_pecas FROM itens_os WHERE id_os = ?', [id]);
        const [osRows] = await db.execute('SELECT valor_mao_obra FROM ordens_servico WHERE id_os = ?', [id]);
        const valor_total = Number(sumRows[0].total_pecas) + Number(osRows[0].valor_mao_obra || 0);
        
        await db.execute('UPDATE ordens_servico SET valor_total = ? WHERE id_os = ?', [valor_total, id]);
        res.json({ success: true, message: 'Peça removida!', total_pecas: Number(sumRows[0].total_pecas), valor_total });
    } catch (error) { res.status(500).json({ success: false, error: 'Erro ao remover peça.' }); }
});

router.get('/:id/historico', async (req, res) => {
    try {
        const query = `SELECT tipo, descricao, DATE_FORMAT(data_registro, '%d/%m/%Y %H:%i') as data_reg FROM os_historico WHERE id_os = ? ORDER BY id_historico DESC`;
        const [rows] = await db.execute(query, [req.params.id]);
        res.json(rows);
    } catch (error) { res.status(500).json({ error: 'Erro ao buscar histórico.' }); }
});

router.post('/:id/observacoes', async (req, res) => {
    try {
        const { observacao } = req.body;
        await db.execute('INSERT INTO os_historico (id_os, tipo, descricao) VALUES (?, ?, ?)', [req.params.id, 'Observação', observacao]);
        res.json({ success: true, message: 'Observação adicionada!' });
    } catch (error) { res.status(500).json({ success: false, error: 'Erro.' }); }
});

router.post('/', async (req, res) => {
    try {
        const { id_cliente, aparelho, defeito } = req.body;
        const [eqRes] = await db.execute('INSERT INTO equipamentos (id_cliente, tipo, marca, modelo) VALUES (?, ?, ?, ?)', [id_cliente, 'Geral', 'Genérica', aparelho]);
        const [osRes] = await db.execute('INSERT INTO ordens_servico (id_equipamento, defeito_relatado, status_os, valor_mao_obra, valor_total) VALUES (?, ?, ?, 0.00, 0.00)', [eqRes.insertId, defeito, 'Recebido']);
        await db.execute('INSERT INTO os_historico (id_os, tipo, descricao) VALUES (?, ?, ?)', [osRes.insertId, 'Status', 'OS Aberta com status Recebido']);
        res.status(201).json({ success: true, message: 'OS Aberta com sucesso!' });
    } catch (error) { res.status(500).json({ success: false, error: 'Erro ao abrir OS.' }); }
});

// Atualizar OS com bloqueio de Faturada
router.put('/:id', async (req, res) => {
    try {
        const { status_os, valor_mao_obra } = req.body;
        const id_os = req.params.id;
        const [atual] = await db.execute('SELECT status_os, valor_mao_obra FROM ordens_servico WHERE id_os = ?', [id_os]);
        if (atual.length === 0) return res.status(404).json({ success: false, error: 'OS não encontrada.' });
        
        // REGRA: Não permitir alterar OS faturada
        if (atual[0].status_os === 'Faturado/Pago' || atual[0].status_os === 'Faturado') {
            return res.status(400).json({ 
                success: false, 
                error: 'Esta Ordem de Serviço já foi faturada e está bloqueada para alterações. Para editá-la, cancele a venda correspondente no menu Vendas.' 
            });
        }

        const novoMaoObra = valor_mao_obra !== undefined ? Number(valor_mao_obra) : Number(atual[0].valor_mao_obra);
        const [sumRows] = await db.execute('SELECT COALESCE(SUM(quantidade * valor_unitario), 0) AS total_pecas FROM itens_os WHERE id_os = ?', [id_os]);
        const valor_total = Number(sumRows[0].total_pecas) + novoMaoObra;
        
        await db.execute('UPDATE ordens_servico SET status_os = ?, valor_mao_obra = ?, valor_total = ? WHERE id_os = ?', [status_os, novoMaoObra, valor_total, id_os]);
        if (atual[0].status_os !== status_os) await db.execute('INSERT INTO os_historico (id_os, tipo, descricao) VALUES (?, ?, ?)', [id_os, 'Status', `Status alterado para ${status_os.replace('_', ' ')}`]);
        
        res.json({ success: true, message: 'Salvo com sucesso!', valor_total, total_pecas: Number(sumRows[0].total_pecas) });
    } catch (error) { res.status(500).json({ success: false, error: 'Erro ao atualizar OS.' }); }
});
module.exports = router;