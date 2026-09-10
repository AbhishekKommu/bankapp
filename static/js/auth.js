/* ==========================================================================
   NovaBank — Auth pages (login / register) client logic
   ========================================================================== */
const API_BASE = '/api/auth';

function showAlert(message, type = 'error') {
  const box = document.getElementById('alertBox');
  if (!box) return;
  const icon = type === 'error'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v5M12 16h.01"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>';
  box.innerHTML = `<div class="alert alert-${type}">${icon}<span>${message}</span></div>`;
}

function clearAlert() {
  const box = document.getElementById('alertBox');
  if (box) box.innerHTML = '';
}

function setLoading(btnId, textId, isLoading, labelDefault) {
  const btn = document.getElementById(btnId);
  const text = document.getElementById(textId);
  if (!btn) return;
  btn.disabled = isLoading;
  if (text) {
    text.innerHTML = isLoading
      ? '<span class="spinner"></span> Please wait…'
      : labelDefault;
  }
}

async function apiPost(path, body) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

// ---- Login form ----
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    setLoading('loginBtn', 'loginBtnText', true, 'Sign In');

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
      await apiPost('/login', { username, password });
      window.location.href = '/dashboard';
    } catch (err) {
      showAlert(err.message, 'error');
      setLoading('loginBtn', 'loginBtnText', false, 'Sign In');
    }
  });
}

// ---- Register form ----
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    setLoading('registerBtn', 'registerBtnText', true, 'Create Account');

    const payload = {
      full_name: document.getElementById('full_name').value.trim(),
      username: document.getElementById('username').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      password: document.getElementById('password').value,
    };

    try {
      await apiPost('/register', payload);
      showAlert('Account created successfully! Redirecting to sign in…', 'success');
      setTimeout(() => { window.location.href = '/'; }, 1200);
    } catch (err) {
      showAlert(err.message, 'error');
      setLoading('registerBtn', 'registerBtnText', false, 'Create Account');
    }
  });
}
