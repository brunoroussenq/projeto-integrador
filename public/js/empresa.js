(() => {
    const form = document.getElementById('formEmpresa');
    if (!form) return;

    const campos = {
        razao_social: 'razaoSocial',
        nome_fantasia: 'nomeFantasia',
        cnpj: 'cnpj',
        inscricao_estadual: 'inscricaoEstadual',
        email: 'emailEmpresa',
        telefone: 'telefoneEmpresa',
        whatsapp: 'whatsappEmpresa',
        cep: 'cepEmpresa',
        logradouro: 'logradouroEmpresa',
        numero: 'numeroEmpresa',
        complemento: 'complementoEmpresa',
        bairro: 'bairroEmpresa',
        cidade: 'cidadeEmpresa',
        uf: 'ufEmpresa'
    };
    const arquivoLogo = document.getElementById('logoEmpresa');
    const imagemPreview = document.getElementById('logoPreview');
    const placeholder = document.getElementById('logoPlaceholder');
    const botaoRemoverLogo = document.getElementById('removerLogo');
    const botaoSalvar = document.getElementById('salvarEmpresa');
    let removerLogo = false;

    function mensagem(texto, tipo = 'danger') {
        const alerta = document.getElementById('empresaMensagem');
        alerta.textContent = texto;
        alerta.className = `alert alert-${tipo}`;
        alerta.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function atualizarPreview(src, temLogoSalva = false) {
        if (src) {
            imagemPreview.src = src;
            imagemPreview.classList.remove('d-none');
            placeholder.classList.add('d-none');
            botaoRemoverLogo.classList.toggle('d-none', !temLogoSalva);
        } else {
            imagemPreview.removeAttribute('src');
            imagemPreview.classList.add('d-none');
            placeholder.classList.remove('d-none');
            botaoRemoverLogo.classList.add('d-none');
        }
    }

    async function carregarEmpresa() {
        try {
            const response = await fetch('/api/empresa');
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Não foi possível carregar os dados da empresa.');
            for (const [campo, id] of Object.entries(campos)) {
                document.getElementById(id).value = data[campo] || '';
            }
            atualizarPreview(data.logo_url, Boolean(data.logo_url));
        } catch (error) {
            mensagem(error.message || 'Erro ao carregar os dados da empresa.');
        }
    }

    function lerArquivo(arquivo) {
        return new Promise((resolve, reject) => {
            const leitor = new FileReader();
            leitor.onload = () => resolve(leitor.result);
            leitor.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
            leitor.readAsDataURL(arquivo);
        });
    }

    arquivoLogo.addEventListener('change', () => {
        const arquivo = arquivoLogo.files[0];
        if (!arquivo) return;
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(arquivo.type)) {
            arquivoLogo.value = '';
            return mensagem('Selecione uma imagem PNG, JPG ou WebP.');
        }
        if (arquivo.size > 1.5 * 1024 * 1024) {
            arquivoLogo.value = '';
            return mensagem('A imagem deve ter no máximo 1,5 MB.');
        }
        removerLogo = false;
        atualizarPreview(URL.createObjectURL(arquivo));
        document.getElementById('empresaMensagem').classList.add('d-none');
    });

    botaoRemoverLogo.addEventListener('click', () => {
        removerLogo = true;
        arquivoLogo.value = '';
        atualizarPreview(null);
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        const dados = {};
        for (const [campo, id] of Object.entries(campos)) dados[campo] = document.getElementById(id).value.trim();
        if (!dados.razao_social && !dados.nome_fantasia) return mensagem('Informe a razão social ou o nome fantasia da empresa.');

        const arquivo = arquivoLogo.files[0];
        if (arquivo) {
            try {
                dados.logo_data_url = await lerArquivo(arquivo);
            } catch (error) {
                return mensagem(error.message);
            }
        }
        dados.remover_logo = removerLogo;

        botaoSalvar.disabled = true;
        botaoSalvar.textContent = 'Salvando...';
        try {
            const response = await fetch('/api/empresa', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            const resultado = await response.json();
            if (!response.ok) throw new Error(resultado.error || 'Não foi possível salvar os dados da empresa.');

            removerLogo = false;
            arquivoLogo.value = '';
            atualizarPreview(resultado.logo_url, Boolean(resultado.logo_url));
            await window.atualizarMarcaSistema?.();
            mensagem('Dados da empresa salvos com sucesso.', 'success');
        } catch (error) {
            mensagem(error.message || 'Erro ao salvar os dados da empresa.');
        } finally {
            botaoSalvar.disabled = false;
            botaoSalvar.textContent = 'Salvar dados da empresa';
        }
    });

    carregarEmpresa();
})();
