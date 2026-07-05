#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'solicitacao-pdf.html');
const OUT_DIR = path.join(__dirname, '..', 'out');
const SYSTEM_CHROMIUM_PATHS = ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome'];

function brl(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function formatCpf(cpf) {
    const raw = String(cpf || '').trim();
    const digits = raw.replace(/[^\d]/g, '');
    if (digits.length !== 11) {
        return raw;
    }
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

function firstFilled(...values) {
    const match = values.find((value) => String(value || '').trim());
    return match === undefined || match === null ? '' : String(match).trim();
}

function buildAddressLine(data) {
    const address = firstFilled(data.endereco, data.enderecoEntrega);
    const number = firstFilled(data.enderecoNumero, data.numeroEndereco, data.numeroEntrega);
    if (!address || !number || address.includes(number)) {
        return address;
    }
    return `${address}, ${number}`;
}

function buildCidadeUf(data) {
    const cidadeUf = firstFilled(data.cidadeUf);
    if (cidadeUf) {
        return cidadeUf;
    }
    return [data.cidade || '', data.estado || ''].filter(Boolean).join(' / ');
}

function ddmmyyyy(iso) {
    const use = iso || new Date().toISOString().slice(0, 10);
    const [y, m, d] = use.split('-');
    return `${d}/${m}/${y}`;
}

function nowBR() {
    const dt = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const d = pad(dt.getDate());
    const m = pad(dt.getMonth() + 1);
    const y = dt.getFullYear();
    const hh = pad(dt.getHours());
    const mm = pad(dt.getMinutes());
    const ss = pad(dt.getSeconds());
    return `${d}/${m}/${y}, ${hh}:${mm}:${ss}`;
}

function buildItemsRows(itens) {
    return itens
        .map((i) => {
            const sub = (i.qtd || 0) * (i.valorUnit || 0);
            return `
      <tr>
        <td>${i.codigo ?? ''}</td>
        <td class="t-center">${i.idMaquina ?? '-'}</td>
        <td class="t-center">${i.qtd ?? 0}</td>
        <td>${i.descricao ?? ''}</td>
        <td class="t-right">${brl(i.valorUnit)}</td>
        <td class="t-right">${brl(sub)}</td>
      </tr>
    `;
        })
        .join('');
}

function getExecutablePath() {
    const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROMIUM_PATH;
    if (fromEnv && path.isAbsolute(fromEnv) && fs.existsSync(fromEnv)) {
        return fromEnv;
    }
    const fallback = SYSTEM_CHROMIUM_PATHS.find((bin) => fs.existsSync(bin));
    return fallback || undefined;
}

async function generateSolicitacaoPdf(data) {
    const tplPath = TEMPLATE_PATH;
    const itens = data.itens || [];
    const subtotalNum = itens.reduce((acc, i) => acc + (i.qtd || 0) * (i.valorUnit || 0), 0);
    const descontoNum = data.desconto || 0;
    const freteNum = data.frete || 0;
    const totalNum = subtotalNum - descontoNum + freteNum;
    const tecnico = firstFilled(data.tecnico, data.tecnicoNome, data.requesterName);
    const cpf = formatCpf(data.tecnicoCpf ?? data.cpfTecnico ?? data.cpf ?? '');
    const endereco = buildAddressLine(data);
    const cidadeUf = buildCidadeUf(data);

    let html = fs.readFileSync(tplPath, 'utf8');
    html = html
        .replaceAll('{{NUMERO}}', data.numero ?? '')
        .replaceAll('{{TECNICO}}', tecnico)
        .replaceAll('{{CPF}}', cpf)
        .replaceAll('{{DATA}}', ddmmyyyy(data.data))
        .replaceAll('{{ENDERECO}}', endereco)
        .replaceAll('{{CIDADE_UF}}', cidadeUf)
        .replaceAll('{{ENVIO}}', data.envio ?? '')
        .replaceAll('{{CEP}}', data.cep ?? '')
        .replaceAll('{{ITENS_ROWS}}', buildItemsRows(itens))
        .replaceAll('{{SUBTOTAL}}', brl(subtotalNum))
        .replaceAll('{{DESCONTO}}', brl(descontoNum))
        .replaceAll('{{FRETE}}', brl(freteNum))
        .replaceAll('{{TOTAL}}', brl(totalNum))
        .replaceAll('{{FLUXO_APROVACAO}}', data.fluxoAprovacao ?? 'Supervisor Diversey')
        .replaceAll('{{GERADO_EM}}', nowBR());

    await fs.promises.mkdir(OUT_DIR, { recursive: true });
    const numero = data.numero || `sem-numero-${Date.now()}`;
    const outFile = path.join(OUT_DIR, `Solicitacao_${numero}.pdf`);

    const launchOptions = {
        headless: true,
        args: ['--no-sandbox', '--font-render-hinting=medium']
    };

    const executablePath = getExecutablePath();
    if (executablePath) {
        launchOptions.executablePath = executablePath;
    }

    const browser = await puppeteer.launch(launchOptions);
    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        await page.emulateMediaType('screen');

        await page.pdf({
            path: outFile,
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true
        });

        return { path: outFile, subtotal: subtotalNum, total: totalNum };
    } finally {
        await browser.close();
    }
}

async function runSample() {
    const data = {
        numero: 'REQ-20251218-0010',
        tecnico: 'Welington Bastos Tavares',
        tecnicoCpf: '52998224725',
        data: '2025-12-18',
        endereco: 'AV Morumbi Qd 34 Lt 11',
        cidadeUf: 'Anápolis / GO',
        envio: 'Normal',
        cep: '75134-550',
        itens: [
            { codigo: 'CS008', idMaquina: '-', qtd: 1, descricao: 'Bicos Injetores Do Braço HD-50/HD-80', valorUnit: 114.48 },
            { codigo: 'CS020', idMaquina: '-', qtd: 1, descricao: 'Capa Do Filtro De Resíduo HD-50', valorUnit: 150.6 }
        ],
        desconto: 0,
        frete: 0,
        fluxoAprovacao: 'Supervisor Diversey'
    };

    const result = await generateSolicitacaoPdf(data);
    console.log('PDF gerado:', result.path);
}

if (require.main === module) {
    runSample().catch((err) => {
        console.error('Erro ao gerar PDF:', err);
        process.exit(1);
    });
}

module.exports = { generateSolicitacaoPdf };
