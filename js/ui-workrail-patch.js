/**
 * UI Workrail Patch
 * Adapta visualmente os componentes ao design do Workrail
 * Preserva 100% da lógica Firebase e sincronismo
 * 
 * Este arquivo apenas sobrescreve renderização visual, não altera:
 * - DataManager (sincronismo)
 * - Auth (autenticação)
 * - Listeners em tempo real
 * - Fluxos de criação/edição/exclusão
 * - Queries Firebase
 */

(function() {
  'use strict';

  /**
   * Patch para renderização de menu/sidebar
   */
  if (typeof Auth !== 'undefined' && Auth.renderMenu) {
    const originalRenderMenu = Auth.renderMenu;
    Auth.renderMenu = function(container) {
      // Chama renderização original
      originalRenderMenu.call(this, container);
      
      // Aplica classes Workrail ao menu
      const navItems = container.querySelectorAll('[data-page]');
      navItems.forEach(item => {
        item.classList.add('nav-item');
        item.classList.remove('nav-link', 'sidebar-link');
      });
      
      // Adapta badges
      const badges = container.querySelectorAll('[data-badge]');
      badges.forEach(badge => {
        badge.classList.add('nav-badge');
        const status = badge.getAttribute('data-badge');
        if (status === 'red' || status === 'danger') {
          badge.classList.add('red');
        } else if (status === 'amber' || status === 'warning') {
          badge.classList.add('amber');
        }
      });
      
      // Adapta seções
      const sections = container.querySelectorAll('[data-section]');
      sections.forEach(section => {
        section.classList.add('nav-section');
        const label = section.querySelector('h3, .section-label');
        if (label) {
          label.classList.add('nav-section-label');
        }
      });
    };
  }

  /**
   * Patch para renderização de tabelas
   */
  if (typeof Utils !== 'undefined' && Utils.enhanceTables) {
    const originalEnhanceTables = Utils.enhanceTables;
    Utils.enhanceTables = function(container) {
      originalEnhanceTables.call(this, container);
      
      // Adapta tabelas ao design Workrail
      const tables = container.querySelectorAll('table');
      tables.forEach(table => {
        const wrapper = table.parentElement;
        if (!wrapper.classList.contains('table-wrapper')) {
          const newWrapper = document.createElement('div');
          newWrapper.className = 'table-wrapper';
          table.parentElement.insertBefore(newWrapper, table);
          newWrapper.appendChild(table);
        }
        
        // Adapta headers
        const headers = table.querySelectorAll('th');
        headers.forEach(th => {
          th.style.textTransform = 'uppercase';
          th.style.fontSize = '10.5px';
          th.style.fontWeight = '700';
          th.style.letterSpacing = '.06em';
        });
      });
    };
  }

  /**
   * Patch para status badges
   */
  if (typeof Utils !== 'undefined' && Utils.renderStatusBadge) {
    const originalRenderStatusBadge = Utils.renderStatusBadge;
    Utils.renderStatusBadge = function(status, label) {
      const html = originalRenderStatusBadge.call(this, status, label);
      
      // Mapeia status para classes Workrail
      const statusMap = {
        'pendente': 'c-pending',
        'pending': 'c-pending',
        'analysis': 'c-analysis',
        'em-analise': 'c-analysis',
        'aprovada': 'c-approved',
        'approved': 'c-approved',
        'rejeitada': 'c-rejected',
        'rejected': 'c-rejected',
        'fornecedor': 'c-supplier',
        'supplier': 'c-supplier',
        'em-transito': 'c-transit',
        'transit': 'c-transit',
        'instalacao': 'c-install',
        'install': 'c-install',
        'finalizada': 'c-done',
        'done': 'c-done',
        'entregue': 'c-done'
      };
      
      const normalizedStatus = String(status || '').toLowerCase().replace(/\s+/g, '-');
      const chipClass = statusMap[normalizedStatus] || 'c-pending';
      
      // Cria chip com classe Workrail
      const chip = document.createElement('span');
      chip.className = `chip ${chipClass}`;
      chip.innerHTML = `<span class="chip-dot"></span>${label || status}`;
      
      return chip.outerHTML;
    };
  }

  /**
   * Patch para toasts
   */
  if (typeof Utils !== 'undefined' && Utils.showToast) {
    const originalShowToast = Utils.showToast;
    Utils.showToast = function(message, type = 'info', duration = 3000) {
      // Remove toasts antigos
      const oldToasts = document.querySelectorAll('.toast');
      oldToasts.forEach(t => t.remove());
      
      // Cria novo toast com classe Workrail
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      
      const typeIcons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warn: 'fa-exclamation-triangle'
      };
      
      const icon = typeIcons[type] || 'fa-info-circle';
      toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span class="toast-msg">${message}</span>
      `;
      
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 220);
      }, duration);
    };
  }

  /**
   * Patch para modais
   */
  if (typeof Utils !== 'undefined' && Utils.showModal) {
    const originalShowModal = Utils.showModal;
    Utils.showModal = function(title, content, buttons = []) {
      // Cria modal com estrutura Workrail
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay show';
      
      const modal = document.createElement('div');
      modal.className = 'modal';
      
      const header = document.createElement('div');
      header.className = 'modal-header';
      header.innerHTML = `
        <div class="modal-header-icon">
          <i class="fas fa-info-circle"></i>
        </div>
        <h3 class="modal-header-title">${title}</h3>
        <button class="modal-close" aria-label="Fechar">
          <i class="fas fa-times"></i>
        </button>
      `;
      
      const body = document.createElement('div');
      body.className = 'modal-body';
      body.innerHTML = content;
      
      const footer = document.createElement('div');
      footer.className = 'modal-footer';
      
      buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = `btn ${btn.primary ? 'btn-primary' : 'btn-secondary'}`;
        button.textContent = btn.label;
        button.onclick = btn.onclick;
        footer.appendChild(button);
      });
      
      modal.appendChild(header);
      modal.appendChild(body);
      if (buttons.length > 0) {
        modal.appendChild(footer);
      }
      
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      // Fecha ao clicar no X
      header.querySelector('.modal-close').onclick = () => {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
      };
      
      // Fecha ao clicar fora
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('show');
          setTimeout(() => overlay.remove(), 300);
        }
      };
      
      return overlay;
    };
  }

  /**
   * Patch para botões
   */
  function patchButtons() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
      if (!btn.classList.contains('btn')) {
        // Detecta tipo de botão pela classe ou conteúdo
        if (btn.classList.contains('btn-submit') || btn.textContent.includes('Salvar') || btn.textContent.includes('Enviar')) {
          btn.classList.add('btn', 'btn-primary');
        } else if (btn.classList.contains('btn-cancel') || btn.textContent.includes('Cancelar')) {
          btn.classList.add('btn', 'btn-secondary');
        } else if (btn.classList.contains('btn-danger') || btn.textContent.includes('Deletar') || btn.textContent.includes('Remover')) {
          btn.classList.add('btn', 'btn-danger');
        } else if (btn.classList.contains('btn-success') || btn.textContent.includes('Aprovar')) {
          btn.classList.add('btn', 'btn-success');
        } else {
          btn.classList.add('btn', 'btn-secondary');
        }
      }
    });
  }

  /**
   * Patch para inputs
   */
  function patchInputs() {
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (!input.classList.contains('form-control')) {
        input.classList.add('form-control');
      }
    });
  }

  /**
   * Patch para cards KPI
   */
  function patchKPICards() {
    const kpiCards = document.querySelectorAll('[data-kpi], .kpi-card, [class*="kpi"]');
    kpiCards.forEach(card => {
      if (!card.classList.contains('kpi-card')) {
        card.classList.add('kpi-card');
      }
    });
  }

  /**
   * Inicializa patches ao carregar DOM
   */
  function initPatches() {
    patchButtons();
    patchInputs();
    patchKPICards();
  }

  // Executa patches quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPatches);
  } else {
    initPatches();
  }

  // Reaplica patches quando conteúdo dinâmico é carregado
  const observer = new MutationObserver(() => {
    patchButtons();
    patchInputs();
    patchKPICards();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Exporta para uso global
  window.UIWorkrailPatch = {
    patchButtons,
    patchInputs,
    patchKPICards,
    initPatches
  };
})();
