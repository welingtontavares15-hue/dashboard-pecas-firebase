export function renderHeaderTitle(title, subtitle = '') {
    return `
        <div class="page-header">
            <h2>${title}</h2>
            ${subtitle ? `<p class="text-muted">${subtitle}</p>` : ''}
        </div>
    `;
}
