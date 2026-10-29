// ---------- CLIENTES ----------
async function carregarClientes() {
    const tab = document.getElementById('tabelaClientes');
    if(!tab) return;
    try {
        const res = await fetch('/api/clientes');
        const c = await res.json();
        tab.innerHTML = '';
        c.forEach(x => {
            let badge = x.status === 'Ativo' ? '<span class="badge bg-success">Ativo</span>' : '<span class="badge bg-danger">Bloqueado</span>';
            tab.innerHTML += `<tr>
                <td>#${x.id_cliente}</td>
                <td class="clickable-row fw-bold" onclick="abrirModalEditarCliente(${x.id_cliente})">${x.nome}</td>
                <td>${x.whatsapp}</td>
                <td>${x.email || '-'}</td>
                <td>${badge}</td>
            </tr>`;
        });
    } catch(e) { console.error(e); }
}

const formCliente = document.getElementById('formCliente');
if (formCliente) {
    formCliente.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dados = {
            nome: document.getElementById('nomeCliente').value,
            whatsapp: document.getElementById('whatsappCliente').value,
            email: document.getElementById('emailCliente').value
        };
        try {
            const res = await fetch('/api/clientes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            if ((await res.json()).success) {
                alert('Cliente salvo!');
                bootstrap.Modal.getInstance(document.getElementById('modalNovoCliente')).hide();
                formCliente.reset();
                carregarClientes();
            }
        } catch (e) { alert('Erro ao salvar cliente.'); }
    });
}

async function abrirModalEditarCliente(id) {
    try {
        const res = await fetch('/api/clientes/' + id);
        const cli = await res.json();
        document.getElementById('editCliID').value = cli.id_cliente;
        document.getElementById('editCliNome').value = cli.nome;
        document.getElementById('editCliWhatsApp').value = cli.whatsapp;
        document.getElementById('editCliEmail').value = cli.email || '';
        document.getElementById('editCliStatus').value = cli.status;
        new bootstrap.Modal(document.getElementById('modalEditarCliente')).show();
    } catch (e) { alert('Erro ao buscar cliente.'); }
}

const formEditCliente = document.getElementById('formEditCliente');
if(formEditCliente) {
    formEditCliente.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editCliID').value;
        const dados = {
            nome: document.getElementById('editCliNome').value,
            whatsapp: document.getElementById('editCliWhatsApp').value,
            email: document.getElementById('editCliEmail').value,
            status: document.getElementById('editCliStatus').value
        };
        try {
            const res = await fetch('/api/clientes/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            if ((await res.json()).success) {
                alert('Cliente atualizado!');
                bootstrap.Modal.getInstance(document.getElementById('modalEditarCliente')).hide();
                carregarClientes();
            }
        } catch (e) { alert('Erro ao atualizar cliente.'); }
    });
}

// ---------- ESTOQUE E PEÇAS ----------
async function carregarPecas() {
    const tab = document.getElementById('tabelaPecas');
    if(!tab) return;
    try {
        const res = await fetch('/api/pecas');
        const p = await res.json();
        tab.innerHTML = '';
        p.forEach(x => {
            let badge = x.quantidade_estoque <= x.estoque_minimo ? '<span class="badge bg-danger">Baixo Estoque</span>' : '<span class="badge bg-success">Normal</span>';
            tab.innerHTML += `<tr>
                <td>${x.codigo_ref}</td>
                <td class="clickable-row fw-bold" onclick="abrirDetalhePeca(${x.id_peca})">${x.descricao}</td>
                <td>${x.quantidade_estoque}</td>
                <td>R$ ${Number(x.preco_venda).toFixed(2)}</td>
                <td>${badge}</td>
                <td>
                    <button class="btn btn-sm btn-outline-warning me-1" onclick="abrirModalEditarPeca(${x.id_peca})">Alterar</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirPeca(${x.id_peca}, '${x.descricao.replace(/'/g, "\'")}')">Excluir</button>
                </td>
            </tr>`;
        });
    } catch(e) { console.error(e); }
}

const formPeca = document.getElementById('formPeca');
if(formPeca) {
    formPeca.addEventListener('submit', async(e)=>{
        e.preventDefault();
        const dados = {
            codigo_ref: document.getElementById('codPeca').value,
            descricao: document.getElementById('descPeca').value,
            quantidade_estoque: document.getElementById('qtdPeca').value,
            estoque_minimo: document.getElementById('minPeca').value,
            preco_venda: document.getElementById('precoPeca').value
        };
        try {
            const res = await fetch('/api/pecas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            const data = await res.json();
            if(data.success){
                alert('Peça salva!');
                bootstrap.Modal.getInstance(document.getElementById('modalNovaPeca')).hide();
                formPeca.reset();
                carregarPecas();
            } else alert(data.error);
        } catch(e) { alert('Erro ao salvar peça.'); }
    });
}

async function abrirModalEditarPeca(id) {
    try {
        const res = await fetch('/api/pecas/' + id);
        const peca = await res.json();
        document.getElementById('editIdPeca').value = peca.id_peca;
        document.getElementById('editCodPeca').value = peca.codigo_ref;
        document.getElementById('editDescPeca').value = peca.descricao;
        document.getElementById('editQtdPeca').value = peca.quantidade_estoque;
        document.getElementById('editMinPeca').value = peca.estoque_minimo;
        document.getElementById('editPrecoPeca').value = peca.preco_venda;
        new bootstrap.Modal(document.getElementById('modalEditarPeca')).show();
    } catch (e) { alert('Erro ao carregar dados da peça.'); }
}

const formEditPeca = document.getElementById('formEditPeca');
if(formEditPeca) {
    formEditPeca.addEventListener('submit', async(e)=>{
        e.preventDefault();
        const id = document.getElementById('editIdPeca').value;
        const dados = {
            codigo_ref: document.getElementById('editCodPeca').value,
            descricao: document.getElementById('editDescPeca').value,
            quantidade_estoque: document.getElementById('editQtdPeca').value,
            estoque_minimo: document.getElementById('editMinPeca').value,
            preco_venda: document.getElementById('editPrecoPeca').value
        };
        try {
            const res = await fetch('/api/pecas/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            const data = await res.json();
            if(data.success){
                alert('Peça atualizada!');
                bootstrap.Modal.getInstance(document.getElementById('modalEditarPeca')).hide();
                carregarPecas();
            } else alert(data.error);
        } catch(e) { alert('Erro ao atualizar peça.'); }
    });
}

async function excluirPeca(id, descricao) {
    if(!confirm(`Deseja realmente excluir a peça "${descricao}"?`)) return;
    try {
        const res = await fetch('/api/pecas/' + id, { method: 'DELETE' });
        const data = await res.json();
        if(data.success){
            alert('Peça excluída com sucesso!');
            carregarPecas();
        } else alert(data.error);
    } catch(e) { alert('Erro ao excluir peça.'); }
}

async function abrirDetalhePeca(id) {
    try {
        const res = await fetch('/api/pecas/' + id);
        const p = await res.json();
        document.getElementById('detCod').innerText = p.codigo_ref;
        document.getElementById('detDesc').innerText = p.descricao;
        document.getElementById('detQtd').innerText = p.quantidade_estoque;
        document.getElementById('detMin').innerText = p.estoque_minimo;
        document.getElementById('detPreco').innerText = Number(p.preco_venda).toFixed(2);
        new bootstrap.Modal(document.getElementById('modalDetalhePeca')).show();
    } catch(e) { alert('Erro ao buscar detalhes da peça.'); }
}

// ---------- DASHBOARD ----------
async function carregarDashboard() {
    const c = document.getElementById('countDiagnostico');
    if(!c) return;
    try {
        const r = await fetch('/api/dashboard/stats');
        const s = await r.json();
        c.innerText = s.diagnostico;
        document.getElementById('countConcluido').innerText = s.concluido;
        document.getElementById('countPeca').innerText = s.peca;
    } catch(e) {}
}

async function carregarClientesParaSelect() {
    const s = document.getElementById('clienteOS');
    if(!s) return;
    try {
        const r = await fetch('/api/clientes');
        const c = await r.json();
        s.innerHTML = '<option value="">Selecione o Cliente...</option>';
        c.forEach(x => { s.innerHTML += `<option value="${x.id_cliente}">${x.nome} (${x.whatsapp})</option>`; });
    } catch(e) {}
}

// ---------- ORDENS DE SERVIÇO ----------
let totalPecasAtual = 0;
async function carregarOS() {
    const tabela = document.getElementById('tabelaOS');
    if(!tabela) return;
    try {
        const response = await fetch('/api/os');
        const ordens = await response.json();
        tabela.innerHTML = '';
        ordens.forEach(os => {
            let badgeClass = 'bg-secondary';
            if(os.status_os === 'Recebido' || os.status_os === 'Diagnostico') badgeClass = 'bg-warning text-dark';
            if(os.status_os === 'Aguardando_Peca') badgeClass = 'bg-danger';
            if(os.status_os === 'Aprovado' || os.status_os === 'Concluido') badgeClass = 'bg-success';
            if(os.status_os === 'Faturado') badgeClass = 'bg-primary';
            
            tabela.innerHTML += `<tr>
                <td><strong>#${os.id_os}</strong></td>
                <td>${os.cliente}</td>
                <td>${os.aparelho}</td>
                <td>${os.data_abertura}</td>
                <td class="text-success fw-bold">R$ ${Number(os.valor_total || 0).toFixed(2)}</td>
                <td><span class="badge ${badgeClass}">${os.status_os.replace('_', ' ')}</span></td>
                <td>
                    <button class="btn btn-sm btn-info text-dark fw-bold me-1" onclick="abrirModalAtualizarOS(${os.id_os})">Abrir</button>
                </td>
            </tr>`;
        });
    } catch (e) { console.error(e); }
}

function abrirJanelaImpressao(id) { window.open('imprimir-os.html?id=' + id, '_blank'); }
function imprimirOSAtual() { const id = document.getElementById('editOSID').value; if(id) abrirJanelaImpressao(id); }

function irParaPagamento() {
    const id = document.getElementById('editOSID').value;
    if(id) {
        window.location.href = 'vendas.html?faturar=' + id;
    }
}

async function carregarHistoricoOS(id) {
    const divHistory = document.getElementById('osHistoricoList');
    if(!divHistory) return;
    divHistory.innerHTML = '<p class="text-muted">Carregando...</p>';
    try {
        const res = await fetch('/api/os/' + id + '/historico');
        const historico = await res.json();
        divHistory.innerHTML = '';
        if(historico.length === 0) return divHistory.innerHTML = '<p class="text-muted">Nenhum histórico encontrado.</p>';
        historico.forEach(h => {
            let classeCss = h.tipo === 'Status' ? 'history-item history-status' : 'history-item';
            let icone = h.tipo === 'Status' ? '🔄' : '💬';
            divHistory.innerHTML += `<div class="${classeCss}"><div class="fw-bold">${icone} ${h.tipo} <span class="text-muted fw-normal" style="font-size:0.75rem; float:right;">${h.data_reg}</span></div><div>${h.descricao}</div></div>`;
        });
    } catch (e) { divHistory.innerHTML = '<p class="text-danger">Erro.</p>'; }
}

async function carregarPecasParaSelectOS() {
    const s = document.getElementById('selectPecaOS');
    if(!s) return;
    try {
        const res = await fetch('/api/pecas');
        const pecas = await res.json();
        s.innerHTML = '<option value="">Selecione uma peça...</option>';
        pecas.forEach(p => { s.innerHTML += `<option value="${p.id_peca}">${p.descricao} (R$ ${Number(p.preco_venda).toFixed(2)}) - Saldo: ${p.quantidade_estoque}</option>`; });
    } catch (e) {}
}

async function carregarItensDaOS(id_os) {
    const tabela = document.getElementById('tabelaItensOS');
    if(!tabela) return;
    try {
        const res = await fetch('/api/os/' + id_os + '/itens');
        const itens = await res.json();
        tabela.innerHTML = ''; totalPecasAtual = 0;
        if (itens.length === 0) tabela.innerHTML = '<tr><td colspan="4" class="text-muted text-center py-2 small">Nenhuma peça adicionada</td></tr>';
        else {
            itens.forEach(item => {
                totalPecasAtual += Number(item.subtotal);
                tabela.innerHTML += `<tr><td class="small">${item.descricao}</td><td class="text-center small">${item.quantidade}</td><td class="small">R$ ${Number(item.subtotal).toFixed(2)}</td><td class="text-end"><button type="button" class="btn btn-sm text-danger p-0 border-0" onclick="removerPecaDaOS(${id_os}, ${item.id_item})">✕</button></td></tr>`;
            });
        }
        atualizarTotalizadorVisual();
    } catch (e) {}
}

function atualizarTotalizadorVisual() {
    const maoObraInput = document.getElementById('editOSMaoObra');
    const maoObra = parseFloat(maoObraInput ? maoObraInput.value : 0) || 0;
    const totalGeral = totalPecasAtual + maoObra;
    if(document.getElementById('osResumoPecas')) document.getElementById('osResumoPecas').innerText = totalPecasAtual.toFixed(2);
    if(document.getElementById('osResumoMaoObra')) document.getElementById('osResumoMaoObra').innerText = maoObra.toFixed(2);
    if(document.getElementById('osResumoTotal')) document.getElementById('osResumoTotal').innerText = totalGeral.toFixed(2);
}

const maoObraField = document.getElementById('editOSMaoObra');
if (maoObraField) maoObraField.addEventListener('input', atualizarTotalizadorVisual);

async function adicionarPecaNaOS() {
    const id_os = document.getElementById('editOSID').value;
    const selectPeca = document.getElementById('selectPecaOS');
    const qtdInput = document.getElementById('qtdPecaOS');
    if(!selectPeca.value) return alert('Selecione uma peça.');
    try {
        const res = await fetch('/api/os/' + id_os + '/itens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_peca: selectPeca.value, quantidade: qtdInput.value || 1 }) });
        if ((await res.json()).success) { selectPeca.value = ''; qtdInput.value = '1'; await carregarItensDaOS(id_os); await carregarHistoricoOS(id_os); carregarOS(); }
    } catch (e) {}
}

async function removerPecaDaOS(id_os, id_item) {
    if(!confirm('Remover esta peça da OS?')) return;
    try {
        const res = await fetch(`/api/os/${id_os}/itens/${id_item}`, { method: 'DELETE' });
        if ((await res.json()).success) { await carregarItensDaOS(id_os); await carregarHistoricoOS(id_os); carregarOS(); }
    } catch (e) {}
}

async function abrirModalAtualizarOS(id) {
    try {
        const res = await fetch('/api/os/' + id);
        const os = await res.json();
        document.getElementById('detOSID').innerText = os.id_os;
        document.getElementById('detOSCliente').innerText = os.cliente;
        document.getElementById('detOSAparelho').innerText = os.aparelho;
        document.getElementById('detOSDefeito').innerText = os.defeito_relatado;
        document.getElementById('editOSID').value = os.id_os;
        
        const statusSelect = document.getElementById('editOSStatus');
        statusSelect.value = os.status_os;
        statusSelect.dataset.original = os.status_os;
        
        const maoObraInput = document.getElementById('editOSMaoObra');
        maoObraInput.value = Number(os.valor_mao_obra || 0).toFixed(2);
        maoObraInput.dataset.original = Number(os.valor_mao_obra || 0).toFixed(2);
        
        await carregarPecasParaSelectOS(); await carregarItensDaOS(id); await carregarHistoricoOS(id);
        new bootstrap.Modal(document.getElementById('modalAbrirOS')).show();
    } catch (e) {}
}

async function adicionarObsOS() {
    const input = document.getElementById('novaObsOS');
    const observacao = input.value.trim();
    const id_os = document.getElementById('editOSID').value;
    if(!observacao) return alert('Digite uma observação.');
    try {
        const res = await fetch('/api/os/' + id_os + '/observacoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ observacao }) });
        if((await res.json()).success) { input.value = ''; carregarHistoricoOS(id_os); }
    } catch (e) {}
}

const formUpdateOS = document.getElementById('formUpdateOS');
if(formUpdateOS) {
    formUpdateOS.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editOSID').value;
        const statusSelect = document.getElementById('editOSStatus');
        const status_os = statusSelect.value;
        const statusOriginal = statusSelect.dataset.original;
        const maoObraInput = document.getElementById('editOSMaoObra');
        const valor_mao_obra = parseFloat(maoObraInput.value) || 0;
        const maoObraOriginal = parseFloat(maoObraInput.dataset.original) || 0;

        if (status_os === statusOriginal && valor_mao_obra === maoObraOriginal) {
            let toast = document.createElement('div'); toast.className = 'alert alert-warning mt-2 py-1 px-2'; toast.innerText = 'Nenhuma alteração foi realizada!';
            formUpdateOS.appendChild(toast); setTimeout(() => toast.remove(), 2500); return;
        }
        try {
            const res = await fetch('/api/os/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status_os, valor_mao_obra }) });
            if ((await res.json()).success) {
                statusSelect.dataset.original = status_os;
                maoObraInput.dataset.original = valor_mao_obra.toFixed(2);
                carregarHistoricoOS(id); carregarOS();
                let toast = document.createElement('div'); toast.className = 'alert alert-success mt-2 py-1 px-2'; toast.innerText = 'Alterações salvas com sucesso!';
                formUpdateOS.appendChild(toast); setTimeout(() => toast.remove(), 2500);
            }
        } catch (e) {}
    });
}

const formOS = document.getElementById('formOS');
if (formOS) {
    formOS.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dados = { id_cliente: document.getElementById('clienteOS').value, aparelho: document.getElementById('aparelhoOS').value, defeito: document.getElementById('defeitoOS').value };
        try {
            const res = await fetch('/api/os', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
            if ((await res.json()).success) { alert('Criada!'); bootstrap.Modal.getInstance(document.getElementById('modalNovaOS')).hide(); formOS.reset(); carregarOS(); }
        } catch (e) {}
    });
}

// ---------- MÓDULO DE VENDAS E FATURAMENTO ----------
let osPendentesMap = {};
let osVendaSelecionada = null;
let pagamentosVenda = [];

// Função auxiliar para quebrar a string de pagamentos do banco para array de objetos
function parseFormaPagamentoString(str) {
    const list = [];
    if (!str) return list;
    const regex = /([^(+]+)\s*\(R\$\s*([\d.]+)\)/g;
    let match;
    while ((match = regex.exec(str)) !== null) {
        list.push({
            forma: match[1].trim(),
            valor: parseFloat(match[2]) || 0
        });
    }
    if (list.length === 0 && str.trim()) {
        list.push({
            forma: str.trim(),
            valor: 0
        });
    }
    return list;
}

async function carregarVendas() {
    const tabela = document.getElementById('tabelaVendas');
    if(!tabela) return;
    try {
        const res = await fetch('/api/vendas');
        const vendas = await res.json();
        tabela.innerHTML = '';
        if (vendas.length === 0) return tabela.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Nenhuma venda faturada.</td></tr>';
        
        vendas.forEach(v => {
            tabela.innerHTML += `
                <tr>
                    <td><strong>#V${v.id_venda}</strong></td>
                    <td><span class="text-info fw-bold">#OS ${v.id_os}</span></td>
                    <td>${v.cliente}</td>
                    <td>${v.data_venda_formatada}</td>
                    <td class="small" style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${v.forma_pagamento}">${v.forma_pagamento}</td>
                    <td class="text-danger small">R$ ${Number(v.desconto).toFixed(2)}</td>
                    <td class="text-success fw-bold">R$ ${Number(v.valor_final).toFixed(2)}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-info text-dark fw-bold me-1" onclick="abrirModalEditarVenda(${v.id_venda})">Abrir</button>
                        <button class="btn btn-sm btn-outline-light" title="Imprimir Recibo" onclick="abrirJanelaImpressaoVenda(${v.id_venda})">🖨️</button>
                    </td>
                </tr>
            `;
        });
    } catch (e) { console.error(e); }
}

async function carregarOSPendentesParaSelect() {
    const select = document.getElementById('selectOSFaturar');
    if(!select) return;
    try {
        const res = await fetch('/api/vendas/os-pendentes');
        const contentType = res.headers.get("content-type");
        if (!res.ok || !contentType || !contentType.includes("application/json")) return select.innerHTML = '<option value="">⚠️ Erro de API.</option>';
        const lista = await res.json();
        select.innerHTML = '<option value="">Selecione uma Ordem de Serviço...</option>';
        osPendentesMap = {};
        if (lista.length === 0) return select.innerHTML = '<option value="">Nenhuma OS pendente.</option>';
        lista.forEach(os => {
            osPendentesMap[os.id_os] = os;
            select.innerHTML += `<option value="${os.id_os}">OS #${os.id_os} - ${os.cliente} | R$ ${Number(os.valor_total).toFixed(2)}</option>`;
        });

        // AUTOMAÇÃO DO BOTÃO "IR PARA PAGAMENTO" DA TELA DE OS
        const urlParams = new URLSearchParams(window.location.search);
        const faturarId = urlParams.get('faturar');
        if (faturarId && osPendentesMap[faturarId]) {
            setTimeout(() => {
                select.value = faturarId;
                aoSelecionarOSFaturar();
                new bootstrap.Modal(document.getElementById('modalNovaVenda')).show();
                window.history.replaceState({}, document.title, window.location.pathname);
            }, 300);
        } else if (faturarId) {
            alert('A OS #' + faturarId + ' não está pendente ou já foi faturada!');
            window.history.replaceState({}, document.title, window.location.pathname);
        }

    } catch (e) {}
}

function aoSelecionarOSFaturar() {
    const id = document.getElementById('selectOSFaturar').value;
    const card = document.getElementById('cardResumoOSFaturar');
    const sectionPag = document.getElementById('sectionPagamentos');
    if (!id || !osPendentesMap[id]) {
        if(card) card.classList.add('d-none');
        if(sectionPag) sectionPag.classList.add('d-none');
        return;
    }
    osVendaSelecionada = osPendentesMap[id];
    pagamentosVenda = []; 
    document.getElementById('vendaDesconto').value = '0.00';
    document.getElementById('vendaResumoCliente').innerText = osVendaSelecionada.cliente;
    document.getElementById('vendaValorOSOriginal').innerText = Number(osVendaSelecionada.valor_total).toFixed(2);
    card.classList.remove('d-none'); sectionPag.classList.remove('d-none');
    atualizarResumoVenda();
}

function atualizarResumoVenda() {
    if(!osVendaSelecionada) return;
    const valorOriginal = Number(osVendaSelecionada.valor_total) || 0;
    const desconto = Number(document.getElementById('vendaDesconto').value) || 0;
    const valorFinal = Math.max(0, valorOriginal - desconto);
    document.getElementById('vendaValorFinal').innerText = valorFinal.toFixed(2);
    
    const totalPago = pagamentosVenda.reduce((acc, p) => acc + p.valor, 0);
    const falta = valorFinal - totalPago;
    const elFalta = document.getElementById('vendaFalta');
    const textoFalta = document.getElementById('textoFaltaTroco');
    elFalta.innerText = 'R$ ' + Math.abs(falta).toFixed(2);
    
    if (falta > 0.009) { 
        textoFalta.innerText = 'Falta Pagar:'; 
        elFalta.className = 'text-danger fs-6 fw-bold'; 
        document.getElementById('vendaValorInput').value = falta.toFixed(2); 
    } else if (falta < -0.009) { 
        textoFalta.innerText = 'Troco ao Cliente:'; 
        elFalta.className = 'text-warning fs-6 fw-bold'; 
        document.getElementById('vendaValorInput').value = ''; 
    } else { 
        textoFalta.innerText = 'Saldo Pendente:'; 
        elFalta.className = 'text-success fs-6 fw-bold'; 
        document.getElementById('vendaValorInput').value = ''; 
    }
    renderizarListaPagamentos();
}

function adicionarPagamentoVenda() {
    const forma = document.getElementById('vendaFormaInput').value;
    const valor = Number(document.getElementById('vendaValorInput').value);
    if(isNaN(valor) || valor <= 0) return alert('Insira um valor válido de pagamento.');
    pagamentosVenda.push({ forma, valor });
    atualizarResumoVenda();
}

function removerPagamentoVenda(index) {
    pagamentosVenda.splice(index, 1);
    atualizarResumoVenda();
}

function renderizarListaPagamentos() {
    const ul = document.getElementById('listaPagamentosVenda');
    if(!ul) return;
    ul.innerHTML = '';
    pagamentosVenda.forEach((p, idx) => {
        ul.innerHTML += `<li class="list-group-item bg-secondary text-light border-dark d-flex justify-content-between align-items-center py-1 px-2 mb-1"><span>${p.forma} <strong class="ms-2">R$ ${p.valor.toFixed(2)}</strong></span><button type="button" class="btn btn-sm btn-danger py-0 px-2" onclick="removerPagamentoVenda(${idx})">✕</button></li>`;
    });
}

const formVenda = document.getElementById('formVenda');
if(formVenda) {
    formVenda.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id_os = document.getElementById('selectOSFaturar').value;
        const desconto = Number(document.getElementById('vendaDesconto').value) || 0;
        const observacoes = document.getElementById('vendaObservacoes').value;
        const valorFinal = Number(document.getElementById('vendaValorFinal').innerText);
        const totalPago = pagamentosVenda.reduce((acc, p) => acc + p.valor, 0);

        if(pagamentosVenda.length === 0) return alert('Adicione pelo menos uma forma de pagamento.');
        if(totalPago < (valorFinal - 0.01)) return alert('O valor pago é menor que o valor final da OS. Adicione o restante.');

        try {
            const res = await fetch('/api/vendas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_os, desconto, pagamentos: pagamentosVenda, observacoes }) });
            const data = await res.json();
            if(data.success) {
                alert('Faturada com sucesso!');
                bootstrap.Modal.getInstance(document.getElementById('modalNovaVenda')).hide();
                formVenda.reset();
                document.getElementById('cardResumoOSFaturar').classList.add('d-none'); document.getElementById('sectionPagamentos').classList.add('d-none');
                pagamentosVenda = []; carregarVendas(); carregarOSPendentesParaSelect();
            } else alert(data.error);
        } catch (e) { alert('Erro.'); }
    });
}

// ---------- GESTÃO DE EDIÇÃO DE VENDA (COM MESMAS OPÇÕES DE FATURAMENTO) ----------
let vendaEmEdicao = null;
let pagamentosEditVenda = [];

async function abrirModalEditarVenda(id) {
    try {
        const res = await fetch('/api/vendas/' + id);
        if (!res.ok) throw new Error('Erro ao obter venda');
        const v = await res.json();
        vendaEmEdicao = v;

        document.getElementById('editVendaIDLabel').innerText = v.id_venda;
        document.getElementById('editVendaID').value = v.id_venda;

        document.getElementById('editVendaResumoCliente').innerText = v.cliente || '--';
        document.getElementById('editVendaResumoAparelho').innerText = v.aparelho || '--';
        document.getElementById('editVendaValorOSOriginal').innerText = Number(v.valor_total).toFixed(2);
        document.getElementById('editVendaDesconto').value = Number(v.desconto || 0).toFixed(2);
        document.getElementById('editVendaObservacoes').value = v.observacoes || '';

        // Converter string de pagamentos existente de volta para lista
        pagamentosEditVenda = parseFormaPagamentoString(v.forma_pagamento);

        atualizarResumoEditVenda();
        new bootstrap.Modal(document.getElementById('modalEditarVenda')).show();
    } catch (e) {
        console.error("Erro abrirModalEditarVenda:", e);
        alert('Erro ao buscar venda.');
    }
}

function atualizarResumoEditVenda() {
    if(!vendaEmEdicao) return;
    const valorOriginal = Number(vendaEmEdicao.valor_total) || 0;
    const desconto = Number(document.getElementById('editVendaDesconto').value) || 0;
    const valorFinal = Math.max(0, valorOriginal - desconto);

    document.getElementById('editVendaValorFinal').innerText = valorFinal.toFixed(2);

    const totalPago = pagamentosEditVenda.reduce((acc, p) => acc + p.valor, 0);
    const falta = valorFinal - totalPago;

    const elFalta = document.getElementById('editVendaFalta');
    const textoFalta = document.getElementById('editTextoFaltaTroco');

    elFalta.innerText = 'R$ ' + Math.abs(falta).toFixed(2);

    if (falta > 0.009) {
        textoFalta.innerText = 'Falta Pagar:';
        elFalta.className = 'text-danger fs-6 fw-bold';
        document.getElementById('editVendaValorInput').value = falta.toFixed(2);
    } else if (falta < -0.009) {
        textoFalta.innerText = 'Troco ao Cliente:';
        elFalta.className = 'text-warning fs-6 fw-bold';
        document.getElementById('editVendaValorInput').value = '';
    } else {
        textoFalta.innerText = 'Saldo Pendente:';
        elFalta.className = 'text-success fs-6 fw-bold';
        document.getElementById('editVendaValorInput').value = '';
    }

    renderizarListaPagamentosEdit();
}

function adicionarPagamentoEditVenda() {
    const forma = document.getElementById('editVendaFormaInput').value;
    const valor = Number(document.getElementById('editVendaValorInput').value);

    if(isNaN(valor) || valor <= 0) return alert('Insira um valor válido de pagamento.');

    pagamentosEditVenda.push({ forma, valor });
    atualizarResumoEditVenda();
}

function removerPagamentoEditVenda(index) {
    pagamentosEditVenda.splice(index, 1);
    atualizarResumoEditVenda();
}

function renderizarListaPagamentosEdit() {
    const ul = document.getElementById('listaPagamentosEditVenda');
    if(!ul) return;
    ul.innerHTML = '';
    pagamentosEditVenda.forEach((p, idx) => {
        ul.innerHTML += `
            <li class="list-group-item bg-secondary text-light border-dark d-flex justify-content-between align-items-center py-1 px-2 mb-1">
                <span>${p.forma} <strong class="ms-2">R$ ${p.valor.toFixed(2)}</strong></span>
                <button type="button" class="btn btn-sm btn-danger py-0 px-2" onclick="removerPagamentoEditVenda(${idx})">✕</button>
            </li>
        `;
    });
}

const formEditVenda = document.getElementById('formEditVenda');
if(formEditVenda) {
    formEditVenda.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editVendaID').value;
        const desconto = Number(document.getElementById('editVendaDesconto').value) || 0;
        const observacoes = document.getElementById('editVendaObservacoes').value;
        const valorFinal = Number(document.getElementById('editVendaValorFinal').innerText);
        const totalPago = pagamentosEditVenda.reduce((acc, p) => acc + p.valor, 0);

        if(pagamentosEditVenda.length === 0) return alert('Adicione pelo menos uma forma de pagamento na lista.');
        if(totalPago < (valorFinal - 0.01)) return alert('O valor pago é menor que o valor final da venda. Ajuste o pagamento.');

        try {
            const res = await fetch('/api/vendas/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ desconto, pagamentos: pagamentosEditVenda, observacoes })
            });
            const data = await res.json();
            if (data.success) {
                alert('Venda atualizada com sucesso!');
                bootstrap.Modal.getInstance(document.getElementById('modalEditarVenda')).hide();
                carregarVendas();
            } else {
                alert(data.error);
            }
        } catch (e) { alert('Erro ao atualizar venda.'); }
    });
}

function abrirJanelaImpressaoVenda(id) {
    window.open('imprimir-venda.html?id=' + id, '_blank');
}

// INICIALIZADOR GLOBAL
document.addEventListener('DOMContentLoaded', () => {
    carregarClientes();
    carregarDashboard();
    carregarOS();
    carregarPecas();
    carregarClientesParaSelect();
    carregarVendas();
    carregarOSPendentesParaSelect();
});
