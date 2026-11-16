const formConsultaOS = document.getElementById('formConsultaOS');
const cpfConsulta = document.getElementById('cpfConsulta');
const consultaMensagem = document.getElementById('consultaMensagem');
const resultadoConsultaOS = document.getElementById('resultadoConsultaOS');

cpfConsulta.addEventListener('input', () => {
    const digitos = cpfConsulta.value.replace(/\D/g, '').slice(0, 11);
    if (digitos.length > 9) cpfConsulta.value = digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    else if (digitos.length > 6) cpfConsulta.value = digitos.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
    else if (digitos.length > 3) cpfConsulta.value = digitos.replace(/(\d{3})(\d+)/, '$1.$2');
    else cpfConsulta.value = digitos;
});

function exibirOrdens(ordens) {
    resultadoConsultaOS.replaceChildren();
    const abertas = ordens.filter(os => !['Concluido', 'Faturado', 'Faturado/Pago', 'Cancelado'].includes(os.status_os));
    const finalizadas = ordens.filter(os => ['Concluido', 'Faturado', 'Faturado/Pago', 'Cancelado'].includes(os.status_os));

    for (const [titulo, lista] of [['OS abertas', abertas], ['OS finalizadas', finalizadas]]) {
        if (!lista.length) continue;
        const heading = document.createElement('h2');
        heading.className = 'h5 mt-4 mb-3';
        heading.textContent = titulo;
        resultadoConsultaOS.append(heading);

        const group = document.createElement('div');
        group.className = 'list-group';
        lista.forEach(os => {
            const item = document.createElement('div');
            item.className = 'list-group-item list-group-item-action bg-dark text-light border-secondary';
            const top = document.createElement('div');
            top.className = 'd-flex justify-content-between align-items-start gap-3';
            const title = document.createElement('strong');
            title.textContent = `OS #${os.id_os} · ${os.aparelho || 'Equipamento'}`;
            const status = document.createElement('span');
            status.className = `badge ${lista === abertas ? 'bg-warning text-dark' : 'bg-success'}`;
            status.textContent = String(os.status_os).replaceAll('_', ' ');
            const date = document.createElement('div');
            date.className = 'small text-light-emphasis mt-2';
            date.textContent = `Abertura: ${os.data_abertura}`;
            top.append(title, status);
            item.append(top, date);
            group.append(item);
        });
        resultadoConsultaOS.append(group);
    }
}

formConsultaOS.addEventListener('submit', async event => {
    event.preventDefault();
    resultadoConsultaOS.replaceChildren();
    consultaMensagem.className = 'mt-4 text-light-emphasis';
    consultaMensagem.textContent = 'Consultando...';
    const botao = document.getElementById('btnConsultarOS');
    botao.disabled = true;
    try {
        const response = await fetch('/api/consulta/os', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cpf: cpfConsulta.value.replace(/\D/g, '') })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Não foi possível realizar a consulta.');
        if (!data.ordens.length) {
            consultaMensagem.className = 'mt-4 alert alert-info';
            consultaMensagem.textContent = 'Nenhuma ordem de serviço foi encontrada para este CPF.';
            return;
        }
        consultaMensagem.className = 'mt-4 alert alert-success';
        consultaMensagem.textContent = `${data.ordens.length} ordem(ns) encontrada(s).`;
        exibirOrdens(data.ordens);
    } catch (error) {
        consultaMensagem.className = 'mt-4 alert alert-danger';
        consultaMensagem.textContent = error.message || 'Erro ao consultar as ordens de serviço.';
    } finally {
        botao.disabled = false;
    }
});
