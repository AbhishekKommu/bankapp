/* ==========================================================================
   NovaBank — Dashboard client logic
   ========================================================================== */
const state = {
  user: null,
  accounts: [],
  transactionsByAccount: {}, // account_id -> [transactions]
};

// ---------------------------------------------------------------------------
// Generic API helper
// ---------------------------------------------------------------------------
async function api(method, path, body) {
  const opts = {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(path, opts);

  if (res.status === 401) {
    window.location.href = '/';
    throw new Error('Session expired');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
const money = (n) => `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateFmt = (iso) => new Date(iso).toLocaleString('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
const typeClass = (t) => (['deposit', 'transfer_in'].includes(t) ? 'in' : 'out');
const typeLabel = (t) => ({
  deposit: 'Deposit', withdraw: 'Withdrawal', transfer_out: 'Transfer Out', transfer_in: 'Transfer In',
}[t] || t);

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

function toast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function accountTypeClass(type) {
  if (type === 'Current') return 'type-current';
  if (type === 'Fixed Deposit') return 'type-fixed';
  return 'type-savings';
}

// ---------------------------------------------------------------------------
// Modal helpers
// ---------------------------------------------------------------------------
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});
document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
});

function modalAlert(boxId, message, type = 'error') {
  document.getElementById(boxId).innerHTML =
    `<div class="alert alert-${type}"><span>${message}</span></div>`;
}
function clearModalAlert(boxId) {
  document.getElementById(boxId).innerHTML = '';
}

// ---------------------------------------------------------------------------
// Bootstrapping
// ---------------------------------------------------------------------------
async function loadUser() {
  const { user } = await api('GET', '/api/auth/me');
  state.user = user;

  document.getElementById('sidebarName').textContent = user.full_name;
  document.getElementById('sidebarEmail').textContent = user.email;
  document.getElementById('sidebarAvatar').textContent = initials(user.full_name);
  document.getElementById('topbarName').textContent = user.full_name.split(' ')[0];
}

async function loadAccounts() {
  const { accounts } = await api('GET', '/api/accounts');
  state.accounts = accounts;
  renderAccounts();
  populateAccountSelects();
  await loadAllTransactions();
  renderStats();
}

async function loadAllTransactions() {
  state.transactionsByAccount = {};
  await Promise.all(state.accounts.map(async (acc) => {
    const { transactions } = await api('GET', `/api/accounts/${acc.id}/transactions`);
    state.transactionsByAccount[acc.id] = transactions;
  }));
  renderTransactions('all');
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function renderStats() {
  const totalBalance = state.accounts.reduce((sum, a) => sum + a.balance, 0);
  const txnCount = Object.values(state.transactionsByAccount).reduce((s, arr) => s + arr.length, 0);

  document.getElementById('statTotalBalance').textContent = money(totalBalance);
  document.getElementById('statAccountCount').textContent = state.accounts.filter((a) => a.is_active).length;
  document.getElementById('statTxnCount').textContent = txnCount;
}

function renderAccounts() {
  const grid = document.getElementById('accountsGrid');
  grid.innerHTML = '';

  state.accounts.forEach((acc) => {
    const card = document.createElement('div');
    card.className = `account-card ${accountTypeClass(acc.account_type)}`;
    card.innerHTML = `
      <div class="top-row">
        <div>
          <div style="font-size:0.82rem;color:rgba(255,255,255,0.75);">${acc.account_type}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <span class="badge ${acc.is_active ? '' : 'inactive'}">${acc.is_active ? 'Active' : 'Inactive'}</span>
          <button class="btn btn-icon btn-ghost manage-btn" data-id="${acc.id}" title="Manage" style="width:30px;height:30px;">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </button>
        </div>
      </div>
      <div>
        <div class="acct-number">•••• •••• ${acc.account_number.slice(-4)}</div>
        <div class="acct-balance">${money(acc.balance)}</div>
      </div>
      <div class="acct-actions">
        <button class="btn btn-sm btn-primary deposit-btn" data-id="${acc.id}">Deposit</button>
        <button class="btn btn-sm btn-ghost withdraw-btn" data-id="${acc.id}">Withdraw</button>
      </div>
    `;
    grid.appendChild(card);
  });

  // "Add account" tile
  const addTile = document.createElement('div');
  addTile.className = 'add-account-card';
  addTile.id = 'addAccountTile';
  addTile.innerHTML = `<div class="plus-circle">+</div><div>Open a new account</div>`;
  grid.appendChild(addTile);

  addTile.addEventListener('click', () => openModal('newAccountModal'));

  grid.querySelectorAll('.deposit-btn').forEach((b) => b.addEventListener('click', () => {
    document.getElementById('depositAccountId').value = b.dataset.id;
    clearModalAlert('depositAlert');
    document.getElementById('depositForm').reset();
    openModal('depositModal');
  }));
  grid.querySelectorAll('.withdraw-btn').forEach((b) => b.addEventListener('click', () => {
    document.getElementById('withdrawAccountId').value = b.dataset.id;
    clearModalAlert('withdrawAlert');
    document.getElementById('withdrawForm').reset();
    openModal('withdrawModal');
  }));
  grid.querySelectorAll('.manage-btn').forEach((b) => b.addEventListener('click', () => openManageModal(b.dataset.id)));
}

function populateAccountSelects() {
  const filterSel = document.getElementById('txnAccountFilter');
  const transferSel = document.getElementById('transferFromAccount');

  filterSel.innerHTML = '<option value="all">All Accounts</option>' +
    state.accounts.map((a) => `<option value="${a.id}">${a.account_type} •••• ${a.account_number.slice(-4)}</option>`).join('');

  transferSel.innerHTML = state.accounts
    .filter((a) => a.is_active)
    .map((a) => `<option value="${a.id}">${a.account_type} •••• ${a.account_number.slice(-4)} — ${money(a.balance)}</option>`)
    .join('');
}

function renderTransactions(filter) {
  const tbody = document.getElementById('txnTableBody');
  const emptyState = document.getElementById('txnEmptyState');
  const table = document.getElementById('txnTable');

  let rows = [];
  if (filter === 'all') {
    Object.values(state.transactionsByAccount).forEach((arr) => { rows = rows.concat(arr); });
  } else {
    rows = state.transactionsByAccount[filter] || [];
  }
  rows.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  rows = rows.slice(0, 40);

  if (rows.length === 0) {
    table.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }
  table.classList.remove('hidden');
  emptyState.classList.add('hidden');

  tbody.innerHTML = rows.map((t) => {
    const cls = typeClass(t.transaction_type);
    const sign = cls === 'in' ? '+' : '−';
    return `
      <tr>
        <td><span class="txn-type"><span class="txn-dot ${cls}"></span>${typeLabel(t.transaction_type)}</span></td>
        <td>${t.description || '—'}</td>
        <td class="${cls === 'in' ? 'amt-in' : 'amt-out'}">${sign} ${money(t.amount)}</td>
        <td>${money(t.balance_after)}</td>
        <td>${dateFmt(t.timestamp)}</td>
      </tr>
    `;
  }).join('');
}

document.getElementById('txnAccountFilter').addEventListener('change', (e) => renderTransactions(e.target.value));

// ---------------------------------------------------------------------------
// Manage account modal
// ---------------------------------------------------------------------------
let manageTargetId = null;

function openManageModal(id) {
  manageTargetId = id;
  const acc = state.accounts.find((a) => String(a.id) === String(id));
  if (!acc) return;
  clearModalAlert('manageAlert');
  document.getElementById('manageAccountInfo').textContent =
    `${acc.account_type} account •••• ${acc.account_number.slice(-4)} — Balance: ${money(acc.balance)}`;
  document.getElementById('toggleActiveBtn').textContent = acc.is_active ? 'Deactivate Account' : 'Reactivate Account';
  openModal('manageModal');
}

document.getElementById('toggleActiveBtn').addEventListener('click', async () => {
  const acc = state.accounts.find((a) => String(a.id) === String(manageTargetId));
  if (!acc) return;
  try {
    await api('PUT', `/api/accounts/${acc.id}`, { is_active: !acc.is_active });
    toast(`Account ${!acc.is_active ? 'reactivated' : 'deactivated'} successfully`);
    closeModal('manageModal');
    await loadAccounts();
  } catch (err) {
    modalAlert('manageAlert', err.message);
  }
});

document.getElementById('closeAccountBtn').addEventListener('click', async () => {
  try {
    await api('DELETE', `/api/accounts/${manageTargetId}`);
    toast('Account closed successfully');
    closeModal('manageModal');
    await loadAccounts();
  } catch (err) {
    modalAlert('manageAlert', err.message);
  }
});

// ---------------------------------------------------------------------------
// New account form
// ---------------------------------------------------------------------------
document.getElementById('openNewAccountBtn').addEventListener('click', () => openModal('newAccountModal'));
document.getElementById('navNewAccount').addEventListener('click', () => openModal('newAccountModal'));

document.getElementById('newAccountForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearModalAlert('newAccountAlert');
  try {
    await api('POST', '/api/accounts', {
      account_type: document.getElementById('accountType').value,
      initial_deposit: document.getElementById('initialDeposit').value,
    });
    toast('New account opened successfully');
    closeModal('newAccountModal');
    e.target.reset();
    await loadAccounts();
  } catch (err) {
    modalAlert('newAccountAlert', err.message);
  }
});

// ---------------------------------------------------------------------------
// Deposit form
// ---------------------------------------------------------------------------
document.getElementById('depositForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearModalAlert('depositAlert');
  try {
    await api('POST', '/api/transactions/deposit', {
      account_id: document.getElementById('depositAccountId').value,
      amount: document.getElementById('depositAmount').value,
      description: document.getElementById('depositNote').value,
    });
    toast('Deposit successful');
    closeModal('depositModal');
    await loadAccounts();
  } catch (err) {
    modalAlert('depositAlert', err.message);
  }
});

// ---------------------------------------------------------------------------
// Withdraw form
// ---------------------------------------------------------------------------
document.getElementById('withdrawForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearModalAlert('withdrawAlert');
  try {
    await api('POST', '/api/transactions/withdraw', {
      account_id: document.getElementById('withdrawAccountId').value,
      amount: document.getElementById('withdrawAmount').value,
      description: document.getElementById('withdrawNote').value,
    });
    toast('Withdrawal successful');
    closeModal('withdrawModal');
    await loadAccounts();
  } catch (err) {
    modalAlert('withdrawAlert', err.message);
  }
});

// ---------------------------------------------------------------------------
// Transfer form
// ---------------------------------------------------------------------------
function openTransferModal() {
  clearModalAlert('transferAlert');
  document.getElementById('transferForm').reset();
  populateAccountSelects();
  openModal('transferModal');
}
document.getElementById('openTransferBtn').addEventListener('click', openTransferModal);
document.getElementById('navTransfer').addEventListener('click', openTransferModal);

document.getElementById('transferForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearModalAlert('transferAlert');
  try {
    await api('POST', '/api/transactions/transfer', {
      from_account_id: document.getElementById('transferFromAccount').value,
      to_account_number: document.getElementById('transferToAccount').value.trim(),
      amount: document.getElementById('transferAmount').value,
      description: document.getElementById('transferNote').value,
    });
    toast('Transfer completed successfully');
    closeModal('transferModal');
    await loadAccounts();
  } catch (err) {
    modalAlert('transferAlert', err.message);
  }
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
async function doLogout() {
  try {
    await api('POST', '/api/auth/logout');
  } finally {
    window.location.href = '/';
  }
}
document.getElementById('logoutBtn').addEventListener('click', doLogout);
document.getElementById('logoutBtnMobile').addEventListener('click', doLogout);

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
(async function init() {
  try {
    await loadUser();
    await loadAccounts();
  } catch (err) {
    console.error(err);
  } finally {
    document.getElementById('pageLoader').classList.add('hidden');
  }
})();
