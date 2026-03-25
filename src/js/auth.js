import { isConfigured, getSession, signIn, signOut } from './supabase.js';

let _onAuthReady = null;

export async function initAuth() {
  if (!isConfigured()) return; // no auth needed if Supabase not configured

  const session = await getSession();
  if (session) {
    showLogoutButton();
    return;
  }

  // Show login modal and wait for login
  await new Promise(resolve => {
    _onAuthReady = resolve;
    showLoginModal();
  });
}

export function showLogoutButton() {
  const btn = document.getElementById('logout-btn');
  if (btn) btn.style.display = 'inline-block';
}

function showLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.style.display = 'flex';
}

function hideLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.style.display = 'none';
}

export async function handleLogin() {
  const email = document.getElementById('login-email')?.value?.trim();
  const password = document.getElementById('login-password')?.value;
  const errorEl = document.getElementById('login-error');

  if (!email || !password) {
    if (errorEl) errorEl.textContent = 'Bitte E-Mail und Passwort eingeben.';
    return;
  }

  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) loginBtn.disabled = true;
  if (errorEl) errorEl.textContent = '';

  const result = await signIn(email, password);

  if (result.error) {
    if (errorEl) errorEl.textContent = result.error;
    if (loginBtn) loginBtn.disabled = false;
    return;
  }

  hideLoginModal();
  showLogoutButton();
  if (_onAuthReady) { _onAuthReady(); _onAuthReady = null; }
}

export async function handleLogout() {
  await signOut();
  const btn = document.getElementById('logout-btn');
  if (btn) btn.style.display = 'none';
  showLoginModal();
}
