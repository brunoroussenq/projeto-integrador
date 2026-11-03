const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const router = express.Router();
const db = require('../config/db');

const publicDir = path.join(__dirname, '..', 'public');
const uploadDir = path.join(publicDir, 'uploads', 'empresa');
let tabelaPronta;

const campos = {
    razao_social: 150,
    nome_fantasia: 150,
    cnpj: 20,
    inscricao_estadual: 40,
    email: 150,
    telefone: 25,
    whatsapp: 25,
    cep: 10,
    logradouro: 150,
    numero: 20,
    complemento: 80,
    bairro: 100,
    cidade: 100,
    uf: 2
};

function garantirTabela() {
    if (!tabelaPronta) {
        tabelaPronta = (async () => {
            await db.execute(`CREATE TABLE IF NOT EXISTS empresa (
                id_empresa TINYINT UNSIGNED PRIMARY KEY DEFAULT 1,
                razao_social VARCHAR(150) NOT NULL DEFAULT '',
                nome_fantasia VARCHAR(150) NOT NULL DEFAULT '',
                cnpj VARCHAR(20) NOT NULL DEFAULT '',
                inscricao_estadual VARCHAR(40) NOT NULL DEFAULT '',
                email VARCHAR(150) NOT NULL DEFAULT '',
                telefone VARCHAR(25) NOT NULL DEFAULT '',
                whatsapp VARCHAR(25) NOT NULL DEFAULT '',
                cep VARCHAR(10) NOT NULL DEFAULT '',
                logradouro VARCHAR(150) NOT NULL DEFAULT '',
                numero VARCHAR(20) NOT NULL DEFAULT '',
                complemento VARCHAR(80) NOT NULL DEFAULT '',
                bairro VARCHAR(100) NOT NULL DEFAULT '',
                cidade VARCHAR(100) NOT NULL DEFAULT '',
                uf CHAR(2) NOT NULL DEFAULT '',
                logo_path VARCHAR(255) NULL,
                atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`);
            await db.execute('INSERT IGNORE INTO empresa (id_empresa) VALUES (1)');
        })().catch(error => {
            tabelaPronta = null;
            throw error;
        });
    }
    return tabelaPronta;
}

router.use(async (req, res, next) => {
    try {
        await garantirTabela();
        next();
    } catch (error) {
        console.error('Erro ao preparar cadastro da empresa:', error);
        res.status(500).json({ error: 'Não foi possível acessar o cadastro da empresa.' });
    }
});

function caminhoSeguro(logoPath) {
    if (typeof logoPath !== 'string' || !logoPath.startsWith('/uploads/empresa/')) return null;
    const caminho = path.resolve(publicDir, `.${logoPath}`);
    return caminho.startsWith(`${uploadDir}${path.sep}`) ? caminho : null;
}

async function removerArquivoLogo(logoPath) {
    const caminho = caminhoSeguro(logoPath);
    if (caminho) await fs.unlink(caminho).catch(() => {});
}

function decodificarLogo(dataUrl) {
    if (typeof dataUrl !== 'string') throw new Error('Selecione uma imagem válida para a logo.');
    const partes = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!partes) throw new Error('A logo deve estar no formato PNG, JPG ou WebP.');

    const dados = Buffer.from(partes[2], 'base64');
    if (!dados.length || dados.length > 1.5 * 1024 * 1024) throw new Error('A logo deve ter no máximo 1,5 MB.');

    let extensao;
    if (dados.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) extensao = 'png';
    else if (dados[0] === 0xff && dados[1] === 0xd8 && dados[2] === 0xff) extensao = 'jpg';
    else if (dados.toString('ascii', 0, 4) === 'RIFF' && dados.toString('ascii', 8, 12) === 'WEBP') extensao = 'webp';
    else throw new Error('O conteúdo do arquivo não corresponde a uma imagem PNG, JPG ou WebP.');

    return { dados, extensao };
}

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM empresa WHERE id_empresa = 1');
        const empresa = rows[0];
        res.json({ ...empresa, logo_url: empresa.logo_path || null });
    } catch (error) {
        console.error('Erro ao carregar cadastro da empresa:', error);
        res.status(500).json({ error: 'Erro ao carregar os dados da empresa.' });
    }
});

router.put('/', async (req, res) => {
    let novoLogoPath = null;
    try {
        const dados = {};
        for (const [campo, limite] of Object.entries(campos)) {
            const valor = req.body[campo] == null ? '' : String(req.body[campo]).trim();
            if (valor.length > limite) return res.status(400).json({ error: `O campo ${campo.replaceAll('_', ' ')} excede ${limite} caracteres.` });
            dados[campo] = campo === 'uf' ? valor.toUpperCase() : valor;
        }
        if (!dados.razao_social && !dados.nome_fantasia) {
            return res.status(400).json({ error: 'Informe a razão social ou o nome fantasia da empresa.' });
        }
        if (dados.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) {
            return res.status(400).json({ error: 'Informe um e-mail válido.' });
        }

        const [atuais] = await db.execute('SELECT logo_path FROM empresa WHERE id_empresa = 1');
        let logoPath = atuais[0]?.logo_path || null;
        if (req.body.remover_logo === true) logoPath = null;
        if (req.body.logo_data_url) {
            const { dados: imagem, extensao } = decodificarLogo(req.body.logo_data_url);
            await fs.mkdir(uploadDir, { recursive: true });
            const nomeArquivo = `${randomUUID()}.${extensao}`;
            await fs.writeFile(path.join(uploadDir, nomeArquivo), imagem, { flag: 'wx' });
            novoLogoPath = `/uploads/empresa/${nomeArquivo}`;
            logoPath = novoLogoPath;
        }

        const valores = Object.keys(campos).map(campo => dados[campo]);
        valores.push(logoPath);
        await db.execute(`INSERT INTO empresa (
            id_empresa, ${Object.keys(campos).join(', ')}, logo_path
        ) VALUES (1, ${Object.keys(campos).map(() => '?').join(', ')}, ?)
        ON DUPLICATE KEY UPDATE ${Object.keys(campos).map(campo => `${campo} = VALUES(${campo})`).join(', ')}, logo_path = VALUES(logo_path)`, valores);

        const logoAnterior = atuais[0]?.logo_path;
        if (logoAnterior && logoAnterior !== logoPath) await removerArquivoLogo(logoAnterior);
        res.json({ success: true, message: 'Dados da empresa salvos.', logo_url: logoPath });
    } catch (error) {
        if (novoLogoPath) await removerArquivoLogo(novoLogoPath);
        if (error.message && /^(Selecione|A logo|O conteúdo)/.test(error.message)) return res.status(400).json({ error: error.message });
        console.error('Erro ao salvar cadastro da empresa:', error);
        res.status(500).json({ error: 'Erro ao salvar os dados da empresa.' });
    }
});

module.exports = router;
