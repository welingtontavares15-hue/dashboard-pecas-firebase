/**
 * User Management Module
 * Handles CRUD operations for user accounts
 */

const UserManager = {
    /**
     * Create a new user
     */
    async createUser(userData) {
        try {
            // Validate user data
            const validation = this.validateUserData(userData);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            // Check if username already exists
            const existingUser = DataManager.getUserByUsername(userData.username);
            if (existingUser) {
                return { success: false, error: 'Nome de usuário já existe' };
            }

            // Generate user ID
            const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Hash password
            const passwordHash = await Auth.hashPassword(userData.password, userData.username);

            // Create user object
            const newUser = {
                id: userId,
                username: userData.username.toLowerCase().trim(),
                name: userData.name,
                email: userData.email || '',
                role: userData.role,
                tecnicoId: userData.tecnicoId || null,
                disabled: false,
                passwordHash: passwordHash,
                createdAt: Date.now(),
                createdBy: Auth.currentUser?.username || 'system',
                updatedAt: Date.now(),
                updatedBy: Auth.currentUser?.username || 'system'
            };

            // Get current users
            const users = DataManager.getUsers();
            users.push(newUser);

            // Save to data manager
            DataManager.saveData(DataManager.KEYS.USERS, users);

            // Log audit trail
            this.logAudit('create', userId, newUser, null);

            return { success: true, user: newUser };
        } catch (error) {
            console.error('Error creating user:', error);
            return { success: false, error: 'Erro ao criar usuário' };
        }
    },

    /**
     * Update existing user
     */
    async updateUser(userId, updates) {
        try {
            const users = DataManager.getUsers();
            const userIndex = users.findIndex(u => u.id === userId);

            if (userIndex === -1) {
                return { success: false, error: 'Usuário não encontrado' };
            }

            const oldUser = { ...users[userIndex] };

            // Validate updates
            if (updates.username) {
                const existingUser = DataManager.getUserByUsername(updates.username);
                if (existingUser && existingUser.id !== userId) {
                    return { success: false, error: 'Nome de usuário já existe' };
                }
            }

            // Prepare updated user
            const updatedUser = {
                ...oldUser,
                ...updates,
                updatedAt: Date.now(),
                updatedBy: Auth.currentUser?.username || 'system'
            };

            // Remove password field if present (should use passwordHash)
            if (updates.password) {
                updatedUser.passwordHash = await Auth.hashPassword(updates.password, updatedUser.username);
                delete updatedUser.password;
            }

            users[userIndex] = updatedUser;
            DataManager.saveData(DataManager.KEYS.USERS, users);

            // Log audit trail
            this.logAudit('update', userId, updatedUser, oldUser);

            return { success: true, user: updatedUser };
        } catch (error) {
            console.error('Error updating user:', error);
            return { success: false, error: 'Erro ao atualizar usuário' };
        }
    },

    /**
     * Delete user (soft delete by setting disabled flag)
     */
    async deleteUser(userId) {
        try {
            const users = DataManager.getUsers();
            const userIndex = users.findIndex(u => u.id === userId);

            if (userIndex === -1) {
                return { success: false, error: 'Usuário não encontrado' };
            }

            const user = users[userIndex];

            // Prevent deleting the last admin
            if (user.role === 'administrador') {
                const adminCount = users.filter(u => u.role === 'administrador' && !u.disabled).length;
                if (adminCount <= 1) {
                    return { success: false, error: 'Não é possível remover o último administrador' };
                }
            }

            // Soft delete
            users[userIndex] = {
                ...user,
                disabled: true,
                updatedAt: Date.now(),
                updatedBy: Auth.currentUser?.username || 'system'
            };

            DataManager.saveData(DataManager.KEYS.USERS, users);

            // Log audit trail
            this.logAudit('delete', userId, users[userIndex], user);

            return { success: true };
        } catch (error) {
            console.error('Error deleting user:', error);
            return { success: false, error: 'Erro ao deletar usuário' };
        }
    },

    /**
     * Reset user password
     */
    async resetPassword(userId, newPassword) {
        try {
            const users = DataManager.getUsers();
            const userIndex = users.findIndex(u => u.id === userId);

            if (userIndex === -1) {
                return { success: false, error: 'Usuário não encontrado' };
            }

            const user = users[userIndex];
            const passwordHash = await Auth.hashPassword(newPassword, user.username);

            users[userIndex] = {
                ...user,
                passwordHash: passwordHash,
                updatedAt: Date.now(),
                updatedBy: Auth.currentUser?.username || 'system'
            };

            DataManager.saveData(DataManager.KEYS.USERS, users);

            // Log audit trail (don't include password in log)
            this.logAudit('reset_password', userId, { ...users[userIndex], passwordHash: '[REDACTED]' }, null);

            return { success: true };
        } catch (error) {
            console.error('Error resetting password:', error);
            return { success: false, error: 'Erro ao resetar senha' };
        }
    },

    /**
     * List users with optional filters
     */
    listUsers(filters = {}) {
        try {
            let users = DataManager.getUsers();

            // Apply filters
            if (filters.role) {
                users = users.filter(u => u.role === filters.role);
            }

            if (filters.disabled !== undefined) {
                users = users.filter(u => u.disabled === filters.disabled);
            }

            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                users = users.filter(u => 
                    u.username.toLowerCase().includes(searchTerm) ||
                    u.name.toLowerCase().includes(searchTerm) ||
                    (u.email && u.email.toLowerCase().includes(searchTerm))
                );
            }

            // Sort by creation date (newest first)
            users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            return users;
        } catch (error) {
            console.error('Error listing users:', error);
            return [];
        }
    },

    /**
     * Get user by ID
     */
    getUserById(userId) {
        try {
            const users = DataManager.getUsers();
            return users.find(u => u.id === userId);
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    },

    /**
     * Validate user data
     */
    validateUserData(userData) {
        // Required fields
        if (!userData.username || !userData.username.trim()) {
            return { valid: false, error: 'Nome de usuário é obrigatório' };
        }

        if (!userData.name || !userData.name.trim()) {
            return { valid: false, error: 'Nome completo é obrigatório' };
        }

        if (!userData.role) {
            return { valid: false, error: 'Perfil é obrigatório' };
        }

        if (!userData.password || userData.password.length < 6) {
            return { valid: false, error: 'Senha deve ter no mínimo 6 caracteres' };
        }

        // Username validation (alphanumeric, dots, underscores, hyphens)
        const usernameRegex = /^[a-zA-Z0-9._-]+$/;
        if (!usernameRegex.test(userData.username)) {
            return { valid: false, error: 'Nome de usuário deve conter apenas letras, números, . _ e -' };
        }

        // Role validation
        const validRoles = ['administrador', 'gestor', 'tecnico'];
        if (!validRoles.includes(userData.role)) {
            return { valid: false, error: 'Perfil inválido' };
        }

        // Email validation (if provided)
        if (userData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(userData.email)) {
                return { valid: false, error: 'Email inválido' };
            }
        }

        return { valid: true };
    },

    /**
     * Generate a secure random password
     */
    generateSecurePassword() {
        const length = 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
        let password = '';
        
        // Ensure at least one of each type
        password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
        password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
        password += '0123456789'[Math.floor(Math.random() * 10)];
        password += '!@#$%&*'[Math.floor(Math.random() * 7)];
        
        // Fill the rest randomly
        for (let i = password.length; i < length; i++) {
            password += charset[Math.floor(Math.random() * charset.length)];
        }
        
        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    },

    /**
     * Toggle user active/inactive status
     */
    async toggleUserStatus(userId) {
        try {
            const users = DataManager.getUsers();
            const userIndex = users.findIndex(u => u.id === userId);

            if (userIndex === -1) {
                return { success: false, error: 'Usuário não encontrado' };
            }

            const user = users[userIndex];

            // Prevent disabling the last admin
            if (user.role === 'administrador' && !user.disabled) {
                const activeAdminCount = users.filter(u => u.role === 'administrador' && !u.disabled).length;
                if (activeAdminCount <= 1) {
                    return { success: false, error: 'Não é possível desativar o último administrador' };
                }
            }

            users[userIndex] = {
                ...user,
                disabled: !user.disabled,
                updatedAt: Date.now(),
                updatedBy: Auth.currentUser?.username || 'system'
            };

            DataManager.saveData(DataManager.KEYS.USERS, users);

            // Log audit trail
            this.logAudit('toggle_status', userId, users[userIndex], user);

            return { success: true, user: users[userIndex] };
        } catch (error) {
            console.error('Error toggling user status:', error);
            return { success: false, error: 'Erro ao alterar status do usuário' };
        }
    },

    /**
     * Log audit trail for user management actions
     */
    logAudit(action, userId, newData, oldData) {
        try {
            const auditEntry = {
                id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                action: action,
                userId: userId,
                performedBy: Auth.currentUser?.username || 'system',
                performedById: Auth.currentUser?.id || 'system',
                timestamp: Date.now(),
                changes: {
                    before: oldData,
                    after: newData
                }
            };

            // Store audit log (you may want to create a dedicated audit log storage)
            console.log('User Management Audit:', auditEntry);

            // Optional: Save to DataManager if you want persistent audit logs
            // This would require adding an audit log key to DataManager
        } catch (error) {
            console.error('Error logging audit:', error);
        }
    }
};
