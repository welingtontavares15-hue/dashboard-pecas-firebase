#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'pdf-solicitacao.html');
const DEFAULT_MARGIN = { top: '20mm', right: '18mm', bottom: '20mm', left: '18mm' };
const SYSTEM_CHROMIUM_PATHS = ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome'];

function formatGeneratedAt(date) {
    const stamp = date || new Date();
    return `Gerado em: ${stamp.toLocaleDateString('pt-BR')}, ${stamp.toLocaleTimeString('pt-BR')}`;
}

function getExecutablePath() {
    const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROMIUM_PATH;
    if (fromEnv && path.isAbsolute(fromEnv) && fs.existsSync(fromEnv)) {
        return fromEnv;
    }
    const systemPath = SYSTEM_CHROMIUM_PATHS.find((bin) => fs.existsSync(bin));
    return systemPath || null;
}

function buildPayload(data) {
    const items = Array.isArray(data.itens) ? data.itens : [];
    const subtotalItens = items.reduce((acc, item) => {
        const qty = Number(item.qtd ?? item.quantidade ?? 0);
        const unit = Number(item.valorUnit ?? 0);
        return acc + (qty * unit);
    }, 0);

    const desconto = Number(data.desconto || 0);
    const frete = Number(data.frete || 0);
    const total = subtotalItens - desconto + frete;
    const generatedAt = new Date();

    return {
        ...data,
        subtotalItens,
        total,
        generatedAt: generatedAt.toISOString(),
        generatedAtFormatted: formatGeneratedAt(generatedAt)
    };
}

async function loadTemplate() {
    return fs.promises.readFile(TEMPLATE_PATH, 'utf-8');
}

function injectDataIntoTemplate(template, payload) {
    const serialized = JSON.stringify(payload);
    const base64 = Buffer.from(serialized, 'utf-8').toString('base64');
    const safeBase64 = base64
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/<\/script/gi, '<\\/script');
    return template.replace('__SOLICITACAO_DATA__', JSON.stringify(safeBase64));
}

/**
 * Gera o PDF de solicitação a partir do JSON informado.
 * @param {object} data - Dados da solicitação.
 * @param {object} options - Opções adicionais.
 * @param {string} [options.path] - Caminho para salvar o arquivo (opcional).
 * @returns {Promise<{buffer: Buffer, filename: string, payload: object}>}
 */
async function generateSolicitacaoPdf(data, options = {}) {
    const payload = buildPayload(data);
    const template = await loadTemplate();
    const html = injectDataIntoTemplate(template, payload);

    const executablePath = getExecutablePath();
    const launchOptions = {
        headless: true,
        args: ['--no-sandbox', '--font-render-hinting=medium']
    };

    if (executablePath) {
        launchOptions.executablePath = executablePath;
    }

    const browser = await puppeteer.launch(launchOptions);

    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        await page.emulateMediaType('print');

        const pdfOptions = {
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: DEFAULT_MARGIN
        };

        if (options.path) {
            await fs.promises.mkdir(path.dirname(options.path), { recursive: true });
            pdfOptions.path = options.path;
        }

        const buffer = await page.pdf(pdfOptions);
        return {
            buffer,
            filename: `Solicitacao_${data.numero || 'sem-numero'}.pdf`,
            payload
        };
    } finally {
        await browser.close();
    }
}

async function runSample() {
    const sampleData = {
        numero: 'REQ-20251218-0010',
        tecnico: 'Welington Bastos Tavares',
        data: '2025-12-18',
        endereco: 'AV Morumbi Qd 34 Lt 11',
        cidadeUf: 'Anápolis / GO',
        envio: 'Normal',
        cep: '75134-550',
        itens: [
            { codigo: 'CS008', idMaquina: '-', qtd: 1, descricao: 'Bicos Injetores Do Braço HD-50/HD-80', valorUnit: 114.48 },
            { codigo: 'CS020', idMaquina: '-', qtd: 1, descricao: 'Capa Do Filtro De Resíduo HD-50', valorUnit: 150.60 }
        ],
        desconto: 0,
        frete: 0,
        fluxoAprovacao: 'Supervisor Diversey',
        solicitanteLabel: 'Solicitante',
        recebidoPorLabel: 'Recebido por'
    };

    const outputDir = path.join(__dirname, '..', 'out');
    const outputPath = path.join(outputDir, `Solicitacao_${sampleData.numero}.pdf`);

    const { buffer, filename, payload } = await generateSolicitacaoPdf(sampleData, { path: outputPath });

    console.log(`PDF gerado: ${outputPath}`);
    console.log(`Subtotal itens: ${payload.subtotalItens.toFixed(2)} | Total: ${payload.total.toFixed(2)}`);
    console.log(`Arquivo: ${filename}`);
}

if (require.main === module) {
    runSample().catch((err) => {
        console.error('Erro ao gerar PDF de solicitação:', err);
        process.exit(1);
    });
}

module.exports = { generateSolicitacaoPdf };
