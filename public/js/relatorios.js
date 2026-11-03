(() => {
    const tipoSelect = document.getElementById('relatorioTipo');
    if (!tipoSelect) return;

    const configuracoes = {
        vendas: {
            url: '/api/relatorios/vendas', titulo: 'Relatório de vendas',
            colunas: ['Venda', 'OS', 'Data', 'Cliente', 'Aparelho', 'Pagamento', 'Bruto', 'Desconto', 'Total'],
            linhas: r => [
                `#${r.id_venda}`, `#${r.id_os}`, r.data_venda, r.cliente, r.aparelho || '—', r.forma_pagamento,
                moeda(r.valor_total), moeda(r.desconto), moeda(r.valor_final)
            ],
            resumo: r => [
                ['Vendas no período', numero(r.quantidade), 'Registros faturados'],
                ['Total recebido', moeda(r.total), 'Valor após descontos'],
                ['Descontos', moeda(r.descontos), `Valor bruto: ${moeda(r.bruto)}`]
            ], total: d => d.rows.length
        },
        os: {
            url: '/api/relatorios/os', titulo: 'Relatório de ordens de serviço',
            colunas: ['OS', 'Abertura', 'Cliente', 'Aparelho', 'Status', 'Valor'],
            linhas: r => [`#${r.id_os}`, r.data_abertura, r.cliente, r.aparelho || '—', r.status_os.replaceAll('_', ' '), moeda(r.valor_total)],
            resumo: r => [
                ['Ordens no período', numero(r.quantidade), 'Total de atendimentos'],
                ['Valor total das OS', moeda(r.valor), 'Valores registrados nas ordens'],
                ['Status diferentes', numero(Object.keys(r.status).length), 'Distribuição exibida abaixo']
            ], total: d => d.rows.length
        },
        estoque: {
            url: '/api/relatorios/estoque', titulo: 'Relatório de estoque',
            colunas: ['Código', 'Peça', 'Em estoque', 'Mínimo', 'Saídas em OS', 'Preço unitário', 'Situação'],
            linhas: r => [r.codigo_ref || '—', r.descricao, numero(r.quantidade_estoque), numero(r.estoque_minimo), numero(r.quantidade_vendida), moeda(r.preco_venda), Number(r.quantidade_estoque) <= Number(r.estoque_minimo) ? 'Baixo estoque' : 'Normal'],
            resumo: r => [
                ['Peças cadastradas', numero(r.itens), 'Itens no catálogo'],
                ['Abaixo do mínimo', numero(r.baixo_estoque), 'Requerem reposição'],
                ['Valor em estoque', moeda(r.valor_em_estoque), 'Estimativa pelo preço de venda']
            ], total: d => d.rows.length
        }
    };

    let dadosAtuais = null;
    let relatorioAtual = 'vendas';
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    document.getElementById('dataInicio').value = dataISO(inicioMes);
    document.getElementById('dataFim').value = dataISO(hoje);

    function dataISO(data) {
        return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
    }
    function moeda(valor) {
        return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    function numero(valor) { return Number(valor || 0).toLocaleString('pt-BR'); }
    function escapar(valor) {
        return String(valor ?? '').replace(/[&<>"']/g, caractere => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caractere]);
    }
    function mostrarResumo(cartoes) {
        document.getElementById('relatorioResumo').innerHTML = cartoes.map(([titulo, valor, apoio]) => `
            <div class="col-12 col-md-4"><article class="card bg-dark border-secondary h-100"><div class="card-body">
                <p class="text-secondary small mb-2">${escapar(titulo)}</p><p class="h3 mb-2">${escapar(valor)}</p><p class="text-secondary small mb-0">${escapar(apoio)}</p>
            </div></article></div>`).join('');
    }
    function atualizarTabela(config, dados) {
        const cabecalho = document.getElementById('relatorioCabecalho');
        const corpo = document.getElementById('relatorioLinhas');
        cabecalho.innerHTML = `<tr>${config.colunas.map(c => `<th scope="col">${escapar(c)}</th>`).join('')}</tr>`;
        if (!dados.rows.length) {
            corpo.innerHTML = `<tr><td colspan="${config.colunas.length}" class="text-center text-secondary py-5">Nenhum registro encontrado para os filtros selecionados.</td></tr>`;
            return;
        }
        corpo.innerHTML = dados.rows.map(row => `<tr>${config.linhas(row).map(c => `<td>${escapar(c)}</td>`).join('')}</tr>`).join('');
        if (relatorioAtual === 'os') {
            const status = Object.entries(dados.resumo.status || {}).map(([nome, qtd]) => `${nome.replaceAll('_', ' ')}: ${numero(qtd)}`).join(' · ');
            if (status) document.getElementById('relatorioContagem').textContent += `  |  ${status}`;
        }
    }
    async function carregarRelatorio() {
        const erro = document.getElementById('relatorioErro');
        const loading = document.getElementById('relatorioLoading');
        const conteudo = document.getElementById('relatorioConteudo');
        erro.classList.add('d-none');
        conteudo.classList.add('opacity-50');
        loading.classList.remove('d-none');
        const tipo = tipoSelect.value;
        const config = configuracoes[tipo];
        const query = new URLSearchParams();
        if (tipo !== 'estoque') {
            const inicio = document.getElementById('dataInicio').value;
            const fim = document.getElementById('dataFim').value;
            if (inicio && fim && inicio > fim) {
                loading.classList.add('d-none');
                conteudo.classList.remove('opacity-50');
                erro.textContent = 'A data inicial deve ser anterior ou igual à data final.';
                erro.classList.remove('d-none');
                return;
            }
            if (inicio) query.set('inicio', inicio);
            if (fim) query.set('fim', fim);
        }
        try {
            const response = await fetch(`${config.url}${query.size ? `?${query}` : ''}`);
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error('O servidor ainda não carregou as rotas de relatórios. Reinicie o servidor e atualize esta página.');
            }
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Não foi possível carregar o relatório.');
            dadosAtuais = data;
            relatorioAtual = tipo;
            document.getElementById('relatorioTitulo').textContent = config.titulo;
            document.getElementById('relatorioContagem').textContent = `${numero(config.total(data))} registros`;
            mostrarResumo(config.resumo(data.resumo));
            atualizarTabela(config, data);
        } catch (e) {
            erro.textContent = e.message || 'Erro ao carregar o relatório.';
            erro.classList.remove('d-none');
        } finally {
            loading.classList.add('d-none');
            conteudo.classList.remove('opacity-50');
        }
    }

    window.exportarRelatorioCSV = function () {
        if (!dadosAtuais) return;
        const config = configuracoes[relatorioAtual];
        const matriz = [config.colunas, ...dadosAtuais.rows.map(config.linhas)];
        const csv = matriz.map(linha => linha.map(valor => `"${String(valor ?? '').replaceAll('"', '""')}"`).join(';')).join('\r\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio-${relatorioAtual}-${dataISO(new Date())}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    window.imprimirRelatorio = function () {
        const params = new URLSearchParams({ relatorio: tipoSelect.value });
        if (tipoSelect.value !== 'estoque') {
            const inicio = document.getElementById('dataInicio').value;
            const fim = document.getElementById('dataFim').value;
            if (inicio) params.set('inicio', inicio);
            if (fim) params.set('fim', fim);
        }
        window.open(`imprimir-relatorio.html?${params.toString()}`, '_blank', 'noopener');
    };

    tipoSelect.addEventListener('change', () => {
        const periodoVisivel = tipoSelect.value !== 'estoque';
        document.getElementById('filtroInicio').classList.toggle('d-none', !periodoVisivel);
        document.getElementById('filtroFim').classList.toggle('d-none', !periodoVisivel);
        carregarRelatorio();
    });
    document.getElementById('btnAplicarRelatorio').addEventListener('click', carregarRelatorio);
    carregarRelatorio();
})();
