/**
 * Authentication Service
 * 
 * Handles user authentication using Firebase Auth and custom user database
 */

import {
  signInAnonymously,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User as FirebaseUser
} from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { getFirebaseAuth, getFirebaseDatabase } from '../firebase/init';
import type { User, UserRole } from '../../types';

// Hash function (SHA-256) for password verification
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sign in with username and password
 */
export const signIn = async (username: string, password: string): Promise<User> => {
  try {
    const auth = getFirebaseAuth();
    const db = getFirebaseDatabase();

    // First, authenticate anonymously with Firebase (required for RTDB rules)
    await signInAnonymously(auth);

    // Normalize username
    const normalizedUsername = username.toLowerCase().trim();

    // Get user from database
    const usersRef = ref(db, 'data/diversey_users');
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) {
      throw new Error('Nenhum usuário encontrado no sistema');
    }

    const users = snapshot.val();
    let matchedUser: User | null = null;

    // Find user by normalized username
    for (const [key, userData] of Object.entries(users)) {
      const user = userData as any;
      const dbUsername = (user.username || '').toLowerCase().trim();
      
      if (dbUsername === normalizedUsername) {
        // Verify password
        const passwordHash = await hashPassword(password);
        
        if (user.passwordHash === passwordHash) {
          // Check if user is active
          if (user.active === false) {
            throw new Error('Usuário inativo. Contate o administrador.');
          }

          matchedUser = {
            id: key,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role as UserRole,
            active: user.active !== false,
            createdAt: new Date(user.createdAt || Date.now()),
            updatedAt: user.updatedAt ? new Date(user.updatedAt) : undefined
          };
          break;
        }
      }
    }

    if (!matchedUser) {
      throw new Error('Usuário ou senha incorretos');
    }

    // Store user in sessionStorage for persistence
    sessionStorage.setItem('current_user', JSON.stringify(matchedUser));

    return matchedUser;
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  }
};

/**
 * Sign out
 */
export const signOut = async (): Promise<void> => {
  try {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
    sessionStorage.removeItem('current_user');
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

/**
 * Get current user from session
 */
export const getCurrentUser = (): User | null => {
  const userJson = sessionStorage.getItem('current_user');
  if (!userJson) {
    return null;
  }

  try {
    const user = JSON.parse(userJson);
    // Reconstruct dates
    if (user.createdAt) {
      user.createdAt = new Date(user.createdAt);
    }
    if (user.updatedAt) {
      user.updatedAt = new Date(user.updatedAt);
    }
    return user;
  } catch {
    return null;
  }
};

/**
 * Check if user has permission for a specific action
 */
export const hasPermission = (
  user: User | null,
  resource: string,
  action: 'view' | 'create' | 'edit' | 'delete' | 'approve'
): boolean => {
  if (!user) return false;

  const { role } = user;

  // Administrador has all permissions
  if (role === 'administrador') {
    return true;
  }

  // Gestor permissions
  if (role === 'gestor') {
    // Can approve, view most things
    if (action === 'approve' || action === 'view') {
      return true;
    }
    // Can create/edit solicitations
    if (resource === 'solicitacoes' && (action === 'create' || action === 'edit')) {
      return true;
    }
    return false;
  }

  // Tecnico permissions
  if (role === 'tecnico') {
    // Can only view and create their own solicitations
    if (resource === 'solicitacoes' && (action === 'view' || action === 'create')) {
      return true;
    }
    return false;
  }

  return false;
};

/**
 * Initialize auth state listener
 */
export const initAuthListener = (callback: (firebaseUser: FirebaseUser | null) => void) => {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
};
