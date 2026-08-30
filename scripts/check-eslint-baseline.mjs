import { spawnSync } from 'node:child_process';

const MAX_LEGACY_ERRORS = 442;
const MAX_LEGACY_WARNINGS = 2;

const result = spawnSync(
    process.execPath,
    ['./node_modules/eslint/bin/eslint.js', 'js/*.js', '--format', 'json'],
    {
        encoding: 'utf8',
        shell: true,
        maxBuffer: 20 * 1024 * 1024
    }
);

if (!result.stdout?.trim()) {
    console.error('Não foi possível obter o relatório JSON do ESLint.');
    if (result.stderr) {
        console.error(result.stderr);
    }
    process.exit(1);
}

let report;
try {
    report = JSON.parse(result.stdout);
} catch (error) {
    console.error('Relatório ESLint inválido:', error.message);
    process.exit(1);
}

const totals = report.reduce((acc, file) => {
    acc.errors += Number(file.errorCount) || 0;
    acc.warnings += Number(file.warningCount) || 0;
    return acc;
}, { errors: 0, warnings: 0 });

console.log(`ESLint baseline: ${totals.errors} erro(s), ${totals.warnings} aviso(s).`);

if (totals.errors > MAX_LEGACY_ERRORS || totals.warnings > MAX_LEGACY_WARNINGS) {
    console.error(
        `Dívida ESLint aumentou. Máximo permitido: ${MAX_LEGACY_ERRORS} erros / ${MAX_LEGACY_WARNINGS} avisos.`
    );
    process.exit(1);
}

console.log('Baseline ESLint não regrediu. Novos módulos críticos são validados em gate separado.');
