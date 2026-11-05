// lib/auth.ts
// Local auth STUB for Cut 1 — no real accounts, no passwords, no OAuth.
//
// Cut 1 needs "a user" so projects have an ownerId. That user lives only in
// this browser (localStorage). Cut 5 replaces this file with Clerk:
// same function names, real sessions. Nothing here pretends to be secure.
//
// Google sign-in is deliberately NOT faked: the button is shown as
// "coming in Cut 5 / Clerk connect hone par" (see GOOGLE_SIGN_IN below).

export type AuthProvider = 'guest' | 'email' | 'google';

export interface LocalUser {
  id: string;
  email: string | null;
  displayName: string;
  provider: AuthProvider;
  createdAt: string;
}

const USER_STORAGE_KEY = 'ai-shopify-builder:user:v1';

/** Google sign-in is NOT available in Cut 1 — and we do not fake it. */
export const GOOGLE_SIGN_IN = {
  available: false,
  /** Shown on the button so nobody thinks a real Google login exists. */
  label: 'Google se sign in — Cut 5 me (Clerk connect hone par)',
  reason:
    'Cut 1 me Google login nahi hai. Ye button sirf jagah dikhata hai; ' +
    'asli Google sign-in Cut 5 me Clerk se aayega. Kabhi bhi nakli Google login mat banao.',
} as const;

function createUserId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function readStoredUser(): LocalUser | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const u = parsed as Partial<LocalUser>;
    if (typeof u.id !== 'string' || typeof u.displayName !== 'string') return null;
    return {
      id: u.id,
      email: typeof u.email === 'string' ? u.email : null,
      displayName: u.displayName,
      provider: u.provider === 'email' ? 'email' : 'guest',
      createdAt: typeof u.createdAt === 'string' ? u.createdAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeStoredUser(user: LocalUser): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

/** The currently signed-in local user, or null (server / never signed in). */
export function getCurrentUser(): LocalUser | null {
  return readStoredUser();
}

export function isSignedIn(): boolean {
  return getCurrentUser() !== null;
}

/**
 * Guest/demo sign-in: no email, no password. Creates a local demo user
 * ("Demo User") so Cut 1 works with zero setup.
 */
export function signInAsGuest(): LocalUser {
  const existing = readStoredUser();
  if (existing) return existing;
  const user: LocalUser = {
    id: createUserId(),
    email: null,
    displayName: 'Demo User',
    provider: 'guest',
    createdAt: new Date().toISOString(),
  };
  writeStoredUser(user);
  return user;
}

/** Very small email check — demo only, no verification email is ever sent. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Email sign-in (local stub): the email is stored in this browser only.
 * NO password is asked for and none is stored — this is a demo, not security.
 * Throws on an invalid email address.
 */
export function signInWithEmail(email: string): LocalUser {
  const clean = email.trim().toLowerCase();
  if (!isValidEmail(clean)) {
    throw new Error('Sahi email address likho, jaise name@example.com');
  }
  const user: LocalUser = {
    id: createUserId(),
    email: clean,
    displayName: clean.split('@')[0] || 'Demo User',
    provider: 'email',
    createdAt: new Date().toISOString(),
  };
  writeStoredUser(user);
  return user;
}

/** Signs the local demo user out (clears the browser-stored user only). */
export function signOut(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(USER_STORAGE_KEY);
}

/**
 * Returns a user, creating a guest one if needed. Convenience for Cut 1
 * screens that just need an ownerId without a login screen.
 */
export function getOrCreateDemoUser(): LocalUser {
  return getCurrentUser() ?? signInAsGuest();
}
