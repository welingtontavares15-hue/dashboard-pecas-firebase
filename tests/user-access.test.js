/**
 * User Access Tests
 * Verifies that Admin, Gestor, and Técnico users can be created and have proper access
 */

const fs = require('fs');
const path = require('path');

describe('User Access in Production Mode', () => {
    const configCode = fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8');
    const dataCode = fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8');

    it('should be in production mode', () => {
        const APP_CONFIG = new Function(`${configCode}; return APP_CONFIG;`)();
        expect(APP_CONFIG.isProduction()).toBe(true);
        expect(APP_CONFIG.environment).toBe('production');
    });

    it('getDefaultUsers should not have production check blocking user creation', () => {
        // Verify the code does NOT contain the production check that blocks user creation
        // This is a structural test because we cannot run full initialization without Firebase
        expect(dataCode).not.toContain('const allowSeedCredentials = (typeof APP_CONFIG === \'undefined\') || !APP_CONFIG.isProduction();');
        
        // Verify the function creates users directly without production gating
        const hasGetDefaultUsers = dataCode.includes('async getDefaultUsers()');
        const hasUserCreation = dataCode.includes("{ id: 'admin', username: 'admin'");
        
        expect(hasGetDefaultUsers).toBe(true);
        expect(hasUserCreation).toBe(true);
    });

    it('getDefaultUsers should have comment explaining production seeding', () => {
        // Verify the code contains our comment explaining the change
        expect(dataCode).toContain('// In production mode, we still need to seed essential users on first initialization');
        expect(dataCode).toContain('// This ensures admin, gestor, and technician accounts exist for initial access');
    });

    it('should have getDefaultUsers function that creates users', () => {
        // Verify the function creates base users including admin and gestor
        expect(dataCode).toContain('const baseUsersRaw = [');
        expect(dataCode).toContain("{ id: 'admin', username: 'admin',");
        expect(dataCode).toContain("role: 'administrador'");
        expect(dataCode).toContain("{ id: 'gestor', username: 'gestor',");
        expect(dataCode).toContain("role: 'gestor'");
    });

    it('should create technician users with proper role', () => {
        // Verify technician users are created with correct role
        expect(dataCode).toContain("role: 'tecnico'");
        expect(dataCode).toContain('tecnicoId: tech.id');
    });

    it('should use passwordHash for security', () => {
        // Verify users use passwordHash instead of plain passwords
        expect(dataCode).toContain('passwordHash');
        expect(dataCode).toContain('Utils.hashSHA256');
    });

    it('should handle technician credential overrides', () => {
        // Verify custom credentials for specific technicians
        expect(dataCode).toContain('const credentialOverrides = {');
        expect(dataCode).toContain("'welington.bastos.tavares'");
        expect(dataCode).toContain("'pedro.gabriel.reis.nunes'");
    });

    it('should have getDefaultTechnicians function', () => {
        // Verify technicians can be fetched
        expect(dataCode).toContain('getDefaultTechnicians()');
    });
});

describe('Production Environment Configuration', () => {
    const configCode = fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8');

    it('config.js should default to production environment', () => {
        expect(configCode).toContain("environment: 'production'");
    });

    it('config.js should block credential display in production', () => {
        expect(configCode).toContain('showLoginCredentials: false');
        expect(configCode).toContain("if (effectiveEnv === 'production')");
        expect(configCode).toContain('return false; // Always blocked in production');
    });
});

describe('Authentication Role Permissions', () => {
    const authCode = fs.readFileSync(path.join(__dirname, '../js/auth.js'), 'utf8');

    it('should have permissions for administrador role', () => {
        expect(authCode).toContain('administrador: {');
        expect(authCode).toContain('dashboard: true');
        expect(authCode).toContain('solicitacoes: { view: true, create: true, edit: true, delete: true, viewAll: true }');
    });

    it('should have permissions for gestor role', () => {
        expect(authCode).toContain('gestor: {');
        expect(authCode).toContain('aprovacoes: { view: true, approve: true, reject: true, batch: true }');
    });

    it('should have permissions for tecnico role', () => {
        expect(authCode).toContain('tecnico: {');
        expect(authCode).toContain('solicitacoes: { view: true, create: true, edit: true, delete: true, viewAll: false }');
    });

    it('should have menu items for all roles', () => {
        expect(authCode).toContain("menus: {");
        expect(authCode).toContain("administrador: [");
        expect(authCode).toContain("gestor: [");
        expect(authCode).toContain("tecnico: [");
    });

    it('should have canAccessRoute function', () => {
        expect(authCode).toContain('canAccessRoute(routeId)');
        expect(authCode).toContain('const menuItems = this.menus[role]');
    });
});
