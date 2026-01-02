/**
 * User Management Tests
 * Verifies user management module functionality
 */

const fs = require('fs');
const path = require('path');

describe('User Management Module', () => {
    const userManagerCode = fs.readFileSync(path.join(__dirname, '../js/user-manager.js'), 'utf8');
    const authCode = fs.readFileSync(path.join(__dirname, '../js/auth.js'), 'utf8');
    const appCode = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');

    describe('UserManager Module Structure', () => {
        it('should define UserManager object', () => {
            expect(userManagerCode).toContain('const UserManager = {');
        });

        it('should have createUser function', () => {
            expect(userManagerCode).toContain('async createUser(userData)');
        });

        it('should have updateUser function', () => {
            expect(userManagerCode).toContain('async updateUser(userId, updates)');
        });

        it('should have deleteUser function', () => {
            expect(userManagerCode).toContain('async deleteUser(userId)');
        });

        it('should have resetPassword function', () => {
            expect(userManagerCode).toContain('async resetPassword(userId, newPassword)');
        });

        it('should have listUsers function', () => {
            expect(userManagerCode).toContain('listUsers(filters = {})');
        });

        it('should have validateUserData function', () => {
            expect(userManagerCode).toContain('validateUserData(userData)');
        });

        it('should have generateSecurePassword function', () => {
            expect(userManagerCode).toContain('generateSecurePassword()');
        });

        it('should have toggleUserStatus function', () => {
            expect(userManagerCode).toContain('async toggleUserStatus(userId)');
        });

        it('should have logAudit function', () => {
            expect(userManagerCode).toContain('logAudit(action, userId, newData, oldData)');
        });
    });

    describe('User Validation', () => {
        it('should validate username format', () => {
            expect(userManagerCode).toContain('const usernameRegex');
            expect(userManagerCode).toContain('usernameRegex.test(userData.username)');
        });

        it('should validate required fields', () => {
            expect(userManagerCode).toContain('if (!userData.username');
            expect(userManagerCode).toContain('if (!userData.name');
            expect(userManagerCode).toContain('if (!userData.role');
        });

        it('should validate password length', () => {
            expect(userManagerCode).toContain('userData.password.length < 6');
        });

        it('should validate email format', () => {
            expect(userManagerCode).toContain('const emailRegex');
        });

        it('should validate role values', () => {
            expect(userManagerCode).toContain('const validRoles');
            expect(userManagerCode).toContain("'administrador'");
            expect(userManagerCode).toContain("'gestor'");
            expect(userManagerCode).toContain("'tecnico'");
        });
    });

    describe('Security Features', () => {
        it('should prevent deleting last administrator', () => {
            expect(userManagerCode).toContain('Não é possível remover o último administrador');
        });

        it('should use password hashing', () => {
            expect(userManagerCode).toContain('Auth.hashPassword');
            expect(userManagerCode).toContain('passwordHash');
        });

        it('should track who created users', () => {
            expect(userManagerCode).toContain('createdBy:');
            expect(userManagerCode).toContain('updatedBy:');
        });

        it('should track timestamps', () => {
            expect(userManagerCode).toContain('createdAt:');
            expect(userManagerCode).toContain('updatedAt:');
        });

        it('should implement audit logging', () => {
            expect(userManagerCode).toContain('logAudit(');
            expect(userManagerCode).toContain('auditEntry');
        });
    });

    describe('Integration with Auth Module', () => {
        it('should have user-management menu item for admins', () => {
            expect(authCode).toContain("id: 'user-management'");
            expect(authCode).toContain("icon: 'fa-users-cog'");
            expect(authCode).toContain("label: 'Gerenciar Usuários'");
        });

        it('should be in Sistema section', () => {
            const lines = authCode.split('\n');
            const userMgmtLine = lines.findIndex(line => line.includes("id: 'user-management'"));
            expect(userMgmtLine).toBeGreaterThan(-1);
            
            const userMgmtSection = lines[userMgmtLine];
            expect(userMgmtSection).toContain("section: 'Sistema'");
        });

        it('should only appear in administrador menu', () => {
            const adminMenuMatch = authCode.match(/administrador:\s*\[([\s\S]*?)\],\s*gestor:/);
            expect(adminMenuMatch).toBeTruthy();
            expect(adminMenuMatch[1]).toContain('user-management');
            
            // Should NOT appear in gestor or tecnico menus
            const gestorMenuMatch = authCode.match(/gestor:\s*\[([\s\S]*?)\],\s*tecnico:/);
            expect(gestorMenuMatch).toBeTruthy();
            expect(gestorMenuMatch[1]).not.toContain('user-management');
        });
    });

    describe('Integration with App Module', () => {
        it('should handle user-management route', () => {
            expect(appCode).toContain("case 'user-management':");
            expect(appCode).toContain('renderUserManagement()');
        });

        it('should have renderUserManagement function', () => {
            expect(appCode).toContain('renderUserManagement()');
        });

        it('should load user-management.html in iframe', () => {
            expect(appCode).toContain('user-management.html');
        });

        it('should have user-management in breadcrumb labels', () => {
            expect(appCode).toContain("'user-management': 'Gerenciar Usuários'");
        });
    });

    describe('Password Reset Tool', () => {
        const resetToolPath = path.join(__dirname, '../scripts/reset-user-passwords.html');
        
        it('should exist', () => {
            expect(fs.existsSync(resetToolPath)).toBe(true);
        });

        it('should have Firebase configuration', () => {
            const resetToolCode = fs.readFileSync(resetToolPath, 'utf8');
            expect(resetToolCode).toContain('firebaseConfig');
            expect(resetToolCode).toContain('firebase.initializeApp');
        });

        it('should have password hashing function', () => {
            const resetToolCode = fs.readFileSync(resetToolPath, 'utf8');
            expect(resetToolCode).toContain('async function computePasswordHash');
            expect(resetToolCode).toContain('PASSWORD_SALT');
        });

        it('should have reset functions', () => {
            const resetToolCode = fs.readFileSync(resetToolPath, 'utf8');
            expect(resetToolCode).toContain('async function resetAdmin()');
            expect(resetToolCode).toContain('async function resetGestor()');
            expect(resetToolCode).toContain('async function resetAll()');
        });
    });

    describe('User Management Interface', () => {
        const uiPath = path.join(__dirname, '../user-management.html');
        
        it('should exist', () => {
            expect(fs.existsSync(uiPath)).toBe(true);
        });

        it('should define UserManagementUI', () => {
            const uiCode = fs.readFileSync(uiPath, 'utf8');
            expect(uiCode).toContain('const UserManagementUI = {');
        });

        it('should have user list functionality', () => {
            const uiCode = fs.readFileSync(uiPath, 'utf8');
            expect(uiCode).toContain('loadUsers()');
            expect(uiCode).toContain('renderUsers(users)');
        });

        it('should have filter functionality', () => {
            const uiCode = fs.readFileSync(uiPath, 'utf8');
            expect(uiCode).toContain('applyFilters()');
            expect(uiCode).toContain('filter-role');
            expect(uiCode).toContain('filter-status');
            expect(uiCode).toContain('filter-search');
        });

        it('should have CRUD operations', () => {
            const uiCode = fs.readFileSync(uiPath, 'utf8');
            expect(uiCode).toContain('showCreateModal()');
            expect(uiCode).toContain('editUser(userId)');
            expect(uiCode).toContain('saveUser()');
            expect(uiCode).toContain('deleteUser(userId)');
        });

        it('should have password management', () => {
            const uiCode = fs.readFileSync(uiPath, 'utf8');
            expect(uiCode).toContain('resetUserPassword(userId)');
            expect(uiCode).toContain('generatePassword()');
        });

        it('should have export functionality', () => {
            const uiCode = fs.readFileSync(uiPath, 'utf8');
            expect(uiCode).toContain('exportUsers()');
            expect(uiCode).toContain('generateCSV(users)');
        });
    });

    describe('Documentation', () => {
        const docPath = path.join(__dirname, '../docs/USER-MANAGEMENT.md');
        
        it('should exist', () => {
            expect(fs.existsSync(docPath)).toBe(true);
        });

        it('should document password reset tool', () => {
            const docCode = fs.readFileSync(docPath, 'utf8');
            expect(docCode).toContain('Password Reset Tool');
            expect(docCode).toContain('reset-user-passwords.html');
        });

        it('should document user management interface', () => {
            const docCode = fs.readFileSync(docPath, 'utf8');
            expect(docCode).toContain('User Management Interface');
            expect(docCode).toContain('Gerenciar Usuários');
        });

        it('should document security features', () => {
            const docCode = fs.readFileSync(docPath, 'utf8');
            expect(docCode).toContain('Security');
            expect(docCode).toContain('SHA-256');
        });

        it('should have troubleshooting section', () => {
            const docCode = fs.readFileSync(docPath, 'utf8');
            expect(docCode).toContain('Troubleshooting');
        });
    });
});
