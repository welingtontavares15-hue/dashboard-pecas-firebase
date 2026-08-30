(function () {
    'use strict';

    let scheduled = false;
    let observer = null;

    function currentPage() {
        return String(window.App?.currentPage || document.body.dataset.currentPage || '').trim();
    }

    function setDensity() {
        const width = window.innerWidth || document.documentElement.clientWidth || 1366;
        const density = width >= 1600 ? 'comfortable' : (width < 1180 ? 'compact' : 'standard');
        document.body.dataset.wwmDensity = density;
        document.body.classList.add('wwm-smart-layout-ready');
    }

    function cleanMidnight(value) {
        const text = String(value || '').trim();
        return text.replace(/\s+00:00(?::00)?$/, '');
    }

    function annotateCells(table, schema) {
        if (!table || !Array.isArray(schema)) return;
        table.classList.add('wwm-table-smart');
        table.querySelectorAll('tr').forEach((row) => {
            Array.from(row.children).forEach((cell, index) => {
                const kind = schema[index];
                if (kind) cell.classList.add(`wwm-cell-${kind}`);
            });
        });
    }

    function tableDensity(table) {
        if (!table) return;
        const rows = table.tBodies?.[0]?.rows?.length || 0;
        table.dataset.wwmTableDensity = rows >= 12 ? 'dense' : (rows >= 7 ? 'compact' : 'comfortable');
    }

    function normalizeReportFilters() {
        if (currentPage() !== 'relatorios') return;
        const shell = document.querySelector('.report-filters-enterprise');
        if (!shell || shell.dataset.wwmUnified === 'true') return;
        const primary = shell.querySelector('.report-filters-row--primary');
        const secondary = shell.querySelector('.report-filters-row--secondary');
        if (!primary || !secondary) return;

        const grid = document.createElement('div');
        grid.className = 'wwm-smart-filter-grid';
        [...primary.children, ...secondary.children].forEach((child) => {
            if (!child.classList.contains('report-filter-spacer')) grid.appendChild(child);
        });
        primary.remove();
        secondary.remove();
        shell.appendChild(grid);
        shell.classList.add('wwm-filters-unified');
        shell.dataset.wwmUnified = 'true';
    }

    function normalizeOverviewTables() {
        if (currentPage() !== 'relatorios') return;
        document.querySelectorAll('.report-panel-card').forEach((card) => {
            const title = card.querySelector('.card-header h4')?.textContent?.trim() || '';
            const shell = card.querySelector('.dashboard-compact-table');
            const table = shell?.querySelector('table.table');
            if (!shell || !table) return;

            shell.classList.add('wwm-table-shell-smart');
            table.classList.add('wwm-table--overview');
            tableDensity(table);

            if (title === 'Peças com maior custo') {
                table.classList.add('wwm-parts-overview-table');
                annotateCells(table, ['text', 'number', 'money', 'money', 'number', 'number']);
                table.querySelectorAll('tr').forEach((row) => row.children[5]?.classList.add('wwm-column-auxiliary'));
                const header = table.tHead?.rows?.[0]?.cells?.[4];
                if (header && header.textContent.trim() === 'Participação') header.textContent = 'Part.';
            } else if (title === 'Histórico recente') {
                table.classList.add('wwm-recent-overview-table');
                annotateCells(table, ['date', 'id', 'text', 'text', 'money', 'status']);
            }
        });
    }

    function historySolicitations() {
        try {
            if (typeof window.Relatorios?.getFilteredSolicitations === 'function') {
                return window.Relatorios.getFilteredSolicitations() || [];
            }
        } catch (_error) {}
        return [];
    }

    function historyStateNote(sol) {
        const status = typeof window.DataManager?.normalizeWorkflowStatus === 'function'
            ? DataManager.normalizeWorkflowStatus(sol?.status)
            : String(sol?.status || '').toLowerCase();
        if (status === 'rejeitada') {
            return { tone: 'is-rejected', icon: 'fa-circle-xmark', text: 'Solicitação encerrada como rejeitada. As etapas posteriores permanecem apenas como referência do fluxo.' };
        }
        if (['finalizada', 'entregue', 'historico-manual'].includes(status)) {
            return { tone: 'is-complete', icon: 'fa-circle-check', text: 'Fluxo concluído. Este painel consolida o contexto e a trilha da solicitação selecionada.' };
        }
        return { tone: '', icon: 'fa-circle-info', text: 'Selecione outra linha da tabela para consultar instantaneamente o contexto e a etapa atual.' };
    }

    function solicitationPieces(sol) {
        const explicit = Number(sol?._analysisPieces);
        if (Number.isFinite(explicit) && explicit >= 0) return explicit;
        return (Array.isArray(sol?.itens) ? sol.itens : []).reduce((sum, item) => sum + (Number(item?.quantidade) || 0), 0);
    }

    function historyContextKey(sol) {
        return String(sol?.id || sol?.numero || sol?.createdAt || '');
    }

    function enhanceHistoryDetail(sol) {
        const detail = document.querySelector('.wwm-history-detail');
        if (!detail || !sol) return;
        const contextKey = historyContextKey(sol);
        if (detail.dataset.wwmContextKey === contextKey && detail.querySelector('.wwm-history-context')) return;

        detail.querySelector('.wwm-history-context')?.remove();
        detail.querySelector('.wwm-history-state-note')?.remove();

        const client = typeof window.Relatorios?.getSolicitationClientName === 'function'
            ? Relatorios.getSolicitationClientName(sol)
            : (sol.cliente || sol.clienteNome || 'Não informado');
        const requester = typeof window.Relatorios?.getRequesterName === 'function'
            ? Relatorios.getRequesterName(sol)
            : (sol.tecnicoNome || sol.requesterName || 'Não informado');
        const pieces = solicitationPieces(sol);
        const date = cleanMidnight(Utils.formatDate(sol.data || sol.createdAt, true));
        const number = String(sol.numero || '—').replace(/^#/, '');

        const context = document.createElement('div');
        context.className = 'wwm-history-context';
        context.innerHTML = `
            <div class="wwm-history-context-item"><span>Cliente</span><strong>${Utils.escapeHtml(String(client || 'Não informado'))}</strong></div>
            <div class="wwm-history-context-item"><span>Técnico</span><strong>${Utils.escapeHtml(String(requester || 'Não informado'))}</strong></div>
            <div class="wwm-history-context-item"><span>Peças movimentadas</span><strong>${Utils.formatNumber(pieces)}</strong></div>
            <div class="wwm-history-context-item"><span>Data da solicitação</span><strong>${Utils.escapeHtml(date || '—')}</strong></div>
        `;
        const meta = detail.querySelector('.wwm-history-meta');
        if (meta) meta.after(context); else detail.querySelector('.wwm-history-detail-head')?.after(context);

        const noteInfo = historyStateNote(sol);
        const note = document.createElement('div');
        note.className = `wwm-history-state-note ${noteInfo.tone}`.trim();
        note.innerHTML = `<i class="fas ${noteInfo.icon}" aria-hidden="true"></i><span>${Utils.escapeHtml(noteInfo.text)}</span>`;
        context.after(note);

        const headStrong = detail.querySelector('.wwm-history-detail-head strong');
        if (headStrong) headStrong.textContent = `#${number}`;
        detail.querySelectorAll('.wwm-history-meta span').forEach((span) => {
            if (span.querySelector('.fa-calendar')) {
                const icon = span.querySelector('i')?.outerHTML || '';
                span.innerHTML = `${icon}${Utils.escapeHtml(date)}`;
            }
        });
        detail.dataset.wwmContextKey = contextKey;
    }

    function selectHistoryRow(row, sol, rows) {
        const selectedIndex = Math.max(rows.indexOf(row), 0);
        const table = row.closest('table');
        if (table) table.dataset.wwmSelectedIndex = String(selectedIndex);
        rows.forEach((item) => {
            item.classList.toggle('is-selected', item === row);
            item.setAttribute('aria-selected', item === row ? 'true' : 'false');
        });
        const holder = document.querySelector('.wwm-history-grid > div:last-child');
        if (holder && typeof window.Relatorios?.renderHistoryDetail === 'function') {
            holder.innerHTML = Relatorios.renderHistoryDetail(sol);
            enhanceHistoryDetail(sol);
        }
    }

    function normalizeHistory() {
        if (currentPage() !== 'relatorios') return;
        const list = document.querySelector('.wwm-history-list');
        const table = list?.querySelector('table.table');
        if (!table) return;

        const solicitations = historySolicitations();
        if (table.dataset.wwmHistoryReady === 'true') {
            const selectedIndex = Math.max(Number.parseInt(table.dataset.wwmSelectedIndex || '0', 10) || 0, 0);
            const selected = solicitations[selectedIndex] || solicitations[0];
            if (selected) enhanceHistoryDetail(selected);
            return;
        }

        table.dataset.wwmHistoryReady = 'true';
        table.dataset.wwmSelectedIndex = '0';
        table.classList.add('wwm-table-smart', 'wwm-history-table');
        tableDensity(table);
        annotateCells(table, ['id', 'date', 'text', 'text', 'status', 'money']);

        const rows = Array.from(table.tBodies?.[0]?.rows || []);
        rows.forEach((row, index) => {
            const sol = solicitations[index];
            if (!sol) return;
            row.tabIndex = 0;
            row.setAttribute('role', 'button');
            row.setAttribute('aria-label', `Abrir detalhes da solicitação ${String(sol.numero || '')}`.trim());
            row.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
            const dateCell = row.cells[1];
            if (dateCell) dateCell.textContent = cleanMidnight(dateCell.textContent);
            row.addEventListener('click', () => selectHistoryRow(row, sol, rows));
            row.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectHistoryRow(row, sol, rows);
                }
            });
        });
        if (solicitations[0]) enhanceHistoryDetail(solicitations[0]);
    }

    function dashboardInsightFromRows(card) {
        if (!card || card.querySelector('.wwm-dashboard-insight')) return;
        const rows = Array.from(card.querySelectorAll('.v59-table--pieces tbody tr'));
        if (!rows.length) return;
        const firstName = rows[0]?.cells?.[1]?.textContent?.trim() || '—';
        const firstCost = rows[0]?.cells?.[4]?.textContent?.trim() || '—';
        const visibleCost = rows.reduce((sum, row) => {
            const raw = row.cells?.[4]?.textContent || '';
            const numeric = Number(raw.replace(/[^0-9,-]/g, '').replace(/\./g, '').replace(',', '.'));
            return sum + (Number.isFinite(numeric) ? numeric : 0);
        }, 0);
        const insight = document.createElement('div');
        insight.className = 'wwm-dashboard-insight';
        insight.innerHTML = `
            <div class="wwm-dashboard-insight-item"><span>Maior impacto</span><strong>${Utils.escapeHtml(firstName)}</strong></div>
            <div class="wwm-dashboard-insight-item"><span>Custo dos itens exibidos</span><strong>${Utils.formatCurrency(visibleCost || 0)}</strong></div>
        `;
        const link = card.querySelector('.v59-card-link');
        if (link) link.before(insight); else card.appendChild(insight);
        if (firstCost) insight.title = `Maior custo individual exibido: ${firstCost}`;
    }

    function normalizeDashboard() {
        if (currentPage() !== 'dashboard') return;
        const impact = document.getElementById('v59-impact');
        const pieces = impact?.querySelector('.v59-table--pieces');
        const recent = document.getElementById('v59-recent')?.querySelector('.v59-table--recent');
        if (pieces) {
            pieces.classList.add('wwm-table-smart', 'wwm-table--compact');
            annotateCells(pieces, ['number', 'text', 'text', 'number', 'money']);
            tableDensity(pieces);
            const categoryHeader = pieces.tHead?.rows?.[0]?.cells?.[2];
            const categoryValues = Array.from(pieces.tBodies?.[0]?.rows || []).map((row) => row.cells?.[2]?.textContent?.trim()).filter(Boolean);
            if (categoryHeader && categoryValues.length && categoryValues.every((value) => value === '—')) {
                pieces.querySelectorAll('tr').forEach((row) => row.children[2]?.classList.add('wwm-column-empty'));
            }
        }
        if (recent) {
            recent.classList.add('wwm-table-smart');
            annotateCells(recent, ['date', 'id', 'text', 'text', 'money', 'status']);
            tableDensity(recent);
        }
        dashboardInsightFromRows(impact);
    }

    function normalizeOperationalActions() {
        document.querySelectorAll('.actions .premium-row-menu > summary').forEach((summary) => {
            summary.setAttribute('aria-label', summary.getAttribute('aria-label') || 'Mais ações');
            summary.setAttribute('title', summary.getAttribute('title') || 'Mais ações');
        });
    }

    function enhance() {
        setDensity();
        normalizeReportFilters();
        normalizeOverviewTables();
        normalizeHistory();
        normalizeDashboard();
        normalizeOperationalActions();
    }

    function schedule() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            enhance();
        });
    }

    function init() {
        setDensity();
        schedule();
        const content = document.getElementById('content-area');
        if (content && !observer) {
            observer = new MutationObserver(schedule);
            observer.observe(content, { childList: true, subtree: true });
        }
        window.addEventListener('resize', schedule, { passive: true });
        window.addEventListener('data:updated', schedule);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
