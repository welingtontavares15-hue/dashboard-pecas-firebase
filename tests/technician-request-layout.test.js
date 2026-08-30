const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css/technician-history.css'), 'utf8');
const technicianExperience = fs.readFileSync(path.join(root, 'js/technician-experience.js'), 'utf8');

describe('Minhas solicitações - layout do técnico', () => {
  test('lista e cards ocupam toda a largura disponível', () => {
    expect(css).toMatch(/\.technician-request-list[\s\S]*?width:\s*100%/);
    expect(css).toMatch(/\.technician-request-cards[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(css).toMatch(/\.technician-request-card[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(css).toMatch(/\.technician-request-card[\s\S]*?width:\s*100%/);
    expect(css).toMatch(/\.technician-request-card[\s\S]*?min-width:\s*0/);
  });

  test('cabeçalho mantém número e status separados sem posicionamento absoluto', () => {
    const heading = css.match(/\.technician-request-heading\s*\{([\s\S]*?)\}/)?.[1] || '';
    expect(heading).toMatch(/display:\s*flex/);
    expect(heading).toMatch(/justify-content:\s*space-between/);
    expect(heading).toMatch(/gap:\s*16px/);

    const badge = css.match(/\.technician-request-heading \.status-badge\s*\{([\s\S]*?)\}/)?.[1] || '';
    expect(badge).toMatch(/position:\s*static/);
  });

  test('rodapé integra metadados e ações na mesma superfície do card', () => {
    const footer = css.match(/\.technician-request-footer\s*\{([\s\S]*?)\}/)?.[1] || '';
    const actions = css.match(/\.technician-request-actions\s*\{([\s\S]*?)\}/)?.[1] || '';
    expect(footer).toMatch(/justify-content:\s*space-between/);
    expect(footer).toMatch(/background:\s*transparent/);
    expect(actions).toMatch(/background:\s*transparent/);
    expect(actions).toMatch(/border:\s*0/);
    expect(css).not.toMatch(/\.technician-request-actions[\s\S]{0,260}border-left/);
  });

  test('cliente, metadados e ações possuem hierarquia e controles próprios', () => {
    expect(css).toMatch(/\.technician-request-summary h3[\s\S]*?font-size:\s*\.92rem/);
    expect(css).toMatch(/\.technician-request-metadata[\s\S]*?flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.technician-request-actions[\s\S]*?flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.technician-request-actions button[\s\S]*?min-height:\s*36px/);
    expect(css).toMatch(/\.technician-request-actions button:hover/);
    expect(css).toMatch(/\.technician-request-actions button:focus-visible/);
    expect(technicianExperience).toContain('fa-eye');
    expect(technicianExperience).toContain('fa-copy');
    expect(technicianExperience).toContain('fa-file-pdf');
  });

  test('responsividade quebra o rodapé sem largura fixa em tablet e mobile', () => {
    expect(css).toContain('@media (max-width: 1100px)');
    expect(css).toContain('@media (max-width: 820px)');
    expect(css).toContain('@media (max-width: 560px)');
    expect(css).not.toMatch(/\.technician-request-card[\s\S]{0,220}width:\s*(?:2\d\dpx|w-56|w-64)/);
  });

  test('renderer continua usando apenas ações existentes e é exclusivo do técnico', () => {
    expect(technicianExperience).toContain("root.Auth?.getRole?.()==='tecnico'");
    expect(technicianExperience).toContain('Solicitacoes.viewDetails');
    expect(technicianExperience).toContain('Solicitacoes.duplicate');
    expect(technicianExperience).toContain('Solicitacoes.downloadPDF');
    expect(technicianExperience).toContain('isTechnician()?renderTechnicianList(this):table()');
  });
});
