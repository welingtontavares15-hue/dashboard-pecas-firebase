/**
 * OneDrive Integration Module
 * Responsible for saving solicitation backups to OneDrive without impacting UI flows.
 * The module is resilient: if no access token/config is present, it logs the intent locally and exits silently.
 */

const ONEDRIVE_AUDIT_KEY = 'diversey_onedrive_audit';
const ONEDRIVE_CSV_HEADERS = ['Número', 'Técnico', 'Data', 'Descrição', 'Quantidade', 'Valor unitário', 'Total', 'Status'];
const ONEDRIVE_AUDIT_LIMIT = 50;
const ONEDRIVE_FOLDER_FALLBACK = 'solicitacao';
const ONEDRIVE_TECH_FALLBACK = 'tecnico';
const ONEDRIVE_SUMMARY_PREFIX = 'solicitacao-';
const ONEDRIVE_ITEM_PREFIX = 'item-';

const OneDriveIntegration = {
    graphBase: 'https://graph.microsoft.com/v1.0',
    // Shared workbook link used to discover the drive and parent folder
    cachedShareUrl: null,
    cachedShareId: null,
    rootFolderName: 'Solicitações',
    requestTimeout: 8000,
    cachedContext: null,

    /**
     * Queue a solicitation to be backed up to OneDrive.
     */
    enqueueSync(solicitation) {
        if (!solicitation) return;
        const snapshot = this.buildSnapshot(solicitation);
        this.persistAudit(snapshot, 'queued');
        // Run in next tick to avoid blocking UI operations
        setTimeout(() => this.syncSnapshot(snapshot), 0);
    },

    /**
     * Build a lightweight snapshot of the solicitation.
     */
    buildSnapshot(solicitation) {
        const itens = (solicitation.itens || []).map(item => {
            const quantidade = Number(item.quantidade) || 0;
            const valorUnit = Number(item.valorUnit) || 0;
            return {
                codigo: item.codigo || '',
                descricao: item.descricao || '',
                quantidade,
                valorUnit,
                subtotal: Number((quantidade * valorUnit).toFixed(2))
            };
        });

        const header = {
            numero: solicitation.numero || '',
            tecnico: solicitation.tecnicoNome || '',
            tecnicoId: solicitation.tecnicoId || '',
            data: solicitation.data || '',
            status: solicitation.status || '',
            subtotal: Number(solicitation.subtotal) || 0,
            desconto: Number(solicitation.desconto) || 0,
            frete: Number(solicitation.frete) || 0,
            total: Number(solicitation.total) || 0,
            observacoes: solicitation.observacoes || '',
            createdBy: solicitation.createdBy || '',
            createdAt: solicitation.createdAt || Date.now()
        };

        return {
            id: solicitation.id,
            folderName: this.buildFolderName(solicitation),
            header,
            itens,
            metadata: {
                ...header,
                itens: itens.length,
                timestamp: Date.now()
            }
        };
    },

    sanitizeName(text, fallback) {
        const baseFallback = fallback || ONEDRIVE_FOLDER_FALLBACK;
        if (typeof Utils !== 'undefined' && Utils.sanitizeFilename) {
            return Utils.sanitizeFilename(text, baseFallback);
        }
        const cleanText = (text || baseFallback).toString().replace(/[^a-z0-9]+/gi, '_');
        const trimmedText = cleanText.replace(/^_+|_+$/g, '');
        return trimmedText || baseFallback;
    },

    /**
     * Build folder name using solicitation number and technician.
     */
    buildFolderName(solicitation) {
        const numero = solicitation.numero || ONEDRIVE_FOLDER_FALLBACK;
        const tecnico = solicitation.tecnicoNome || ONEDRIVE_TECH_FALLBACK;
        return `${this.sanitizeName(numero, ONEDRIVE_FOLDER_FALLBACK)}-${this.sanitizeName(tecnico, ONEDRIVE_TECH_FALLBACK)}`;
    },

    /**
     * Persist minimal audit trail locally to support traceability even offline.
     */
    persistAudit(snapshot, state, success = true, errorMessage = '') {
        try {
            const log = JSON.parse(localStorage.getItem(ONEDRIVE_AUDIT_KEY) || '[]');
            log.unshift({
                id: snapshot.id,
                numero: snapshot.header.numero,
                status: snapshot.header.status,
                state,
                success,
                error: errorMessage || null,
                at: Date.now()
            });
            const trimmed = log.slice(0, ONEDRIVE_AUDIT_LIMIT);
            localStorage.setItem(ONEDRIVE_AUDIT_KEY, JSON.stringify(trimmed));
        } catch (e) {
            console.warn('OneDrive audit persistence failed', e);
        }
    },

    /**
     * Execute the synchronization with OneDrive (if configured).
     */
    async syncSnapshot(snapshot) {
        if (!snapshot) return;

        if (!this.hasToken()) {
            this.persistAudit(snapshot, 'skipped-no-token', false, 'Missing OneDrive token');
            return;
        }

        try {
            const context = await this.getContext();
            if (!context) {
                this.persistAudit(snapshot, 'skipped-no-context', false, 'Share context unavailable');
                return;
            }

            const rootFolderId = await this.ensureFolder(context.driveId, context.parentId, this.rootFolderName);
            if (!rootFolderId) {
                this.persistAudit(snapshot, 'skipped-root-folder', false, 'Failed to prepare root folder');
                return;
            }

            const solicitationFolderId = await this.ensureFolder(context.driveId, rootFolderId, snapshot.folderName);
            if (!solicitationFolderId) {
                this.persistAudit(snapshot, 'skipped-sol-folder', false, 'Failed to prepare solicitation folder');
                return;
            }

            // Upload summary CSV
            const summaryCsv = this.buildCsv(snapshot);
            const summaryFilename = `${ONEDRIVE_SUMMARY_PREFIX}${snapshot.header.numero || snapshot.id}.csv`;
            await this.uploadFile(context.driveId, solicitationFolderId, summaryFilename, summaryCsv, 'text/csv');

            // Upload item-level CSV files
            for (const item of snapshot.itens) {
                const itemCsv = this.buildItemCsv(snapshot, item);
                const safeCode = this.sanitizeName(item.codigo, 'item');
                await this.uploadFile(
                    context.driveId,
                    solicitationFolderId,
                    `${ONEDRIVE_ITEM_PREFIX}${safeCode}.csv`,
                    itemCsv,
                    'text/csv'
                );
            }

            // Upload metadata JSON
            await this.uploadFile(
                context.driveId,
                solicitationFolderId,
                'metadata.json',
                JSON.stringify(snapshot.metadata, null, 2),
                'application/json'
            );

            this.persistAudit(snapshot, 'synced');
        } catch (error) {
            console.warn('OneDrive sync failed', error);
            this.persistAudit(snapshot, 'error', false, error?.message || 'Unexpected error');
        }
    },

    /**
     * Build CSV content respecting the required column order.
     */
    buildCsv(snapshot) {
        const rows = (snapshot.itens.length ? snapshot.itens : [{
            descricao: 'Resumo da solicitação',
            quantidade: '',
            valorUnit: '',
            subtotal: snapshot.header.total
        }]).map(item => ([
            snapshot.header.numero,
            snapshot.header.tecnico,
            snapshot.header.data,
            item.descricao,
            item.quantidade,
            item.valorUnit,
            item.subtotal,
            snapshot.header.status
        ]));

        return [ONEDRIVE_CSV_HEADERS.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    },

    /**
     * Build per-item CSV content.
     */
    buildItemCsv(snapshot, item) {
        const row = [
            snapshot.header.numero,
            snapshot.header.tecnico,
            snapshot.header.data,
            item.descricao,
            item.quantidade,
            item.valorUnit,
            item.subtotal,
            snapshot.header.status
        ];
        return [ONEDRIVE_CSV_HEADERS.join(';'), row.join(';')].join('\n');
    },

    /**
     * Retrieve OneDrive context (drive and parent folder) based on the shared workbook link.
     */
    async getContext() {
        if (this.cachedContext) return this.cachedContext;
        const shareId = this.getShareId();
        if (!shareId) return null;

        const item = await this.graphRequest(`/shares/${shareId}/driveItem`);
        if (item && item.parentReference && item.parentReference.driveId && item.parentReference.id) {
            this.cachedContext = {
                driveId: item.parentReference.driveId,
                parentId: item.parentReference.id
            };
            return this.cachedContext;
        }
        return null;
    },

    /**
     * Resolve the configured SharePoint URL with safe fallbacks.
     */
    getShareUrl() {
        if (this.cachedShareUrl !== null && this.cachedShareUrl !== undefined) {
            return this.cachedShareUrl;
        }

        const resolved = window.ONE_DRIVE_SHARE_URL
            || window.ONE_DRIVE_DEFAULT_SHARE_URL
            || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('onedrive_share_url') : '')
            || (typeof localStorage !== 'undefined' ? localStorage.getItem('onedrive_share_url') : '')
            || '';

        this.cachedShareUrl = resolved;
        return resolved;
    },

    /**
     * Ensure a child folder exists; returns its ID.
     */
    async ensureFolder(driveId, parentId, name) {
        const safeName = (typeof Utils !== 'undefined' && Utils.sanitizeFilename)
            ? Utils.sanitizeFilename(name, 'pasta')
            : (name || 'pasta');

        const existing = await this.findFolder(driveId, parentId, safeName);
        if (existing && existing.id) return existing.id;

        const body = {
            name: safeName,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'replace'
        };

        const created = await this.graphRequest(
            `/drives/${driveId}/items/${parentId}/children`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }
        );

        return created?.id || null;
    },

    /**
     * Find a folder by name inside a parent item.
     */
    async findFolder(driveId, parentId, name) {
        const response = await this.graphRequest(
            `/drives/${driveId}/items/${parentId}/children?$select=id,name,folder`
        );

        if (response && Array.isArray(response.value)) {
            return response.value.find(item => item.folder && item.name === name) || null;
        }
        return null;
    },

    /**
     * Upload a file to OneDrive.
     */
    async uploadFile(driveId, parentId, filename, content, contentType = 'text/plain') {
        return this.graphRequest(
            `/drives/${driveId}/items/${parentId}:/${encodeURIComponent(filename)}:/content`,
            {
                method: 'PUT',
                headers: { 'Content-Type': contentType },
                body: content
            }
        );
    },

    /**
     * Execute a Graph API request with timeout and basic error handling.
     */
    async graphRequest(path, options = {}) {
        const token = this.getAccessToken();
        if (!token) return null;

        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        let timeoutId = null;

        try {
            const request = fetch(`${this.graphBase}${path}`, {
                ...options,
                headers: {
                    Authorization: `Bearer ${token}`,
                    ...(options.headers || {})
                },
                signal: controller ? controller.signal : undefined
            });

            let response;
            if (controller) {
                timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
                response = await request;
            } else {
                response = await Promise.race([
                    request,
                    new Promise((_, reject) => {
                        timeoutId = setTimeout(() => reject(new Error('Request timeout')), this.requestTimeout);
                    })
                ]);
            }

            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }

            if (!response.ok) {
                const message = `Graph request failed: ${response.status}`;
                throw new Error(message);
            }

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                return await response.json();
            }
            return await response.text();
        } catch (error) {
            console.warn('Graph request error', error);
            return null;
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    },

    /**
     * Compute Graph share ID from the public SharePoint URL.
     */
    getShareId() {
        try {
            if (this.cachedShareId) return this.cachedShareId;
            const shareUrl = this.getShareUrl();
            if (!shareUrl) return null;
            const base64Url = this.toBase64(shareUrl)
                .replace(/[=+/]/g, (char) => {
                    const map = { '=': '', '+': '-', '/': '_' };
                    return map[char] !== undefined ? map[char] : '';
                });
            this.cachedShareId = `u!${base64Url}`;
            return this.cachedShareId;
        } catch (e) {
            console.warn('Failed to build share ID', e);
            return null;
        }
    },

    /**
     * Check if an access token is available.
     */
    hasToken() {
        return !!this.getAccessToken();
    },

    /**
     * Retrieve access token from the safest available storage.
     * Consumers can set window.ONE_DRIVE_ACCESS_TOKEN, sessionStorage, or explicitly opt-in to persisted storage.
     */
    getAccessToken() {
        if (window.ONE_DRIVE_ACCESS_TOKEN) return window.ONE_DRIVE_ACCESS_TOKEN;
        if (typeof sessionStorage !== 'undefined') {
            const sessionToken = sessionStorage.getItem('onedrive_access_token');
            if (sessionToken) return sessionToken;
        }
        if (typeof window !== 'undefined' && window.ONE_DRIVE_ALLOW_PERSISTENT_TOKEN && typeof localStorage !== 'undefined') {
            return localStorage.getItem('onedrive_access_token');
        }
        return null;
    },

    /**
     * Safe base64 encoder for URLs without using deprecated APIs.
     */
    toBase64(value) {
        try {
            if (typeof TextEncoder !== 'undefined') {
                const bytes = new TextEncoder().encode(value);
                const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
                return btoa(binary);
            }
            // Fallback using encodeURIComponent for environments without TextEncoder
            const encoded = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
            return btoa(encoded);
        } catch (e) {
            console.warn('Fallback base64 encoding in use', e);
            try {
                const encoded = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
                return btoa(encoded);
            } catch (err) {
                console.warn('Base64 encoding failed', err);
                return '';
            }
        }
    }
};

// Expose globally
window.OneDriveIntegration = OneDriveIntegration;
