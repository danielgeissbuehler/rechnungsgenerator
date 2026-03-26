import { isConfigured, getSession, signIn, signOut } from './supabase.js';

let _onAuthReady = null;

export async function initAuth() {
  if (!isConfigured()) {
    showApp();
    return;
  }

  const session = await getSession();
  if (session) {
    showLogoutButton();
    showApp();
    return;
  }

  // Show login page and wait for login
  await new Promise(resolve => {
    _onAuthReady = resolve;
    showLoginPage();
  });
}

export function showLogoutButton() {
  const btn = document.getElementById('logout-btn');
  if (btn) btn.style.display = '';
}

function showLoginPage() {
  const login = document.getElementById('view-login');
  const app = document.getElementById('app');
  if (login) login.style.display = 'flex';
  if (app) app.style.display = 'none';
}

function showApp() {
  const login = document.getElementById('view-login');
  const app = document.getElementById('app');
  if (login) login.style.display = 'none';
  if (app) app.style.display = 'contents';
  showLogoutButton();
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

  showApp();
  showLogoutButton();
  if (_onAuthReady) { _onAuthReady(); _onAuthReady = null; }
}

export async function handleLogout() {
  await signOut();
  const btn = document.getElementById('logout-btn');
  if (btn) btn.style.display = 'none';
  showLoginPage();
}
