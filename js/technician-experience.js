(function () {
    'use strict';

    function isTechnician() {
        return typeof Auth !== 'undefined' && Auth.getRole() === 'tecnico';
    }

    function normalizeStatus(sol) {
        return typeof DataManager !== 'undefined' && typeof DataManager.normalizeWorkflowStatus === 'function'
            ? DataManager.normalizeWorkflowStatus(sol.status)
            : String(sol.status || '').trim();
    }

    function ensureBottomNavigation() {
        let nav = document.getElementById('technician-bottom-navigation');
        if (!isTechnician()) {
            nav?.remove();
            document.body.classList.remove('technician-mobile-shell');
            return;
        }

        if (!nav) {
            nav = document.createElement('nav');
            nav.id = 'technician-bottom-navigation';
            nav.className = 'technician-bottom-navigation';
            nav.setAttribute('aria-label', 'Navegação principal do técnico');
            nav.innerHTML = `
                <button type="button" data-page="nova-solicitacao"><i class="fas fa-plus"></i><span>Nova</span></button>
                <button type="button" data-page="minhas-solicitacoes"><i class="fas fa-clipboard-list"></i><span>Pedidos</span></button>
                <button type="button" data-page="catalogo"><i class="fas fa-magnifying-glass"></i><span>Catálogo</span></button>
                <button type="button" data-page="perfil"><i class="fas fa-user"></i><span>Conta</span></button>`;
            nav.addEventListener('click', (event) => {
                const button = event.target.closest('[data-page]');
                if (button && typeof App !== 'undefined') App.navigate(button.dataset.page);
            });
            document.body.appendChild(nav);
        }

        const currentPage = typeof App !== 'undefined' ? App.currentPage : '';
        nav.querySelectorAll('[data-page]').forEach((button) => {
            const active = button.dataset.page === currentPage
                || (button.dataset.page === 'minhas-solicitacoes' && currentPage === 'nova-solicitacao');
            button.classList.toggle('active', active);
            button.setAttribute('aria-current', active ? 'page' : 'false');
        });
        document.body.classList.add('technician-mobile-shell');
    }

    function renderTechnicianList(solicitacoes) {
        const requests = solicitacoes.getFilteredSolicitations();
        const total = requests.length;
        const totalPages = Math.max(Math.ceil(total / solicitacoes.itemsPerPage), 1);
        solicitacoes.currentPage = Math.min(solicitacoes.currentPage, totalPages);
        const start = (solicitacoes.currentPage - 1) * solicitacoes.itemsPerPage;
        const pageItems = requests.slice(start, start + solicitacoes.itemsPerPage);

        if (!total) {
            return `<div class="technician-empty-state"><i class="fas fa-clipboard-list"></i><h3>Nenhum pedido encontrado</h3><p>${solicitacoes.hasActiveFilters() ? 'Ajuste os filtros para ampliar a busca.' : 'Crie sua primeira solicitação de peças.'}</p><button class="btn btn-primary" type="button" onclick="Solicitacoes.openForm()"><i class="fas fa-plus"></i> Nova solicitação</button></div>`;
        }

        const currentTecnicoId = Auth.getTecnicoId();
        const canEdit = Auth.hasPermission('solicitacoes', 'edit');
        const cards = pageItems.map((sol) => {
            const status = normalizeStatus(sol);
            const parts = solicitacoes.getPieceSummary(sol.itens || []);
            const quantity = solicitacoes.getItemsQuantity(sol.itens || []);
            const canReceive = (solicitacoes.sameId(sol.tecnicoId, currentTecnicoId)
                || solicitacoes.sameId(sol.requesterTecnicoId, currentTecnicoId)) && status === 'em-transito';

            return `<article class="technician-request-card">
                <button class="technician-request-summary" type="button" onclick="Solicitacoes.viewDetails('${sol.id}')">
                    <div class="technician-request-heading"><strong>#${Utils.escapeHtml(String(sol.numero || '-'))}</strong>${Utils.renderStatusBadge(status)}</div>
                    <h3>${Utils.escapeHtml(sol.cliente || 'Cliente não informado')}</h3>
                    <p class="technician-request-part"><i class="fas fa-gears"></i><span>${Utils.escapeHtml(parts.short)}</span></p>
                    <div class="technician-request-metadata">
                        <span><i class="far fa-calendar"></i>${Utils.formatDate(sol.data || sol.createdAt)}</span>
                        <span><i class="fas fa-box"></i>${Utils.formatNumber(quantity)} ${quantity === 1 ? 'item' : 'itens'}</span>
                        ${sol.trackingCode ? `<span><i class="fas fa-truck"></i>${Utils.escapeHtml(sol.trackingCode)}</span>` : ''}
                    </div>
                </button>
                <div class="technician-request-actions">
                    <button class="primary" type="button" onclick="Solicitacoes.viewDetails('${sol.id}')"><i class="fas fa-eye"></i><span>Detalhes</span></button>
                    ${canEdit && status === 'pendente' ? `<button type="button" onclick="Solicitacoes.openForm('${sol.id}')"><i class="fas fa-pen"></i><span>Editar</span></button>` : ''}
                    <button type="button" onclick="Solicitacoes.duplicate('${sol.id}')"><i class="fas fa-copy"></i><span>Duplicar</span></button>
                    ${canReceive ? `<button class="success" type="button" onclick="Solicitacoes.confirmDelivery('${sol.id}')"><i class="fas fa-check-circle"></i><span>Recebi</span></button>` : ''}
                    <button type="button" onclick="Solicitacoes.downloadPDF('${sol.id}')"><i class="fas fa-file-pdf"></i><span>PDF</span></button>
                </div>
            </article>`;
        }).join('');

        return `<section class="technician-request-list" aria-label="Histórico de pedidos"><div class="technician-list-counter">${total} ${total === 1 ? 'pedido' : 'pedidos'}</div><div class="technician-request-cards">${cards}</div>${Utils.renderPagination(solicitacoes.currentPage, totalPages, (page) => { solicitacoes.currentPage = page; solicitacoes.refreshTable(); })}</section>`;
    }

    function patchSolicitations() {
        if (typeof Solicitacoes === 'undefined' || Solicitacoes.__technicianExperiencePatched) return false;
        const originalRender = Solicitacoes.render.bind(Solicitacoes);
        const originalRenderTable = Solicitacoes.renderTable.bind(Solicitacoes);

        Solicitacoes.render = function () {
            const result = originalRender();
            const content = document.getElementById('content-area');
            if (content) content.dataset.productPage = isTechnician() ? 'minhas-solicitacoes' : 'solicitacoes';
            ensureBottomNavigation();
            return result;
        };

        Solicitacoes.renderTable = function () {
            return isTechnician() ? renderTechnicianList(this) : originalRenderTable();
        };
        Solicitacoes.__technicianExperiencePatched = true;
        return true;
    }

    function init() {
        let attempts = 0;
        const timer = setInterval(() => {
            attempts += 1;
            patchSolicitations();
            ensureBottomNavigation();
            if (attempts >= 120 || (typeof Solicitacoes !== 'undefined' && Solicitacoes.__technicianExperiencePatched)) clearInterval(timer);
        }, 100);
        window.addEventListener('resize', ensureBottomNavigation);
        window.addEventListener('data:updated', () => setTimeout(ensureBottomNavigation, 0));
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();