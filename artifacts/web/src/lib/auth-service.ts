export type AdminUser = {
  username: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin';
  lastLogin?: string;
};

const AUTH_STORAGE_KEY = 'dr_sajid_admin_session_v1';
const CREDS_STORAGE_KEY = 'dr_sajid_admin_creds_v1';

const DEFAULT_CREDS = {
  username: 'admin',
  email: 'admin@drsajidsohail.com',
  password: 'admin', // simple default, changeable in settings
  name: 'Dr. Sajid Sohail Admin',
};

export function getAdminCreds() {
  if (typeof window === 'undefined') return DEFAULT_CREDS;
  try {
    const raw = localStorage.getItem(CREDS_STORAGE_KEY);
    return raw ? { ...DEFAULT_CREDS, ...JSON.parse(raw) } : DEFAULT_CREDS;
  } catch {
    return DEFAULT_CREDS;
  }
}

export function saveAdminCreds(newCreds: { username?: string; email?: string; password?: string; name?: string }) {
  if (typeof window === 'undefined') return;
  const current = getAdminCreds();
  const updated = { ...current, ...newCreds };
  localStorage.setItem(CREDS_STORAGE_KEY, JSON.stringify(updated));
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
}

export function getAdminUser(): AdminUser | null {
  if (!isAuthenticated()) return null;
  const creds = getAdminCreds();
  return {
    username: creds.username,
    email: creds.email,
    name: creds.name,
    role: 'superadmin',
    lastLogin: new Date().toLocaleDateString(),
  };
}

export function login(identifier: string, pass: string): { success: boolean; error?: string } {
  const creds = getAdminCreds();
  const trimmed = identifier.trim().toLowerCase();
  const validUsername = creds.username.toLowerCase();
  const validEmail = creds.email.toLowerCase();

  if (trimmed !== validUsername && trimmed !== validEmail) {
    return { success: false, error: 'Invalid username or email address.' };
  }

  if (pass !== creds.password) {
    return { success: false, error: 'Incorrect password.' };
  }

  localStorage.setItem(AUTH_STORAGE_KEY, 'true');
  window.dispatchEvent(new CustomEvent('auth_state_changed', { detail: { authenticated: true } }));
  return { success: true };
}

export function logout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('auth_state_changed', { detail: { authenticated: false } }));
}
