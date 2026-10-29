const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Listar todas as vendas
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT v.id_venda, v.id_os, v.valor_total, v.desconto, v.valor_final, v.forma_pagamento, v.observacoes,
                   DATE_FORMAT(v.data_venda, '%d/%m/%Y %H:%i') AS data_venda_formatada,
                   c.nome AS cliente, e.modelo AS aparelho
            FROM vendas v
            JOIN ordens_servico o ON v.id_os = o.id_os
            JOIN equipamentos e ON o.id_equipamento = e.id_equipamento
            JOIN clientes c ON e.id_cliente = c.id_cliente
            ORDER BY v.id_venda DESC
        `;
        const [rows] = await db.execute(query);
        res.json(rows);
    } catch (error) {
        console.error("Erro GET /vendas:", error);
        res.status(500).json({ error: 'Erro ao buscar vendas.' });
    }
});

// REGRA: Apenas OS com status 'Concluido' podem ser liberadas para faturamento
router.get('/os-pendentes', async (req, res) => {
    try {
        const query = `
            SELECT o.id_os, o.valor_total, o.valor_mao_obra, o.status_os,
                   c.nome AS cliente, e.modelo AS aparelho
            FROM ordens_servico o
            JOIN equipamentos e ON o.id_equipamento = e.id_equipamento
            JOIN clientes c ON e.id_cliente = c.id_cliente
            LEFT JOIN vendas v ON o.id_os = v.id_os
            WHERE v.id_venda IS NULL
              AND o.status_os IN ('Concluido', 'Concluído')
            ORDER BY o.id_os DESC
        `;
        const [rows] = await db.execute(query);
        res.json(rows);
    } catch (error) {
        console.error("Erro GET /vendas/os-pendentes:", error);
        res.status(500).json({ error: 'Erro ao buscar OS pendentes.' });
    }
});

// Detalhes da venda para o modal
router.get('/:id', async (req, res) => {
    try {
        const query = `
            SELECT v.*, DATE_FORMAT(v.data_venda, '%d/%m/%Y %H:%i') AS data_venda_formatada,
                   c.nome AS cliente, c.whatsapp, c.email, e.modelo AS aparelho, e.tipo AS tipo_equipamento,
                   o.defeito_relatado, o.valor_mao_obra
            FROM vendas v
            JOIN ordens_servico o ON v.id_os = o.id_os
            JOIN equipamentos e ON o.id_equipamento = e.id_equipamento
            JOIN clientes c ON e.id_cliente = c.id_cliente
            WHERE v.id_venda = ?
        `;
        const [rows] = await db.execute(query, [req.params.id]);
        if(rows.length > 0) res.json(rows[0]);
        else res.status(404).json({ error: 'Venda não encontrada' });
    } catch (error) {
        console.error("Erro GET /vendas/:id:", error);
        res.status(500).json({ error: 'Erro ao buscar detalhes da venda.' });
    }
});

// Realizar Faturamento da OS (Muda status para Faturado/Pago)
router.post('/', async (req, res) => {
    try {
        const { id_os, desconto, pagamentos, observacoes } = req.body;
        if (!id_os || !pagamentos || pagamentos.length === 0) return res.status(400).json({ success: false, error: 'OS e pagamentos obrigatórios.' });

        const [osRows] = await db.execute('SELECT id_os, valor_total, status_os FROM ordens_servico WHERE id_os = ?', [id_os]);
        if (osRows.length === 0) return res.status(404).json({ success: false, error: 'OS não encontrada.' });

        // Validação: Somente 'Concluido' pode ser faturada
        const st = osRows[0].status_os;
        if (st !== 'Concluido' && st !== 'Concluído') {
            return res.status(400).json({ 
                success: false, 
                error: `Esta OS está com status "${st}". Somente Ordens de Serviço com status "Concluído" podem ser faturadas!` 
            });
        }

        const valor_total = Number(osRows[0].valor_total || 0);
        const valor_desconto = Number(desconto || 0);
        const valor_final = Math.max(0, valor_total - valor_desconto);
        const forma_pagamento_str = pagamentos.map(p => `${p.forma} (R$ ${Number(p.valor).toFixed(2)})`).join(' + ');

        const [vendaRes] = await db.execute(
            'INSERT INTO vendas (id_os, valor_total, desconto, valor_final, forma_pagamento, observacoes) VALUES (?, ?, ?, ?, ?, ?)',
            [id_os, valor_total, valor_desconto, valor_final, forma_pagamento_str, observacoes || null]
        );

        // Atualizar status da OS para Faturado/Pago
        await db.execute("UPDATE ordens_servico SET status_os = 'Faturado/Pago' WHERE id_os = ?", [id_os]);

        const textoObs = `OS Faturada (Venda #${vendaRes.insertId}) - Total: R$ ${valor_total.toFixed(2)} | Desconto: R$ ${valor_desconto.toFixed(2)} | Final: R$ ${valor_final.toFixed(2)} | Status alterado para Faturado/Pago | Formas: [${forma_pagamento_str}]`;
        await db.execute('INSERT INTO os_historico (id_os, tipo, descricao) VALUES (?, ?, ?)', [id_os, 'Status', textoObs]);

        res.status(201).json({ success: true, message: 'Venda faturada com sucesso!', id_venda: vendaRes.insertId });
    } catch (error) {
        console.error("Erro POST /vendas:", error);
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, error: 'Esta OS já foi faturada!' });
        res.status(500).json({ success: false, error: 'Erro ao processar faturamento.' });
    }
});

// Atualizar Venda
router.put('/:id', async (req, res) => {
    try {
        const { desconto, pagamentos, observacoes } = req.body;
        if (!pagamentos || pagamentos.length === 0) return res.status(400).json({ success: false, error: 'Pagamentos obrigatórios.' });

        const [venda] = await db.execute('SELECT valor_total, id_os FROM vendas WHERE id_venda = ?', [req.params.id]);
        if (venda.length === 0) return res.status(404).json({ success: false, error: 'Venda não encontrada.' });
        
        const valor_total = Number(venda[0].valor_total);
        const valor_desconto = Number(desconto || 0);
        const valor_final = Math.max(0, valor_total - valor_desconto);
        const forma_pagamento_str = pagamentos.map(p => `${p.forma} (R$ ${Number(p.valor).toFixed(2)})`).join(' + ');
        
        await db.execute(
            'UPDATE vendas SET desconto = ?, valor_final = ?, forma_pagamento = ?, observacoes = ? WHERE id_venda = ?',
            [valor_desconto, valor_final, forma_pagamento_str, observacoes || null, req.params.id]
        );

        const textoObs = `Venda #${req.params.id} Retificada - Desconto: R$ ${valor_desconto.toFixed(2)} | Final: R$ ${valor_final.toFixed(2)} | Formas: [${forma_pagamento_str}]`;
        await db.execute('INSERT INTO os_historico (id_os, tipo, descricao) VALUES (?, ?, ?)', [venda[0].id_os, 'Status', textoObs]);

        res.json({ success: true, message: 'Venda atualizada com sucesso!' });
    } catch (error) {
        console.error("Erro PUT /vendas/:id:", error);
        res.status(500).json({ success: false, error: 'Erro ao atualizar venda.' });
    }
});

// CANCELAR VENDA (RESTAURA O STATUS DA OS PARA 'Concluido' E LIBERA EDIÇÃO)
router.delete('/:id', async (req, res) => {
    try {
        const [venda] = await db.execute('SELECT id_venda, id_os, valor_final FROM vendas WHERE id_venda = ?', [req.params.id]);
        if (venda.length === 0) return res.status(404).json({ success: false, error: 'Venda não encontrada.' });

        const id_os = venda[0].id_os;
        const id_venda = venda[0].id_venda;

        // 1. Excluir a venda
        await db.execute('DELETE FROM vendas WHERE id_venda = ?', [id_venda]);

        // 2. Restaurar status da OS para Concluido
        await db.execute("UPDATE ordens_servico SET status_os = 'Concluido' WHERE id_os = ?", [id_os]);

        // 3. Registrar no histórico da OS
        const textoObs = `Venda #${id_venda} cancelada. A Ordem de Serviço retornou para o status "Concluído" e está liberada para alterações ou novo faturamento.`;
        await db.execute('INSERT INTO os_historico (id_os, tipo, descricao) VALUES (?, ?, ?)', [id_os, 'Status', textoObs]);

        res.json({ 
            success: true, 
            message: 'Venda cancelada com sucesso! A Ordem de Serviço retornou para o status "Concluído" e está liberada para edição.' 
        });
    } catch (error) {
        console.error("Erro DELETE /vendas/:id:", error);
        res.status(500).json({ success: false, error: 'Erro ao cancelar a venda.' });
    }
});

module.exports = router;
