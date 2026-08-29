const HistoryV60 = {
  selectedId: null,
  filters: { status: '', tecnico: '', cliente: '', fornecedor: '', search: '' },

  getRows() {
    const rows = Array.isArray(window.DataManager?.getSolicitations?.()) ? DataManager.getSolicitations().slice() : [];
    return rows
      .filter((row) => {
        const status = String(window.AnalyticsHelper?.normalizeStatus?.(row?.status) || row?.status || '').toLowerCase();
        const requester = String(row?.tecnicoNome || row?.requesterName || '').toLowerCase();
        const client = String(row?.cliente || row?.clienteNome || '').toLowerCase();
        const supplier = String(row?.fornecedor || row?.fornecedorNome || '').toLowerCase();
        const haystack = `${row?.numero || ''} ${requester} ${client} ${supplier} ${this.getPartsText(row)}`.toLowerCase();
        return (!this.filters.status || status === this.filters.status)
          && (!this.filters.tecnico || requester === this.filters.tecnico)
          && (!this.filters.cliente || client === this.filters.cliente)
          && (!this.filters.fornecedor || supplier === this.filters.fornecedor)
          && (!this.filters.search || haystack.includes(this.filters.search.toLowerCase()));
      })
      .sort((a, b) => this.getTimestamp(b) - this.getTimestamp(a));
  },

  getTimestamp(row) {
    const date = window.AnalyticsHelper?.getSolicitationDate?.(row) || new Date(row?.data || row?.createdAt || 0);
    return Number.isNaN(date?.getTime?.()) ? 0 : date.getTime();
  },

  getPartsText(row) {
    return (Array.isArray(row?.itens) ? row.itens : []).map((item) => `${item?.descricao || ''} ${item?.codigo || ''}`).join(' ');
  },

  cost(row) {
    const explicit = Number(row?._analysisCost ?? row?.total);
    if (Number.isFinite(explicit)) return explicit;
    return (Array.isArray(row?.itens) ? row.itens : []).reduce((sum, item) => sum + ((Number(item?.quantidade) || 0) * (Number(item?.valorUnit) || 0)), 0);
  },

  status(row) {
    return String(window.AnalyticsHelper?.normalizeStatus?.(row?.status) || row?.status || '').toLowerCase();
  },

  statusOptions(rows) {
    return Array.from(new Set(rows.map((r) => this.status(r)).filter(Boolean))).sort();
  },

  dimensionOptions(rows, resolver) {
    return Array.from(new Set(rows.map(resolver).filter(Boolean).map((v) => String(v).trim()).filter(Boolean))).sort((a,b) => a.localeCompare(b, 'pt-BR'));
  },

  kpis(rows) {
    const finalized = rows.filter((r) => ['finalizada','entregue','historico-manual'].includes(this.status(r))).length;
    const totalCost = rows.reduce((sum, row) => sum + this.cost(row), 0);
    const completed = rows.filter((r) => ['finalizada','entregue','historico-manual'].includes(this.status(r)));
    const durations = completed.map((r) => {
      const start = Number(r?.createdAt) || this.getTimestamp(r);
      const end = Number(r?.finalizedAt || r?.updatedAt || r?.deliveredAt || 0);
      return start && end && end >= start ? end - start : 0;
    }).filter(Boolean);
    const avgMs = durations.length ? durations.reduce((a,b)=>a+b,0)/durations.length : 0;
    const avgHours = Math.round(avgMs / 3600000);
    return { total: rows.length, finalized, totalCost, avgHours };
  },

  render() {
    const content = document.getElementById('content-area');
    if (!content) return;
    const all = Array.isArray(window.DataManager?.getSolicitations?.()) ? DataManager.getSolicitations().slice() : [];
    const rows = this.getRows();
    const selected = rows.find((r) => String(r?.id) === String(this.selectedId)) || rows[0] || null;
    if (selected) this.selectedId = selected.id;
    const metrics = this.kpis(rows);
    const statuses = this.statusOptions(all);
    const technicians = this.dimensionOptions(all, (r) => r?.tecnicoNome || r?.requesterName || '');
    const clients = this.dimensionOptions(all, (r) => r?.cliente || r?.clienteNome || '');
    const suppliers = this.dimensionOptions(all, (r) => r?.fornecedor || r?.fornecedorNome || '');

    content.innerHTML = `
      <div class="wwm-history-v60">
        <div class="history-titlebar">
          <div><h1>Histórico de solicitações</h1><p>Acompanhe o histórico completo das solicitações de peças e o andamento de cada etapa.</p></div>
          <button class="btn btn-outline" type="button" onclick="HistoryV60.exportCsv()"><i class="fas fa-download"></i> Exportar</button>
        </div>

        <div class="history-filter-grid">
          <label>Status<select id="hist-status"><option value="">Todos</option>${statuses.map((v)=>`<option value="${Utils.escapeHtml(v)}" ${this.filters.status===v?'selected':''}>${Utils.escapeHtml(v)}</option>`).join('')}</select></label>
          <label>Cliente<select id="hist-cliente"><option value="">Todos</option>${clients.map((v)=>`<option value="${Utils.escapeHtml(v.toLowerCase())}" ${this.filters.cliente===v.toLowerCase()?'selected':''}>${Utils.escapeHtml(v)}</option>`).join('')}</select></label>
          <label>Técnico<select id="hist-tecnico"><option value="">Todos</option>${technicians.map((v)=>`<option value="${Utils.escapeHtml(v.toLowerCase())}" ${this.filters.tecnico===v.toLowerCase()?'selected':''}>${Utils.escapeHtml(v)}</option>`).join('')}</select></label>
          <label>Fornecedor<select id="hist-fornecedor"><option value="">Todos</option>${suppliers.map((v)=>`<option value="${Utils.escapeHtml(v.toLowerCase())}" ${this.filters.fornecedor===v.toLowerCase()?'selected':''}>${Utils.escapeHtml(v)}</option>`).join('')}</select></label>
          <label>Buscar<input id="hist-search" type="search" placeholder="Número, peça, cliente..." value="${Utils.escapeHtml(this.filters.search)}"></label>
          <label>Período<input type="text" readonly value="Base completa"></label>
        </div>

        <div class="history-kpis">
          <article class="history-kpi"><span>Solicitações no período</span><strong>${Utils.formatNumber(metrics.total)}</strong></article>
          <article class="history-kpi"><span>Finalizadas</span><strong>${Utils.formatNumber(metrics.finalized)}</strong></article>
          <article class="history-kpi"><span>Tempo médio de conclusão</span><strong>${metrics.avgHours ? `${Math.floor(metrics.avgHours/24)}d ${metrics.avgHours%24}h` : '—'}</strong></article>
          <article class="history-kpi"><span>Custo total no período</span><strong>${Utils.formatCurrency(metrics.totalCost)}</strong></article>
        </div>

        <div class="history-content-grid">
          <section class="history-panel">
            <div class="history-panel-header"><strong>Solicitações históricas</strong><span>${Utils.formatNumber(rows.length)} resultados</span></div>
            <div class="history-results">${rows.length ? rows.map((row)=>this.renderRow(row, selected)).join('') : '<div class="v59-empty" style="padding:28px">Nenhum registro encontrado.</div>'}</div>
          </section>
          <section class="history-panel">${selected ? this.renderTimeline(selected) : '<div class="timeline-card"><h3>Nenhuma solicitação selecionada</h3></div>'}</section>
        </div>
      </div>`;

    this.bind();
  },

  renderRow(row, selected) {
    const active = selected && String(selected.id) === String(row.id);
    const requester = row?.tecnicoNome || row?.requesterName || 'Não informado';
    const client = row?.cliente || row?.clienteNome || 'Não informado';
    return `<div class="history-row ${active?'active':''}" data-history-id="${Utils.escapeHtml(String(row.id || ''))}">
      <span class="history-select-dot"></span>
      <strong>#${Utils.escapeHtml(String(row?.numero || 'Sem número').replace(/^#/,''))}</strong>
      <span>${Utils.escapeHtml(requester)}</span>
      <span>${Utils.escapeHtml(client)}</span>
      <span>${Utils.renderStatusBadge(row?.status)}</span>
      <span class="history-cost">${Utils.formatCurrency(this.cost(row))}</span>
    </div>`;
  },

  renderTimeline(row) {
    const status = this.status(row);
    const number = Utils.escapeHtml(String(row?.numero || 'Sem número').replace(/^#/,''));
    const steps = [
      { key:'created', label:'Solicitação criada', state:'done', when: row?.createdAt || row?.data },
      { key:'approval', label:'Em aprovação', state: ['pendente','rascunho','enviada'].includes(status)?'current':'done', when: row?.approvalSubmittedAt || row?.createdAt },
      { key:'approved', label:'Aprovada', state: ['aprovada','em-transito','entregue','finalizada','historico-manual'].includes(status)?'done':(['rejeitada'].includes(status)?'pending':'pending'), when: row?.approvedAt },
      { key:'sent', label:'Pedido enviado ao fornecedor', state: ['em-transito','entregue','finalizada','historico-manual'].includes(status)?'done':'pending', when: row?.sentAt || row?.trackingCreatedAt },
      { key:'received', label:'Peça recebida', state: ['entregue','finalizada','historico-manual'].includes(status)?'done':'pending', when: row?.deliveredAt },
      { key:'final', label:'Finalizada', state: ['finalizada','historico-manual'].includes(status)?'done':'pending', when: row?.finalizedAt }
    ];
    return `<div class="timeline-card"><h3>#${number}</h3><div class="timeline-meta">${Utils.escapeHtml(row?.cliente || row?.clienteNome || 'Cliente não informado')} · ${Utils.formatCurrency(this.cost(row))}</div><div class="timeline">${steps.map((step)=>`<div class="timeline-step ${step.state}"><span class="timeline-dot"><i class="fas ${step.state==='done'?'fa-check':step.state==='current'?'fa-clock':'fa-circle'}"></i></span><div class="timeline-copy"><strong>${step.label}</strong><span>${step.when ? Utils.formatDate(step.when) : 'Aguardando próxima etapa.'}</span></div></div>`).join('')}</div></div>`;
  },

  bind() {
    const rerender = () => this.render();
    ['hist-status','hist-cliente','hist-tecnico','hist-fornecedor'].forEach((id) => {
      document.getElementById(id)?.addEventListener('change', (event) => {
        const key = id.replace('hist-','');
        this.filters[key] = event.target.value;
        rerender();
      });
    });
    const search = document.getElementById('hist-search');
    search?.addEventListener('input', Utils.debounce((event) => {
      this.filters.search = event.target.value.trim();
      rerender();
    }, 220));
    document.querySelectorAll('[data-history-id]').forEach((row) => row.addEventListener('click', () => {
      this.selectedId = row.dataset.historyId;
      rerender();
    }));
  },

  exportCsv() {
    const rows = this.getRows();
    const header = ['Numero','Data','Cliente','Tecnico','Status','Custo'];
    const lines = rows.map((row) => [row?.numero || '', Utils.formatDate(row?.data || row?.createdAt), row?.cliente || row?.clienteNome || '', row?.tecnicoNome || row?.requesterName || '', this.status(row), this.cost(row)].map((v)=>`"${String(v).replace(/"/g,'""')}"`).join(';'));
    const blob = new Blob([[header.join(';'), ...lines].join('\n')], { type:'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'historico-solicitacoes-wwm.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }
};

window.HistoryV60 = HistoryV60;
export async function ensureLoaded() { return true; }
export function render() { HistoryV60.render(); }
