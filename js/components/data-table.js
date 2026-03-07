export function renderDataTable({ headers = [], rows = '' }) {
    return `
        <div class="table-container">
            <table class="table">
                <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}
