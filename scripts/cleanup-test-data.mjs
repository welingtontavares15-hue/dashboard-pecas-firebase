#!/usr/bin/env node
/**
 * Cleanup script to remove test data from Firebase RTDB.
 * - Dry-run by default; use --apply to delete.
 * - Targets /data/diversey_solicitacoes and /data/diversey_export_files.
 * - Criteria: status === 'teste', source/createdBy contains "test",
 *             description/title contains "teste", or created recently by local admin/test accounts.
 */

import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const APPLY_MODE = args.includes('--apply');
const EXPLICIT_DRY_RUN = args.includes('--dry-run');
if (APPLY_MODE && EXPLICIT_DRY_RUN) {
    throw new Error('Escolha apenas um modo: utilize --apply OU --dry-run.');
}
const DRY_RUN = EXPLICIT_DRY_RUN || !APPLY_MODE;
const WINDOW_HOURS = parseInt((args.find((a) => a.startsWith('--window-hours=')) || '').split('=')[1], 10) || 24;
const NOW = Date.now();
const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;

const ADMIN_TEST_USERS = ['admin', 'admin_local', 'local', 'healthcheck', 'test', 'qa'];

function log(msg) {
    console.log(msg);
}

function loadCredential() {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        return JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'));
    }
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        return JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
    }
    const localKey = path.join(__dirname, '..', 'serviceAccountKey.json');
    if (fs.existsSync(localKey)) {
        return JSON.parse(fs.readFileSync(localKey, 'utf8'));
    }
    return null;
}

function initFirebase() {
    const databaseURL = process.env.DATABASE_URL ||
        process.env.URL_DO_BANCO_DE_DADOS_FIREBASE;
    if (!databaseURL) {
        throw new Error('Informe DATABASE_URL ou URL_DO_BANCO_DE_DADOS_FIREBASE para evitar uso acidental do ambiente errado.');
    }
    const credential = loadCredential();
    if (!credential) {
        throw new Error('Credenciais do Firebase não encontradas. Configure as credenciais de serviço antes de executar a limpeza.');
    }

    const app = initializeApp({
        credential: credential ? cert(credential) : applicationDefault(),
        databaseURL
    });
    return getDatabase(app);
}

function normalizeText(value) {
    return String(value || '').toLowerCase();
}

function shouldDeleteSolicitation(item) {
    if (!item || typeof item !== 'object') {
        return { match: false, reasons: [] };
    }
    const reasons = [];
    const status = normalizeText(item.status);
    const source = normalizeText(item.source || item.createdBy);
    const description = normalizeText(item.description || item.descricao || item.title || item.titulo || item.observacoes);
    const createdAt = Number(item.createdAt) || Number(item.dataCriacao) || 0;
    const createdBy = normalizeText(item.createdBy || item.usuario || '');

    if (status === 'teste' || status === 'test') {
        reasons.push('status_teste');
    }
    if (source.includes('test')) {
        reasons.push('source_test');
    }
    if (description.includes('teste') || description.includes('test')) {
        reasons.push('descricao_teste');
    }
    if (createdAt && NOW - createdAt <= WINDOW_MS && ADMIN_TEST_USERS.some((u) => createdBy.includes(u))) {
        reasons.push('janela_recente_admin_local');
    }

    return { match: reasons.length > 0, reasons };
}

function shouldDeleteExport(item) {
    if (!item || typeof item !== 'object') {
        return { match: false, reasons: [] };
    }
    const reasons = [];
    const status = normalizeText(item.status);
    const source = normalizeText(item.source || item.createdBy);
    const description = normalizeText(item.description || item.title || item.filename || '');
    const createdAt = Number(item.createdAt) || 0;
    const createdBy = normalizeText(item.createdBy || '');

    if (status === 'teste' || status === 'test') {
        reasons.push('status_teste');
    }
    if (source.includes('test')) {
        reasons.push('source_test');
    }
    if (description.includes('teste') || description.includes('test')) {
        reasons.push('descricao_teste');
    }
    if (createdAt && NOW - createdAt <= WINDOW_MS && ADMIN_TEST_USERS.some((u) => createdBy.includes(u))) {
        reasons.push('janela_recente_admin_local');
    }

    return { match: reasons.length > 0, reasons };
}

async function scanAndClean(db) {
    const summary = [];
    const targets = [
        { path: 'diversey_solicitacoes', label: 'Solicitações', predicate: shouldDeleteSolicitation },
        { path: 'diversey_export_files', label: 'Arquivos de exportação', predicate: shouldDeleteExport }
    ];

    for (const target of targets) {
        const ref = db.ref(`data/${target.path}`);
        const snapshot = await ref.get();
        const node = snapshot.val();
        const list = Array.isArray(node?.data) ? node.data : [];
        const matches = [];
        const reasonCount = {};

        list.forEach((item, index) => {
            const result = target.predicate(item);
            if (result.match) {
                matches.push({ index, item, reasons: result.reasons });
                result.reasons.forEach((r) => { reasonCount[r] = (reasonCount[r] || 0) + 1; });
            }
        });

        summary.push({ target: target.label, total: list.length, matched: matches.length, reasons: reasonCount });

        if (matches.length === 0) {
            log(`Nenhum registro de teste encontrado em ${target.label}.`);
            continue;
        }

        log(`Encontrados ${matches.length} registros de teste em ${target.label}.`);
        matches.slice(0, 10).forEach((m) => {
            const id = m.item?.id || m.item?.numero || m.item?.filename || m.index;
            log(` - [${target.label}] ${id} :: ${m.reasons.join(', ')}`);
        });

        if (DRY_RUN) {
            continue;
        }

        const deleteSet = new Set(matches.map((m) => m.index));
        const cleaned = list.filter((_, idx) => !deleteSet.has(idx));
        await ref.child('data').set(cleaned);
        log(`> Removidos ${matches.length} registros de ${target.label}.`);
    }

    return summary;
}

function printSummary(summary) {
    log('\nResumo da execução:');
    summary.forEach((s) => {
        const reasons = Object.entries(s.reasons || {})
            .map(([k, v]) => `${k}: ${v}`)
            .join(' | ') || 'nenhum';
        log(`- ${s.target}: ${s.matched}/${s.total} marcados para remoção (${reasons})`);
    });
    log(`Modo: ${DRY_RUN ? 'DRY-RUN (nenhuma remoção aplicada)' : 'APPLY (remoção executada)'}`);
}

async function main() {
    log(`Iniciando limpeza (janela: últimas ${WINDOW_HOURS}h) - modo ${DRY_RUN ? 'DRY-RUN' : 'APPLY'}`);
    const db = initFirebase();
    const summary = await scanAndClean(db);
    printSummary(summary);
}

main().catch((err) => {
    console.error('Falha ao executar limpeza de dados de teste:', err.message);
    process.exit(1);
});
