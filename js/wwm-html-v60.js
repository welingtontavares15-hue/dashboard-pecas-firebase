(function () {
  'use strict';

  const VERSION = '20260829v60';
  const ROLE_GROUPS = {
    administrador: [
      { title:'PRINCIPAL', items:[['dashboard','Visão Geral','fa-house'],['solicitacoes','Solicitações','fa-file-lines'],['aprovacoes','Aprovações','fa-square-check'],['historico','Histórico','fa-clock-rotate-left'],['relatorios','Relatórios','fa-chart-column']] },
      { title:'GESTÃO', items:[['pecas','Peças','fa-cube'],['tecnicos','Técnicos','fa-user-gear'],['fornecedores','Fornecedores','fa-truck']] },
      { title:'SISTEMA', items:[['configuracoes','Sistema','fa-gear']] }
    ],
    gestor: [
      { title:'PRINCIPAL', items:[['dashboard','Visão Geral','fa-house'],['solicitacoes','Solicitações','fa-file-lines'],['aprovacoes','Aprovações','fa-square-check'],['historico','Histórico','fa-clock-rotate-left'],['relatorios','Relatórios','fa-chart-column']] },
      { title:'SISTEMA', items:[['configuracoes','Sistema','fa-gear']] }
    ],
    tecnico: [
      { title:'OPERAÇÃO', items:[['solicitacoes','Minhas Solicitações','fa-file-lines'],['historico','Histórico','fa-clock-rotate-left'],['pecas','Catálogo de Peças','fa-cube']] },
      { title:'CONTA', items:[['perfil','Meu Perfil','fa-user-gear'],['ajuda','Ajuda','fa-circle-question']] }
    ]
  };

  function hasAccess(id) {
    if (!window.Auth) return false;
    const role = Auth.getRole();
    if (id === 'historico') return Boolean(Auth.hasPermission?.('solicitacoes','view'));
    if (id === 'dashboard') return ['administrador','gestor'].includes(role);
    if (id === 'solicitacoes') return Auth.hasPermission?.('solicitacoes','view');
    if (id === 'aprovacoes') return Auth.hasPermission?.('aprovacoes','view');
    if (id === 'relatorios') return Auth.hasPermission?.('relatorios','view');
    if (id === 'pecas') return Auth.hasPermission?.('pecas','view');
    if (id === 'tecnicos') return Auth.hasPermission?.('tecnicos','view');
    if (id === 'fornecedores') return Auth.hasPermission?.('fornecedores','view');
    if (id === 'configuracoes') return Auth.hasPermission?.('configuracoes','view');
    return true;
  }

  function pendingCount() {
    try { return Array.isArray(DataManager?.getPendingSolicitations?.()) ? DataManager.getPendingSolicitations().length : 0; }
    catch (_) { return 0; }
  }

  function renderMenu(activeId) {
    const nav = document.getElementById('sidebar-nav');
    if (!nav || !window.Auth) return;
    const role = Auth.getRole();
    const groups = ROLE_GROUPS[role];
    if (!groups) {
      if (window.NavigationMaster?.render) NavigationMaster.render(Auth, activeId);
      return;
    }
    const pending = pendingCount();
    nav.innerHTML = groups.map((group) => {
      const items = group.items.filter(([id]) => hasAccess(id)).map(([id,label,icon]) => {
        const active = id === activeId || (id === 'dashboard' && activeId === 'visao-geral');
        const badge = id === 'aprovacoes' && pending > 0 ? `<span class="nav-badge">${pending}</span>` : '';
        return `<a class="nav-item ${active?'active':''}" data-page="${id}" title="${label}" ${active?'aria-current="page"':''}><i class="fas ${icon}"></i><span>${label}</span>${badge}</a>`;
      }).join('');
      return `<section class="nav-group"><button type="button" class="nav-group-toggle" aria-expanded="true"><span>${group.title}</span></button><div class="nav-group-items">${items}</div></section>`;
    }).join('');

    const user = Auth.getCurrentUser?.();
    const roleLabel = Auth.getRoleLabel?.(role) || role;
    [['user-name',user?.name||'Usuário'],['user-role',roleLabel],['header-user-name',user?.name||'Usuário'],['header-user-role',roleLabel]].forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.textContent=value;});
  }

  async function renderHistory() {
    const mod = await import(`./pages/historico-v60.js?v=${VERSION}`);
    await mod.ensureLoaded?.();
    mod.render?.();
  }

  function install() {
    document.body?.classList.add('wwm-html-v60');
    document.documentElement.dataset.uiRelease = 'wwm-html-v60';
    window.WWM_HTML_VERSION = 'v60';

    if (!window.App || !window.Auth || App.__wwmHtmlV60Installed) return false;

    const originalCanAccess = Auth.canAccessRoute?.bind(Auth);
    Auth.canAccessRoute = function(routeId) {
      if (routeId === 'historico') return hasAccess('historico');
      return originalCanAccess ? originalCanAccess(routeId) : hasAccess(routeId);
    };

    Auth.renderMenu = function(activeId) { renderMenu(activeId); };

    const originalBreadcrumb = App.updateBreadcrumb.bind(App);
    App.updateBreadcrumb = function(pageId) {
      document.body.dataset.wwmPage = pageId;
      if (pageId === 'historico') {
        const breadcrumb = document.getElementById('breadcrumb');
        if (breadcrumb) breadcrumb.innerHTML = '<span>Portal de Solicitação de Peças WWM</span><span style="opacity:.5;margin:0 8px">›</span><strong>Histórico de solicitações</strong>';
        return;
      }
      originalBreadcrumb(pageId);
    };

    const originalRenderPage = App.renderPage.bind(App);
    App.renderPage = async function(pageId, renderSequence = App._activeRenderSequence) {
      if (pageId !== 'historico') return originalRenderPage(pageId, renderSequence);
      Utils.showLoading();
      try {
        await renderHistory();
      } catch (error) {
        console.error('Falha ao carregar Histórico v60', error);
        Utils.showToast('Não foi possível carregar o histórico.', 'error');
      } finally {
        Utils.hideLoading();
      }
    };

    const originalNavigate = App.navigate.bind(App);
    App.navigate = async function(pageId) {
      document.body.dataset.wwmPage = pageId;
      const result = await originalNavigate(pageId);
      window.setTimeout(() => renderMenu(pageId), 0);
      return result;
    };

    const originalShowApp = App.showApp.bind(App);
    App.showApp = function() {
      originalShowApp();
      window.setTimeout(() => renderMenu(App.currentPage || App.getDefaultPage()), 0);
    };

    App.__wwmHtmlV60Installed = true;
    return true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();

  let attempts=0;
  const timer=setInterval(()=>{attempts+=1;if(install()||attempts>50)clearInterval(timer);},100);
})();
