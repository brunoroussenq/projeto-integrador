(() => {
    const query = new URLSearchParams(window.location.search);
    const tipo = query.get('relatorio') || 'vendas';
    const relatorios = {
        vendas: {
            endpoint: '/api/relatorios/vendas', titulo: 'Vendas', secao: 'Vendas detalhadas',
            colunas: ['Venda', 'OS', 'Data', 'Cliente', 'Aparelho', 'Pagamento', 'Bruto', 'Desconto', 'Total'],
            alinhamentoDireita: [6, 7, 8],
            linhas: r => [`#${r.id_venda}`, `#${r.id_os}`, r.data_venda, r.cliente, r.aparelho || '—', r.forma_pagamento, moeda(r.valor_total), moeda(r.desconto), moeda(r.valor_final)],
            resumo: r => [
                ['Vendas no período', inteiro(r.quantidade), 'Registros faturados'],
                ['Total recebido', moeda(r.total), 'Valor após descontos'],
                ['Descontos concedidos', moeda(r.descontos), `Valor bruto: ${moeda(r.bruto)}`]
            ]
        },
        os: {
            endpoint: '/api/relatorios/os', titulo: 'Ordens de Serviço', secao: 'Ordens de Serviço detalhadas',
            colunas: ['OS', 'Abertura', 'Cliente', 'Aparelho', 'Status', 'Valor registrado'],
            alinhamentoDireita: [5],
            linhas: r => [`#${r.id_os}`, r.data_abertura, r.cliente, r.aparelho || '—', r.status_os.replaceAll('_', ' '), moeda(r.valor_total)],
            resumo: r => [
                ['Ordens no período', inteiro(r.quantidade), 'Total de atendimentos'],
                ['Valor total registrado', moeda(r.valor), 'Soma dos valores das OS'],
                ['Status diferentes', inteiro(Object.keys(r.status || {}).length), Object.entries(r.status || {}).map(([nome, qtd]) => `${nome.replaceAll('_', ' ')}: ${inteiro(qtd)}`).join(' · ') || 'Sem ordens no período']
            ]
        },
        estoque: {
            endpoint: '/api/relatorios/estoque', titulo: 'Estoque', secao: 'Peças e movimentação',
            colunas: ['Código', 'Peça', 'Em estoque', 'Mínimo', 'Saídas em OS', 'Preço unitário', 'Situação'],
            alinhamentoDireita: [2, 3, 4, 5],
            linhas: r => [r.codigo_ref || '—', r.descricao, inteiro(r.quantidade_estoque), inteiro(r.estoque_minimo), inteiro(r.quantidade_vendida), moeda(r.preco_venda), Number(r.quantidade_estoque) <= Number(r.estoque_minimo) ? 'Baixo estoque' : 'Normal'],
            resumo: r => [
                ['Peças cadastradas', inteiro(r.itens), 'Itens no catálogo'],
                ['Abaixo do mínimo', inteiro(r.baixo_estoque), 'Precisam de reposição'],
                ['Valor em estoque', moeda(r.valor_em_estoque), 'Estimativa pelo preço de venda']
            ]
        }
    };
    const config = relatorios[tipo] || relatorios.vendas;

    function moeda(valor) {
        return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    function inteiro(valor) { return Number(valor || 0).toLocaleString('pt-BR'); }
    function dataLegivel(valor) {
        const partes = valor.split('-');
        return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : valor;
    }
    function criarCelula(tag, texto, classe = '') {
        const celula = document.createElement(tag);
        celula.textContent = texto ?? '';
        if (classe) celula.className = classe;
        return celula;
    }
    function mostrarResumo(itens) {
        const resumo = document.getElementById('resumoRelatorio');
        resumo.replaceChildren();
        itens.forEach(([rotulo, valor, observacao]) => {
            const card = document.createElement('div');
            card.className = 'summary-card';
            const label = document.createElement('span');
            label.className = 'summary-label';
            label.textContent = rotulo;
            const total = document.createElement('strong');
            total.className = 'summary-value';
            total.textContent = valor;
            const nota = document.createElement('span');
            nota.className = 'summary-note';
            nota.textContent = observacao;
            card.append(label, total, nota);
            resumo.append(card);
        });
    }
    function mostrarLinhas(rows) {
        const cabecalho = document.getElementById('cabecalhoRelatorio');
        const linhas = document.getElementById('linhasRelatorio');
        const headerRow = document.createElement('tr');
        config.colunas.forEach((coluna, index) => headerRow.append(criarCelula('th', coluna, config.alinhamentoDireita.includes(index) ? 'numeric' : '')));
        cabecalho.replaceChildren(headerRow);
        linhas.replaceChildren();
        if (!rows.length) {
            const linhaVazia = document.createElement('tr');
            const celula = criarCelula('td', 'Nenhum registro encontrado para o período selecionado.', 'empty');
            celula.colSpan = config.colunas.length;
            linhaVazia.append(celula);
            linhas.append(linhaVazia);
            return;
        }
        rows.forEach(row => {
            const tr = document.createElement('tr');
            config.linhas(row).forEach((valor, index) => tr.append(criarCelula('td', String(valor ?? ''), config.alinhamentoDireita.includes(index) ? 'numeric' : '')));
            linhas.append(tr);
        });
    }
    async function carregar() {
        document.body.classList.toggle('landscape', tipo !== 'os');
        document.title = `Relatório de ${config.titulo} | EletroTech`;
        document.getElementById('tituloRelatorio').textContent = `Relatório de ${config.titulo}`;
        document.getElementById('tituloTabela').textContent = config.secao;
        document.getElementById('geradoEm').textContent = `Emitido em ${new Date().toLocaleString('pt-BR')}`;
        const inicio = query.get('inicio');
        const fim = query.get('fim');
        document.getElementById('periodoRelatorio').textContent = tipo === 'estoque'
            ? 'Posição atual do estoque'
            : inicio || fim
                ? `Período: ${inicio ? dataLegivel(inicio) : 'início'} a ${fim ? dataLegivel(fim) : 'hoje'}`
                : 'Todo o período';
        const parametros = new URLSearchParams();
        if (inicio) parametros.set('inicio', inicio);
        if (fim) parametros.set('fim', fim);
        const separador = parametros.size ? `?${parametros}` : '';
        try {
            const response = await fetch(`${config.endpoint}${separador}`);
            if (!(response.headers.get('content-type') || '').includes('application/json')) {
                throw new Error('O servidor não retornou os dados do relatório. Atualize a página e tente novamente.');
            }
            const resultado = await response.json();
            if (!response.ok) throw new Error(resultado.error || 'Não foi possível carregar o relatório.');
            mostrarResumo(config.resumo(resultado.resumo));
            mostrarLinhas(resultado.rows);
        } catch (error) {
            const tabela = document.querySelector('.table-scroll');
            tabela.replaceChildren();
            const mensagem = document.createElement('div');
            mensagem.className = 'error';
            mensagem.textContent = error.message || 'Erro ao carregar o relatório.';
            tabela.append(mensagem);
            document.getElementById('resumoRelatorio').replaceChildren();
        }
    }

    carregar();
})();
