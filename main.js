/**
 * Aplikasi Cetak Voucher Ruijie Cloud — POS & Print Studio Pro
 * Features: Manual E-Wallet / QRIS Payment & WhatsApp Order,
 * Cryptographic License Key Engine & Secret Admin Key Generator,
 * Free vs PRO Feature Gating Engine,
 * Database Google Spreadsheet, 1-Click Theme Store Gallery,
 * Audit Trail Kasir, Stock Alert System, Dual Analytics Charts,
 * Streamlined Dropdown Navigation, Direct Bluetooth Thermal (ESC/POS),
 * Export PDF, Dark Mode, Shift Kasir, Reseller & Surat Jalan.
 */

// ===== CONSTANTS & ADMIN LICENSE CRYPTO SALT =====
const ADMIN_SECRET_SALT = 'RUIJIE_PRO_OFFLINE_SECRET_2026_CMYK';
const OWNER_WHATSAPP = '082248381836';
const OWNER_EWALLET = '082248381836';
const FREE_TIER_MAX_VOUCHERS = 25;

const DEFAULT_PRESET = {
  id: 'preset_default',
  name: 'Warkop Utama',
  ssid: 'Hotspot_Ruijie',
  logo: null,
  theme: 'theme-blue',
  loginHint: 'Buka browser utk login'
};

const DEFAULT_RESELLERS = [
  { id: 'res_1', name: 'Warung Bu Ani', phone: '081234567890', address: 'Jl. Melati No. 12', note: 'Titip mingguan' },
  { id: 'res_2', name: 'Toko Pak Budi', phone: '081987654321', address: 'Depan Lapangan Desa', note: 'Setoran tiap jumat' }
];

// Sample Dummy Vouchers for Live Preview
const SAMPLE_DUMMY_VOUCHERS = [
  { code: 'RJ-7X9K2B', paket: 'Paket 1 Jam', harga: '3000', periode: '1 Jam', speed: '2M/5M', quota: 'Unlimited', printed: false, selected: true },
  { code: 'RJ-4M8P9Q', paket: 'Paket 3 Jam', harga: '5000', periode: '3 Jam', speed: '3M/7M', quota: 'Unlimited', printed: false, selected: true },
  { code: 'RJ-2W5E8R', paket: 'Paket 1 Hari', harga: '10000', periode: '24 Jam', speed: '5M/10M', quota: '2 GB', printed: false, selected: true },
  { code: 'RJ-9L3N6V', paket: 'Paket Mingguan', harga: '25000', periode: '7 Hari', speed: '5M/15M', quota: '5 GB', printed: false, selected: true }
];

// ===== APP STATE =====
const state = {
  uiMode: 'admin', // 'admin' | 'kasir'
  themeMode: 'light', // 'light' | 'dark'
  adminPin: '1234',
  isPro: false,
  proLicense: null, // { key, plan, activatedAt, expiresAt }
  vouchers: [],
  resellers: DEFAULT_RESELLERS,
  auditLogs: [], // Audit Trail for Cashier & Security
  filter: 'all', // 'all' | 'unprinted' | 'printed'
  searchQuery: '',
  filterReseller: 'all',
  autoArchive24h: true,
  presets: [DEFAULT_PRESET],
  activePresetId: 'preset_default',
  bluetoothDevice: null,
  activeShift: {
    id: 'shift_init',
    cashierName: 'Kasir 1',
    startTime: new Date().toISOString(),
    startCash: 50000,
    salesCount: 0,
    salesOmset: 0,
    closed: false
  },
  settings: {
    ssid: 'Hotspot_Ruijie',
    logo: null,
    logoPos: 'center', // 'center' | 'left'
    bgImage: null,
    bgOpacity: 20,
    watermarkText: '',
    showWatermark: false,
    sheetsUrl: '',
    fontFamily: 'font-inter',
    borderStyle: 'border-dashed',
    layout: '25', // '50' | '30' | '25' | '20' | '16' | 'thermal-58' | 'thermal-80' | 'label-103' | 'label-108' | 'label-121'
    theme: 'theme-blue',
    showSpeed: true,
    showQuota: true,
    showHint: true,
    loginHint: 'Buka browser utk login',
    startNumber: 1,
    pricePrefix: 'Rp '
  }
};

let lastCheckedIndex = null;

// ===== DOM HELPERS (NULL-SAFE) =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const $id = (id) => document.getElementById(id);

const on = (idOrEl, event, handler) => {
  const el = typeof idOrEl === 'string' ? $id(idOrEl) : idOrEl;
  if (!el) return;
  if (typeof event === 'function') {
    el.addEventListener('click', event);
  } else if (event && typeof handler === 'function') {
    el.addEventListener(event, handler);
  }
};

const setVal = (id, val) => {
  const el = $id(id);
  if (el) el.value = val;
};

const setChecked = (id, val) => {
  const el = $id(id);
  if (el) el.checked = !!val;
};

const setText = (id, text) => {
  const el = $id(id);
  if (el) el.textContent = text;
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initTheme();
  checkLicenseValidity();
  bindEvents();
  applyUIMode();
  updateProBadgeUI();
  renderResellerFilterSelect();
  restoreUI();
  checkStockAlerts();
  renderQuickPOSGrid();
  renderTable();
  renderPreview();
  initPWA();

  // Auto-Sync Unified Google Sheets Database on App Launch
  if (state.isPro && state.settings.sheetsUrl && state.settings.autoSyncSheets !== false) {
    setTimeout(() => {
      syncFromGoogleSheets({ silent: true });
    }, 1200);
  }
});

// ===== 🔑 CRYPTOGRAPHIC LICENSE ENGINE (EMAIL-BOUND) =====
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(6, 'X');
}

function generateLicenseKey(plan = '1MONTH', email = 'USER') {
  const cleanPlan = (plan || '1MONTH').toUpperCase();
  const cleanEmail = (email || 'USER').trim().toLowerCase();
  const emailToken = hashString(cleanEmail + ADMIN_SECRET_SALT).substring(0, 4);
  const raw = `${cleanPlan}-${cleanEmail}-${emailToken}-${ADMIN_SECRET_SALT}`;
  const checksum = hashString(raw).substring(0, 6);
  return `RJPRO-${cleanPlan}-${emailToken}-${checksum}`;
}

function verifyLicenseKey(key, inputEmail) {
  if (!key || typeof key !== 'string') return { valid: false, reason: 'INVALID_FORMAT' };
  const cleanKey = key.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const parts = cleanKey.split('-');
  if (parts.length !== 4 || parts[0] !== 'RJPRO') return { valid: false, reason: 'INVALID_FORMAT' };

  const plan = parts[1]; // '1MONTH' | '1YEAR' | 'LIFETIME'
  const token = parts[2];
  const checksum = parts[3];

  let days = 30;
  if (plan === '1YEAR') days = 365;
  if (plan === 'LIFETIME') days = 36500;

  // Case 1: Email-Bound Verification
  const cleanEmail = (inputEmail || (state.proLicense && state.proLicense.email) || '').trim().toLowerCase();
  if (cleanEmail && cleanEmail.includes('@')) {
    const expectedToken = hashString(cleanEmail + ADMIN_SECRET_SALT).substring(0, 4);
    if (token === expectedToken) {
      const raw = `${plan}-${cleanEmail}-${token}-${ADMIN_SECRET_SALT}`;
      const expectedChecksum = hashString(raw).substring(0, 6);
      if (checksum === expectedChecksum) {
        return { valid: true, plan: plan, days: days, email: cleanEmail, cleanKey: cleanKey };
      }
    } else {
      return { valid: false, reason: 'EMAIL_MISMATCH' };
    }
  }

  // Case 2: Legacy / Master Offline Verification (Backward Compatibility)
  const legacyRaw = `${plan}-USER-${token}-${ADMIN_SECRET_SALT}`;
  if (checksum === hashString(legacyRaw).substring(0, 6)) {
    return { valid: true, plan: plan, days: days, email: cleanEmail || 'offline@owner', cleanKey: cleanKey };
  }

  return { valid: false, reason: 'INVALID_CHECKSUM' };
}

function checkLicenseValidity() {
  if (state.proLicense && state.proLicense.key) {
    const res = verifyLicenseKey(state.proLicense.key, state.proLicense.email);
    if (res.valid) {
      if (state.proLicense.expiresAt) {
        const expDate = new Date(state.proLicense.expiresAt);
        if (new Date() > expDate) {
          state.isPro = false;
          state.proLicense = null;
          saveState();
          return;
        }
      }
      state.isPro = true;
      return;
    }
  }
  state.isPro = false;
}

function activateLicense(key, email) {
  if (!key) {
    showToast('Masukkan kode lisensi Anda!', 'error');
    return false;
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  const res = verifyLicenseKey(key, cleanEmail);

  if (!res.valid) {
    if (res.reason === 'EMAIL_MISMATCH') {
      showToast('❌ Kunci Lisensi ini tidak cocok dengan email ini! Masukkan email terdaftar Anda saat membeli.', 'error');
    } else if (res.reason === 'INVALID_EMAIL') {
      showToast('Masukkan format alamat email yang valid!', 'error');
    } else {
      showToast('Kunci Lisensi tidak valid! Periksa kembali kode & email Anda.', 'error');
    }
    return false;
  }

  const now = new Date();
  const expiresAt = res.plan === 'LIFETIME' ? null : new Date(now.getTime() + res.days * 24 * 60 * 60 * 1000).toISOString();

  state.isPro = true;
  state.proLicense = {
    key: res.cleanKey || key.trim().toUpperCase(),
    email: res.email || cleanEmail || 'pro@user',
    plan: res.plan,
    activatedAt: now.toISOString(),
    expiresAt: expiresAt
  };

  logActivity('SHIFT', `Aktivasi Lisensi PRO [${res.plan}] akun: ${state.proLicense.email}`);
  saveState();
  updateProBadgeUI();
  renderPreview();
  showToast(`🎉 Selamat! Lisensi PRO (${res.plan}) Berhasil Diaktifkan untuk ${state.proLicense.email}!`);
  return true;
}

function deactivateLicense() {
  if (confirm('Yakin ingin keluar dan menghapus lisensi PRO dari perangkat ini?')) {
    logActivity('SHIFT', `Logout lisensi akun: ${state.proLicense?.email || '-'}`);
    state.isPro = false;
    state.proLicense = null;
    saveState();
    updateProBadgeUI();
    renderPreview();
    closeModal();
    showToast('Lisensi berhasil dikeluarkan dari perangkat ini.');
  }
}

// ===== 🛡️ PRO FEATURE GATE / REQUIRE PRO =====
function requirePro(featureName = 'Fitur ini') {
  if (state.isPro) return true;

  const html = `
    <div class="modal-header">
      <h3>🔒 Fitur Khusus Lisensi PRO</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
    </div>
    <div class="modal-body" style="text-align:center;padding:1.6rem 1.25rem;">
      <div style="font-size:3rem;margin-bottom:0.5rem;">👑</div>
      <h4 style="font-size:1.18rem;font-weight:900;color:var(--text);margin-bottom:0.4rem;">
        Upgrade ke Lisensi PRO
      </h4>
      <p style="font-size:0.86rem;color:var(--text-secondary);max-width:440px;margin:0 auto 1.25rem;line-height:1.5;">
        <strong>${esc(featureName)}</strong> adalah fitur eksklusif PRO. Dapatkan akses cetak unlimited tanpa batas, Google Sheets DB, Bluetooth POS, dan seluruh tema premium!
      </p>

      <div style="background:var(--primary-light);border:1px solid var(--primary-border);border-radius:var(--radius-xs);padding:0.95rem;margin-bottom:1.35rem;text-align:left;font-size:0.82rem;color:var(--text);">
        <div style="font-weight:800;color:var(--primary);margin-bottom:0.4rem;">Keuntungan Lisensi PRO:</div>
        <div>✓ Cetak Tanpa Batas (Unlimited Voucher)</div>
        <div>✓ Cloud Database Google Spreadsheet</div>
        <div>✓ Support Printer Kasir Bluetooth POS (58mm/80mm)</div>
        <div>✓ Semua Tema Visual Premium & Tanpa Watermark</div>
        <div>✓ Audit Trail Kasir & Surat Jalan Reseller</div>
      </div>

      <div style="display:flex;gap:0.55rem;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-secondary" onclick="closeModal()">Nanti Saja</button>
        <button class="btn btn-pro" onclick="closeModal();showUpgradeProModal();">💎 Beli / Aktivasi PRO Sekarang</button>
      </div>
    </div>
  `;

  openModal(html);
  return false;
}

function updateProBadgeUI() {
  const proBtn = $id('btn-header-pro');
  const proText = $id('header-pro-text');
  const appBadge = $id('app-badge-status');
  const sheetsEmail = $id('sheets-bound-email');

  if (sheetsEmail) {
    sheetsEmail.textContent = (state.isPro && state.proLicense?.email) ? state.proLicense.email : 'Belum Login PRO';
  }

  if (state.isPro) {
    if (proBtn) {
      proBtn.className = 'btn btn-pro-badge btn-sm active-pro';
      proBtn.title = `Lisensi PRO Aktif (${state.proLicense?.email || ''}) • Klik untuk detail`;
    }
    if (proText) proText.textContent = '👑 PRO Aktif';
    if (appBadge) {
      appBadge.textContent = 'PRO Studio';
      appBadge.className = 'header-badge pro-badge';
    }

    // Unmark locks on dropdown items
    setText('menu-item-sheets', '📊 Database Google Spreadsheet');
    setText('menu-item-reseller', '🏪 Manajemen Reseller & Agen');
    setText('menu-item-audit', '📜 Log Aktivitas Kasir (Audit Trail)');
    const btnBt = $id('btn-thermal-printer-setup');
    if (btnBt) btnBt.textContent = '🖨️ Printer Thermal';
  } else {
    if (proBtn) {
      proBtn.className = 'btn btn-pro-badge btn-sm';
      proBtn.title = 'Aktivasi Lisensi PRO Tanpa Batas';
    }
    if (proText) proText.textContent = '💎 Upgrade PRO';
    if (appBadge) {
      appBadge.textContent = 'SaaS Studio (Free)';
      appBadge.className = 'header-badge';
    }

    // Mark locks on dropdown items in Free mode
    setText('menu-item-sheets', '📊 Database Google Spreadsheet (🔒 PRO)');
    setText('menu-item-reseller', '🏪 Manajemen Reseller & Agen (🔒 PRO)');
    setText('menu-item-audit', '📜 Log Aktivitas Kasir (🔒 PRO)');
    const btnBt = $id('btn-thermal-printer-setup');
    if (btnBt) btnBt.textContent = '🖨️ Printer Thermal (🔒 PRO)';
  }
}

// ===== AUDIT TRAIL LOGGER =====
function logActivity(type, detail, user) {
  const cashier = user || (state.activeShift && state.activeShift.cashierName) || (state.uiMode === 'admin' ? 'Admin' : 'Kasir');
  const entry = {
    id: 'log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    cashier: cashier,
    type: type,
    detail: detail
  };

  state.auditLogs.unshift(entry);
  if (state.auditLogs.length > 500) {
    state.auditLogs = state.auditLogs.slice(0, 500);
  }
  saveState();
}

function showAuditLogModal() {
  if (!requirePro('Log Aktivitas Kasir & Audit Trail')) return;

  const logs = state.auditLogs || [];
  const rows = logs.slice(0, 80).map((l, idx) => {
    const d = new Date(l.timestamp);
    const timeStr = `${d.toLocaleDateString('id-ID')} ${d.toLocaleTimeString('id-ID')}`;
    let badgeClass = 'badge-audit-print';
    let typeLabel = '🖨️ Cetak';

    if (l.type === 'STATUS_CHANGE') { badgeClass = 'badge-audit-status'; typeLabel = '🏷️ Status'; }
    else if (l.type === 'DELETE') { badgeClass = 'badge-audit-delete'; typeLabel = '🗑 Hapus'; }
    else if (l.type === 'SHIFT') { badgeClass = 'badge-audit-shift'; typeLabel = '🚪 Shift'; }
    else if (l.type === 'SYNC') { badgeClass = 'badge-audit-status'; typeLabel = '📊 Cloud DB'; }

    return `
      <tr>
        <td style="font-size:0.75rem;color:var(--text-muted);">${idx + 1}</td>
        <td style="font-size:0.75rem;white-space:nowrap;">${timeStr}</td>
        <td><strong>${esc(l.cashier)}</strong></td>
        <td><span class="badge-audit ${badgeClass}">${typeLabel}</span></td>
        <td style="font-size:0.8rem;">${esc(l.detail)}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <div class="modal-header">
      <h3>📜 Log Aktivitas Kasir & Audit Trail</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
    </div>
    <div class="modal-body">
      <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:0.85rem;">
        Catatan riwayat lengkap seluruh aksi kasir (cetak, pembatalan, shift, & hapus) untuk mencegah kebocoran omset.
      </p>

      <div class="rekap-table-wrapper" style="max-height:360px;">
        <table class="data-table" style="background:var(--surface);">
          <thead>
            <tr>
              <th>No</th>
              <th>Waktu</th>
              <th>Kasir / Petugas</th>
              <th>Aksi</th>
              <th>Rincian Aktivitas</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);">Belum ada riwayat aktivitas tercatat.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-footer" style="justify-content:space-between;">
      <button class="btn btn-secondary btn-sm" id="btn-export-audit-csv">📥 Export Audit Log (CSV)</button>
      <button class="btn btn-primary btn-sm" onclick="closeModal()">Tutup</button>
    </div>
  `;

  openModal(html, 'modal-wide');

  on('btn-export-audit-csv', () => {
    if (logs.length === 0) {
      showToast('Belum ada log untuk diekspor.', 'error');
      return;
    }
    let csv = `AUDIT TRAIL LOG KASIR VOUCHER RUIJIE\nTanggal Export:,"${new Date().toLocaleString('id-ID')}"\n\n`;
    csv += `No,Waktu,Petugas,Tipe Aksi,Rincian\n`;
    logs.forEach((l, i) => {
      csv += `${i + 1},"${new Date(l.timestamp).toLocaleString('id-ID')}","${l.cashier}","${l.type}","${l.detail.replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_log_kasir_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Log Audit Trail berhasil didownload!');
  });
}

// ===== ⚠️ STOCK ALERT CHECKER =====
function checkStockAlerts() {
  const unprinted = state.vouchers.filter(v => !v.printed);
  const totalUnprinted = unprinted.length;
  
  const stockPill = $id('header-stock-pill');
  setText('header-stock-count', totalUnprinted);

  if (stockPill) {
    if (totalUnprinted <= 5 && state.vouchers.length > 0) {
      stockPill.classList.add('low');
    } else {
      stockPill.classList.remove('low');
    }
  }

  const pkgMap = {};
  state.vouchers.forEach(v => {
    const pkg = v.paket || 'Reguler';
    if (!pkgMap[pkg]) pkgMap[pkg] = 0;
    if (!v.printed) pkgMap[pkg]++;
  });

  const lowPkgs = Object.keys(pkgMap).filter(k => pkgMap[k] <= 3);
  const banner = $id('stock-alert-banner');
  const msg = $id('stock-alert-message');

  if (banner && msg) {
    if (state.vouchers.length > 0 && (totalUnprinted <= 5 || lowPkgs.length > 0)) {
      const details = lowPkgs.map(k => `<strong>${esc(k)}</strong>: sisa ${pkgMap[k]} pcs`).join(', ');
      msg.innerHTML = `Stok voucher hampir habis! (${details || `Total sisa hanya ${totalUnprinted} pcs`}). Segera import data baru.`;
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }
  }
}

// ===== THEME ENGINE & THEME STORE =====
function initTheme() {
  const savedTheme = localStorage.getItem('ruijie_theme_mode') || 'light';
  state.themeMode = savedTheme;
  applyTheme();

  on('btn-theme-toggle', 'click', () => {
    state.themeMode = state.themeMode === 'light' ? 'dark' : 'light';
    localStorage.setItem('ruijie_theme_mode', state.themeMode);
    applyTheme();
    showToast(`Mode: ${state.themeMode === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}`);
  });
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.themeMode);
  if (state.themeMode === 'dark') {
    document.body.classList.add('dark-mode');
    document.body.classList.remove('theme-light');
  } else {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('theme-light');
  }
}

function applyDesignPreset(presetName, fontName, borderName) {
  // Free themes: theme-blue, theme-mono. Premium PRO themes: theme-purple, theme-gold, theme-emerald
  if ((presetName === 'theme-purple' || presetName === 'theme-gold' || presetName === 'theme-emerald') && !state.isPro) {
    if (!requirePro(`Tema Desain ${presetName.replace('theme-', '').toUpperCase()}`)) return;
  }

  state.settings.theme = presetName;
  if (fontName) state.settings.fontFamily = fontName;
  if (borderName) state.settings.borderStyle = borderName;

  setVal('theme-select', state.settings.theme);
  setVal('font-select', state.settings.fontFamily);
  setVal('border-select', state.settings.borderStyle);

  $$('.theme-preset-card').forEach(card => {
    card.classList.toggle('active', card.dataset.themePreset === presetName);
  });

  applyUIMode();
  saveState();
  renderPreview();
  showToast(`Tema diterapkan: ${presetName.replace('theme-', '').toUpperCase()}`);
}

// ===== PWA INSTALLATION =====
let deferredPwaPrompt = null;

function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW failed:', err));
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    const menuPwa = $id('menu-item-install-pwa');
    if (menuPwa) menuPwa.style.display = 'flex';
  });

  on('menu-item-install-pwa', 'click', async () => {
    if (deferredPwaPrompt) {
      deferredPwaPrompt.prompt();
      const { outcome } = await deferredPwaPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('Aplikasi berhasil dipasang di layar utama!');
        const menuPwa = $id('menu-item-install-pwa');
        if (menuPwa) menuPwa.style.display = 'none';
      }
      deferredPwaPrompt = null;
    }
  });
}

// ===== EVENT BINDING =====
function bindEvents() {
  // Streamlined Header Dropdown Navigation
  const menuBtn = $id('btn-header-menu');
  const menuDropdown = $id('header-dropdown-menu');

  if (menuBtn && menuDropdown) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menuDropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!menuDropdown.contains(e.target) && e.target !== menuBtn) {
        menuDropdown.classList.remove('show');
      }
    });
  }

  // Header PRO Button & Dropdown Items
  on('btn-header-pro', 'click', showUpgradeProModal);
  on('menu-item-pro', 'click', () => { menuDropdown?.classList.remove('show'); showUpgradeProModal(); });
  on('menu-item-sheets', 'click', () => { menuDropdown?.classList.remove('show'); showGoogleSheetsModal(); });
  on('menu-item-reseller', 'click', () => { menuDropdown?.classList.remove('show'); showResellerModal(); });
  on('menu-item-audit', 'click', () => { menuDropdown?.classList.remove('show'); showAuditLogModal(); });
  on('menu-item-presets', 'click', () => { menuDropdown?.classList.remove('show'); showStorePresetsModal(); });

  // Settings Tab Navigation
  $$('.btn-setting-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      if (tabId === 'tab-sheets' && !state.isPro) {
        if (!requirePro('Database Cloud Google Spreadsheet')) return;
      }

      $$('.btn-setting-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $$('.setting-tab-pane').forEach(pane => {
        pane.style.display = pane.id === `pane-${tabId}` ? 'block' : 'none';
      });
    });
  });

  // 1-Click Theme Store Preset Gallery
  $$('.theme-preset-card').forEach(card => {
    card.addEventListener('click', () => {
      const themeName = card.dataset.themePreset;
      const fontName = card.dataset.font;
      const borderName = card.dataset.border;
      applyDesignPreset(themeName, fontName, borderName);
    });
  });

  // Role Mode Switcher with PIN Lock
  on('btn-mode-admin', 'click', handleSwitchToAdmin);
  on('btn-mode-kasir', 'click', () => setUIMode('kasir'));
  on('btn-change-pin', 'click', showChangePinModal);

  // Google Spreadsheet Database Buttons
  on('btn-open-sheets-guide-tab', 'click', showGoogleSheetsModal);
  on('btn-sync-from-sheets', 'click', syncFromGoogleSheets);
  on('btn-save-to-sheets', 'click', saveToGoogleSheets);
  on('btn-save-sheets-config', 'click', () => {
    if (!requirePro('Database Cloud Google Spreadsheet')) return;
    const url = ($id('sheets-url-input')?.value || '').trim();
    state.settings.sheetsUrl = url;
    saveState();
    showToast('Link Google Spreadsheet berhasil disimpan!');
    triggerBackgroundAutoSync();
  });
  on('auto-sync-sheets-toggle', 'change', (e) => {
    state.settings.autoSyncSheets = e.target.checked;
    saveState();
    showToast(`Cloud Auto-Sync: ${e.target.checked ? 'Aktif' : 'Nonaktif'}`);
  });

  // Thermal Printer Setup (PC & Mobile) & POS Shift Management
  on('btn-thermal-printer-setup', 'click', showThermalPrinterModal);
  on('btn-toggle-shift', 'click', showShiftModal);

  // Reseller & Pro & Rekap Tools
  on('btn-assign-reseller', 'click', showAssignResellerModal);
  on('btn-rekap', 'click', showRekapModal);
  on('btn-export-pdf', 'click', exportPDF);
  on('btn-export-png', 'click', exportPreviewAsPNG);

  // Background Image Upload & Opacity
  on('btn-upload-bg', 'click', () => {
    if (!requirePro('Custom Background Gambar')) return;
    const el = $id('bg-upload');
    if (el) el.click();
  });
  on('bg-upload', 'change', handleBgUpload);
  on('bg-opacity-slider', 'input', (e) => {
    state.settings.bgOpacity = parseInt(e.target.value, 10);
    setText('bg-opacity-val', `${state.settings.bgOpacity}%`);
    saveState();
    renderPreview();
  });
  on('btn-remove-bg', 'click', removeBackground);

  // Watermark / Stempel
  on('watermark-text', 'input', (e) => {
    state.settings.watermarkText = e.target.value.trim();
    saveState();
    renderPreview();
  });
  on('show-watermark', 'change', (e) => {
    state.settings.showWatermark = e.target.checked;
    saveState();
    renderPreview();
  });

  // Live Search & Toolbar Filters
  const searchInput = $id('search-input');
  const searchClear = $id('search-clear-btn');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      if (searchClear) searchClear.style.display = state.searchQuery ? 'block' : 'none';
      renderTable();
      renderPreview();
    });
  }
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      state.searchQuery = '';
      searchClear.style.display = 'none';
      renderTable();
      renderPreview();
    });
  }

  // Global search shortcut '/'
  document.addEventListener('keydown', (e) => {
    const modalOverlay = $id('modal-overlay');
    const isModalOpen = modalOverlay && modalOverlay.classList.contains('active');
    if (e.key === '/' && document.activeElement !== searchInput && !isModalOpen && searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  on('filter-reseller-select', 'change', (e) => {
    state.filterReseller = e.target.value;
    renderTable();
    renderPreview();
  });

  on('auto-archive-toggle', 'change', (e) => {
    state.autoArchive24h = e.target.checked;
    renderTable();
    renderPreview();
  });

  // Settings & Branding
  on('logo-upload', 'change', handleLogoUpload);
  on('logo-area', 'click', () => { const el = $id('logo-upload'); if (el) el.click(); });
  on('ssid-name', 'input', onSettingChange);
  on('login-hint', 'input', onSettingChange);
  on('start-number', 'input', onSettingChange);
  on('layout-select', 'change', onSettingChange);
  on('logo-pos-select', 'change', onSettingChange);
  on('theme-select', 'change', onSettingChange);
  on('font-select', 'change', onSettingChange);
  on('border-select', 'change', onSettingChange);
  on('show-speed', 'change', onSettingChange);
  on('show-quota', 'change', onSettingChange);
  on('show-hint', 'change', onSettingChange);

  // Actions & File Import
  on('btn-import', 'click', () => { const el = $id('csv-file'); if (el) el.click(); });
  on('csv-file', 'change', handleFileInput);
  on('btn-toggle-printed', 'click', toggleSelectedPrintedStatus);
  on('btn-delete-selected', 'click', confirmDeleteSelected);
  on('btn-print', 'click', handlePrint);

  // Filter Tabs
  on('tab-all', 'click', () => setFilter('all'));
  on('tab-unprinted', 'click', () => setFilter('unprinted'));
  on('tab-printed', 'click', () => setFilter('printed'));

  // Checkbox Selection Controls
  on('check-all', 'change', handleCheckAll);
  on('btn-select-unprinted', 'click', selectUnprintedOnly);
  on('btn-select-all', 'click', () => selectAll(true));
  on('btn-deselect-all', 'click', () => selectAll(false));
  on('btn-select-page', 'click', selectOnePageUnprinted);

  // Table row click delegation
  on('voucher-table', 'click', handleTableClick);

  // Modal close
  on('modal-overlay', 'click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ===== 💎 UPGRADE PRO & MANUAL PAYMENT MODAL =====
function showUpgradeProModal() {
  const isCurrentlyPro = state.isPro;
  const licenseInfo = state.proLicense;
  let expText = 'Permanen (Selamanya)';
  if (licenseInfo && licenseInfo.expiresAt) {
    const d = new Date(licenseInfo.expiresAt);
    expText = `Berlaku hingga: ${d.toLocaleDateString('id-ID')}`;
  }

  const html = `
    <div class="modal-header">
      <h3>💎 Lisensi Cetak Voucher PRO</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
    </div>
    <div class="modal-body">
      ${isCurrentlyPro ? `
        <div style="background:var(--success-light);border:2px solid var(--success-border);border-radius:var(--radius-xs);padding:1.25rem 1rem;text-align:center;margin-bottom:1.15rem;">
          <div style="font-size:2.2rem;margin-bottom:0.3rem;">👑</div>
          <h4 style="font-size:1.15rem;font-weight:900;color:var(--success);margin-bottom:0.25rem;">Lisensi PRO Terverifikasi!</h4>
          <div style="font-size:0.86rem;color:var(--text);margin:0.4rem 0;">
            📧 Akun Email: <strong>${esc(licenseInfo ? licenseInfo.email : '-')}</strong>
          </div>
          <p style="font-size:0.78rem;color:var(--text-secondary);">${expText}</p>
          <div style="font-family:var(--font-mono);font-weight:800;font-size:0.88rem;background:var(--surface);border:1px dashed var(--success);padding:0.4rem 0.8rem;border-radius:var(--radius-xs);margin-top:0.65rem;display:inline-block;">
            ${esc(licenseInfo ? licenseInfo.key : 'ACTIVE')}
          </div>
          <div style="margin-top:0.95rem;">
            <button class="btn btn-secondary btn-sm" onclick="deactivateLicense()" style="font-size:0.75rem;">🔓 Keluar / Hapus Lisensi Dari Perangkat Ini</button>
          </div>
        </div>
      ` : ''}

      <!-- 3-Tier Pricing Cards -->
      <div class="pricing-grid-3">
        <div class="pricing-card">
          <div>
            <div class="pricing-title">⚡ 1 Bulan</div>
            <div class="pricing-price">Rp 25.000 <span>/ bln</span></div>
            <ul class="pricing-features">
              <li>✓ Cloud Google Sheets</li>
              <li>✓ Bluetooth POS Print</li>
              <li>✓ Audit Trail Kasir</li>
            </ul>
          </div>
          <button class="btn btn-secondary btn-sm" style="width:100%;justify-content:center;" onclick="showOrderFormModal('1bln')">Pilih 1 Bulan</button>
        </div>

        <div class="pricing-card featured">
          <div class="pricing-badge">HEMAT 42%</div>
          <div>
            <div class="pricing-title">🏢 1 Tahun (Teknisi)</div>
            <div class="pricing-price">Rp 175.000 <span>/ thn</span></div>
            <ul class="pricing-features">
              <li>✓ Semua Fitur PRO</li>
              <li>✓ Multi-Toko & SSID</li>
              <li>✓ Prioritas Update</li>
            </ul>
          </div>
          <button class="btn btn-primary btn-sm" style="width:100%;justify-content:center;" onclick="showOrderFormModal('1thn')">Pilih 1 Tahun</button>
        </div>

        <div class="pricing-card lifetime">
          <div class="pricing-badge">POPULER</div>
          <div>
            <div class="pricing-title">👑 Lifetime Pro</div>
            <div class="pricing-price">Rp 299.000 <span>/ sekali</span></div>
            <ul class="pricing-features">
              <li>✓ Lisensi Selamanya</li>
              <li>✓ Bebas Biaya Bulanan</li>
              <li>✓ Support Selamanya</li>
            </ul>
          </div>
          <button class="btn btn-pro btn-sm" style="width:100%;justify-content:center;" onclick="showOrderFormModal('lifetime')">Pilih Lifetime</button>
        </div>
      </div>

      <!-- Payment Details Box -->
      <div class="payment-methods-box">
        <div style="font-size:0.84rem;font-weight:800;color:var(--text);margin-bottom:0.4rem;">
          💳 Metode Pembayaran Resmi (QRIS GoPay & E-Wallet):
        </div>
        
        <div class="payment-method-card" style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;">
          <img src="qris.jpg" alt="QRIS GoPay" style="width:70px;height:70px;object-fit:cover;border-radius:4px;border:1px solid var(--border);cursor:pointer;" onclick="window.open('qris.jpg','_blank')" title="Klik untuk memperbesar QRIS">
          <div style="flex:1;">
            <strong style="font-size:0.84rem;display:block;color:var(--text);">🏪 HAROJUAN SERBA-SERBI, PULSA & INTERNET</strong>
            <div style="font-size:0.72rem;color:var(--text-secondary);">NMID: ID1026574838235 • GPN QRIS</div>
            <div style="font-family:var(--font-mono);font-size:0.85rem;font-weight:800;color:var(--primary);margin-top:2px;">
              E-Wallet / No. HP: ${OWNER_EWALLET}
            </div>
            <div style="font-size:0.7rem;color:var(--text-secondary);">a.n. Ari Hutabarat</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${OWNER_EWALLET}');showToast('Nomor E-Wallet disalin!')">📋 Salin</button>
        </div>

        <div style="margin-top:0.85rem;text-align:center;">
          <button class="btn btn-primary" style="width:100%;justify-content:center;background:#25D366;border-color:#25D366;font-weight:800;" onclick="showOrderFormModal('1thn')">
            📝 Isi Formulir Pemesanan & Scan QRIS
          </button>
        </div>
      </div>

      <!-- License Activation Input Box (Email-Bound) -->
      <div class="license-activation-card">
        <div style="font-size:0.88rem;font-weight:800;color:var(--primary);margin-bottom:0.65rem;">
          🔑 Login & Aktivasi Lisensi PRO Terdaftar:
        </div>
        <div class="form-group" style="margin-bottom:0.55rem;">
          <label for="m-email-input" style="font-size:0.75rem;font-weight:750;color:var(--text-secondary);">Alamat Email Pembeli (Email Terdaftar Saat Membeli)</label>
          <input type="email" id="m-email-input" class="form-input" placeholder="contoh: warkopbudi@gmail.com" value="${esc(state.proLicense?.email || '')}">
        </div>
        <div class="form-group" style="margin-bottom:0.75rem;">
          <label for="m-license-input" style="font-size:0.75rem;font-weight:750;color:var(--text-secondary);">Kunci Lisensi PRO</label>
          <input type="text" id="m-license-input" class="form-input" style="font-family:var(--font-mono);text-transform:uppercase;font-weight:750;" placeholder="Contoh: RJPRO-LIFETIME-A8F2-9X4B1C">
        </div>
        <button class="btn btn-primary" id="btn-activate-license" style="width:100%;justify-content:center;font-weight:800;" onclick="handleDirectActivateLicense()">
          ✨ Login & Aktifkan Lisensi PRO
        </button>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Tutup</button>
    </div>
  `;

  openModal(html, 'modal-wide');

  on('btn-activate-license', 'click', handleDirectActivateLicense);
  on('m-license-input', 'keydown', (e) => {
    if (e.key === 'Enter') handleDirectActivateLicense();
  });
  on('m-email-input', 'keydown', (e) => {
    if (e.key === 'Enter') handleDirectActivateLicense();
  });
}

function handleDirectActivateLicense() {
  const emailInput = $id('m-email-input');
  const keyInput = $id('m-license-input');
  const email = (emailInput ? emailInput.value : '').trim();
  const key = (keyInput ? keyInput.value : '').trim();

  if (!email || !email.includes('@')) {
    showToast('Masukkan alamat email yang valid!', 'error');
    if (emailInput) emailInput.focus();
    return;
  }
  if (!key) {
    showToast('Masukkan kode lisensi Anda!', 'error');
    if (keyInput) keyInput.focus();
    return;
  }

  const success = activateLicense(key, email);
  if (success) {
    closeModal();
  }
}

// ===== 💳 DYNAMIC QRIS GENERATOR ENGINE (EMVCo / ASPI STANDARDS) =====
const BASE_STATIC_QRIS = "00020101021126610014COM.GO-JEK.WWW01189360091439005151990210G9005151990303UMI51440014ID.CO.QRIS.WWW0215ID10265748382350303UMI5204481453033605802ID5925harojuan serba-serbi, Pul6010JAYAWIJAYA61059951162070703A0163045415";

function calculateCRC16(str) {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  let hex = crc.toString(16).toUpperCase();
  while (hex.length < 4) hex = '0' + hex;
  return hex;
}

function buildDynamicQRISPayload(nominalAmount) {
  let payload = BASE_STATIC_QRIS.slice(0, -4); // Buang checksum lama
  payload = payload.replace("010211", "010212"); // Ubah dari 11 (Statis) jadi 12 (Dinamis)
  
  // Sisipkan Tag 54 (Transaction Amount) tepat setelah Tag 53 (5303360)
  const tag53 = "5303360";
  const amountStr = nominalAmount.toString();
  const tag54Len = (amountStr.length < 10 ? '0' : '') + amountStr.length;
  const tag54 = `54${tag54Len}${amountStr}`;
  
  const tag53Index = payload.indexOf(tag53);
  if (tag53Index !== -1) {
    const insertPos = tag53Index + tag53.length;
    payload = payload.slice(0, insertPos) + tag54 + payload.slice(insertPos);
  }
  
  const newCRC = calculateCRC16(payload);
  return payload + newCRC;
}

function showOrderFormModal(selectedPackage = '1thn') {
  const packages = {
    '1bln': { name: 'Paket 1 Bulan (Starter)', basePrice: 25000, priceStr: 'Rp 25.000', code: '1BLN' },
    '1thn': { name: '🏢 Paket 1 Tahun (Teknisi - Best Value)', basePrice: 175000, priceStr: 'Rp 175.000', code: '1THN' },
    'lifetime': { name: '👑 Paket Lifetime Pro (Sekali Bayar Selamanya)', basePrice: 299000, priceStr: 'Rp 299.000', code: 'LIFETIME' }
  };

  // Generate 3-Digit Unique Code for instant verification
  const uniqueCode = Math.floor(100 + Math.random() * 899);

  const html = `
    <div class="modal-header">
      <h3>⚡ Checkout & QRIS Dinamis Otomatis PRO</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
    </div>
    <div class="modal-body" style="max-height:82vh;overflow-y:auto;">
      <!-- Step 1: Data Pembeli -->
      <div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius-xs);padding:0.85rem;margin-bottom:0.85rem;">
        <div style="font-size:0.84rem;font-weight:800;color:var(--primary);margin-bottom:0.5rem;">
          1️⃣ Data Lisensi Pembeli:
        </div>

        <div class="form-group" style="margin-bottom:0.5rem;">
          <label for="order-email" style="font-size:0.76rem;font-weight:750;color:var(--text);">
            📧 Alamat Email Anda <span style="color:var(--danger);font-weight:800;">*</span>
          </label>
          <input type="email" id="order-email" class="form-input" placeholder="contoh: warkopbudi@gmail.com" value="${esc(state.proLicense?.email || '')}" required>
        </div>

        <div class="form-group" style="margin-bottom:0.5rem;">
          <label for="order-name" style="font-size:0.76rem;font-weight:750;color:var(--text);">
            👤 Nama Pemilik / Nama Usaha <span style="color:var(--danger);font-weight:800;">*</span>
          </label>
          <input type="text" id="order-name" class="form-input" placeholder="contoh: Budi (Warkop Net)" required>
        </div>

        <div class="form-group" style="margin-bottom:0.2rem;">
          <label for="order-plan-select" style="font-size:0.76rem;font-weight:750;color:var(--text);">
            📦 Pilihan Paket Lisensi
          </label>
          <select id="order-plan-select" class="form-input" style="font-weight:750;">
            <option value="1bln" ${selectedPackage === '1bln' ? 'selected' : ''}>Paket 1 Bulan — Rp 25.000</option>
            <option value="1thn" ${selectedPackage === '1thn' ? 'selected' : ''}>🏢 Paket 1 Tahun (Best Value) — Rp 175.000</option>
            <option value="lifetime" ${selectedPackage === 'lifetime' ? 'selected' : ''}>👑 Paket Lifetime Selamanya — Rp 299.000</option>
          </select>
        </div>
      </div>

      <!-- Step 2: Dynamic QRIS Card -->
      <div style="background:var(--surface);border:2px solid var(--primary);border-radius:10px;padding:0.9rem;margin-bottom:1rem;box-shadow:0 6px 20px rgba(37,99,235,0.08);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem;">
          <div style="font-size:0.84rem;font-weight:850;color:var(--text);">
            2️⃣ Scan QRIS Dinamis (Nominal Terkunci):
          </div>
          <span id="order-total-badge" style="font-size:1.15rem;font-weight:900;color:var(--primary);letter-spacing:0.02em;">Rp 0</span>
        </div>

        <!-- Dynamic QRIS Box -->
        <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:0.85rem;text-align:center;margin-bottom:0.6rem;">
          <div style="font-size:0.82rem;font-weight:900;color:#0f172a;margin-bottom:2px;">
            HAROJUAN SERBA-SERBI, PULSA & INTERNET
          </div>
          <div style="font-size:0.7rem;color:#64748b;margin-bottom:0.5rem;">
            NMID: <strong>ID1026574838235</strong> • GPN QRIS Standar Nasional
          </div>

          <!-- Dynamic QR Container -->
          <div id="dynamic-qris-box" style="display:flex;justify-content:center;align-items:center;min-height:210px;margin:0.5rem 0;background:#fff;padding:8px;border-radius:6px;border:1px dashed #cbd5e1;">
            <!-- QRCode rendered dynamically here -->
          </div>

          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:0.5rem;margin:0.5rem 0;font-size:0.75rem;color:#1e40af;text-align:left;">
            <div style="font-weight:800;display:flex;justify-content:space-between;margin-bottom:2px;">
              <span>Total Tagihan:</span>
              <span id="dyn-total-breakdown" style="font-weight:900;color:#1d4ed8;">Rp 0</span>
            </div>
            <div style="font-size:0.68rem;color:#3b82f6;line-height:1.35;">
              ⚡ <em>Nominal otomatis terkunci di layar HP Anda saat scan di GoPay, BCA, Mandiri, BRI, BNI, DANA, OVO, ShopeePay (tanpa perlu ketik manual!).</em>
            </div>
          </div>

          <div style="display:flex;justify-content:center;gap:0.5rem;flex-wrap:wrap;margin-top:0.4rem;">
            <button class="btn btn-secondary btn-sm" id="btn-download-dynamic-qr" style="font-size:0.72rem;padding:0.3rem 0.65rem;">
              📥 Unduh QRIS Dinamis
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-copy-nominal" style="font-size:0.72rem;padding:0.3rem 0.65rem;">
              📋 Salin Total Nominal
            </button>
          </div>
        </div>

        <!-- Manual E-Wallet Fallback -->
        <div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius-xs);padding:0.55rem 0.75rem;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:0.7rem;font-weight:750;color:var(--text-secondary);">Atau Transfer Nomor E-Wallet:</div>
            <div style="font-family:var(--font-mono);font-size:0.92rem;font-weight:900;color:var(--primary);">
              ${OWNER_EWALLET} <span style="font-size:0.68rem;font-weight:600;color:var(--text-secondary);">(Ari Hutabarat)</span>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard.writeText('${OWNER_EWALLET}');showToast('Nomor E-Wallet disalin!')">
            📋 Salin
          </button>
        </div>
      </div>

      <!-- Step 3: Tombol Konfirmasi WhatsApp -->
      <button class="btn btn-primary" id="btn-submit-order-wa" style="width:100%;justify-content:center;background:#25D366;border-color:#25D366;font-size:0.92rem;font-weight:850;padding:0.75rem;">
        💬 Kirim Formulir & Bukti Pembayaran ke WhatsApp
      </button>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="showUpgradeProModal()">← Kembali ke Pilihan Paket</button>
    </div>
  `;

  openModal(html, 'modal-medium');

  const planSelect = $id('order-plan-select');
  const totalBadge = $id('order-total-badge');
  const breakdownEl = $id('dyn-total-breakdown');
  const qrisBox = $id('dynamic-qris-box');

  let currentTotalNominal = 0;
  let currentDynamicPayload = '';

  function renderSelectedDynamicQR(planKey) {
    const pkg = packages[planKey] || packages['1thn'];
    currentTotalNominal = pkg.basePrice + uniqueCode;
    currentDynamicPayload = buildDynamicQRISPayload(currentTotalNominal);

    const formatted = 'Rp ' + currentTotalNominal.toLocaleString('id-ID');
    if (totalBadge) totalBadge.textContent = formatted;
    if (breakdownEl) breakdownEl.textContent = `${formatted} (Paket ${pkg.priceStr} + Kode Unik Rp ${uniqueCode})`;

    if (qrisBox) {
      qrisBox.innerHTML = '';
      try {
        if (typeof QRCode !== 'undefined') {
          const correctLvl = (QRCode.CorrectLevel && QRCode.CorrectLevel.M !== undefined) ? QRCode.CorrectLevel.M : 0;
          new QRCode(qrisBox, {
            text: currentDynamicPayload,
            width: 190,
            height: 190,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: correctLvl
          });
        } else {
          qrisBox.innerHTML = `<img src="qris.jpg" alt="QRIS" style="max-width:190px;height:auto;border-radius:4px;">`;
        }
      } catch (err) {
        console.warn('QR render fallback:', err);
        qrisBox.innerHTML = `<img src="qris.jpg" alt="QRIS" style="max-width:190px;height:auto;border-radius:4px;">`;
      }
    }
  }

  // Initial render
  renderSelectedDynamicQR(selectedPackage);

  if (planSelect) {
    planSelect.addEventListener('change', () => {
      renderSelectedDynamicQR(planSelect.value);
    });
  }

  on('btn-copy-nominal', 'click', () => {
    navigator.clipboard.writeText(currentTotalNominal.toString());
    showToast(`Nominal Rp ${currentTotalNominal.toLocaleString('id-ID')} berhasil disalin!`);
  });

  on('btn-download-dynamic-qr', 'click', () => {
    const canvas = qrisBox?.querySelector('canvas');
    const img = qrisBox?.querySelector('img');
    const dataUrl = canvas ? canvas.toDataURL('image/png') : (img ? img.src : '');
    if (dataUrl) {
      const link = document.createElement('a');
      link.download = `QRIS-HAROJUAN-${currentTotalNominal}.png`;
      link.href = dataUrl;
      link.click();
      showToast('QRIS Dinamis berhasil diunduh!');
    } else {
      window.open('qris.jpg', '_blank');
    }
  });

  on('btn-submit-order-wa', 'click', () => {
    const email = ($id('order-email')?.value || '').trim();
    const name = ($id('order-name')?.value || '').trim();
    const planKey = $id('order-plan-select')?.value || '1thn';
    const pkg = packages[planKey] || packages['1thn'];

    if (!email || !email.includes('@')) {
      showToast('Harap masukkan alamat email Anda yang valid!', 'error');
      $id('order-email')?.focus();
      return;
    }
    if (!name) {
      showToast('Harap masukkan nama pemilik atau nama usaha Anda!', 'error');
      $id('order-name')?.focus();
      return;
    }

    const waMsg = `Halo Admin Ari Hutabarat, saya ingin konfirmasi pemesanan Lisensi PRO Cetak Voucher Ruijie:\n\n` +
      `📋 FORMULIR PEMBELIAN:\n` +
      `• Nama Pemilik / Usaha: ${name}\n` +
      `• Email Terdaftar: ${email}\n` +
      `• Paket Lisensi: ${pkg.name}\n` +
      `• Total Transfer: Rp ${currentTotalNominal.toLocaleString('id-ID')} (Termasuk Kode Unik: ${uniqueCode})\n` +
      `• Metode Pembayaran: Scan QRIS GoPay Dinamis (HAROJUAN SERBA-SERBI, PULSA & INTERNET)\n\n` +
      `(Berikut saya lampirkan bukti scan QRIS dinamis).\n` +
      `Mohon Kunci Lisensi PRO dikirimkan ke email saya. Terima kasih!`;

    const url = `https://wa.me/62${OWNER_WHATSAPP.substring(1)}?text=${encodeURIComponent(waMsg)}`;
    window.open(url, '_blank');
    closeModal();
    showToast('Membuka WhatsApp untuk mengirimkan formulir...');
  });
}

// ===== 📊 GOOGLE SPREADSHEET DATABASE ENGINE =====
const GOOGLE_APPS_SCRIPT_CODE = `function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0]) {
      rows.push({
        code: String(row[0]),
        paket: String(row[1] || 'Reguler'),
        harga: String(row[2] || ''),
        periode: String(row[3] || ''),
        speed: String(row[4] || ''),
        quota: String(row[5] || ''),
        printed: row[6] === 'Sudah Dicetak' || row[6] === true,
        resellerName: String(row[7] || ''),
        printedAt: String(row[8] || '')
      });
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: rows }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var body = JSON.parse(e.postData.contents);
    if (body.action === 'save_vouchers' && body.vouchers) {
      sheet.clear();
      sheet.appendRow(['Kode Voucher', 'Paket', 'Harga', 'Periode', 'Speed', 'Kuota', 'Status', 'Reseller', 'Waktu']);
      body.vouchers.forEach(function(v) {
        sheet.appendRow([
          v.code,
          v.paket || 'Reguler',
          v.harga || '',
          v.periode || '',
          v.speed || '',
          v.quota || '',
          v.printed ? 'Sudah Dicetak' : 'Belum Dicetak',
          v.resellerName || '',
          v.printedAt || v.createdAt || ''
        ]);
      });
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', count: body.vouchers.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

function showGoogleSheetsModal() {
  if (!requirePro('Database Cloud Google Spreadsheet')) return;

  const currentUrl = state.settings.sheetsUrl || '';
  const html = `
    <div class="modal-header">
      <h3>📊 Setup Database Google Spreadsheet</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
    </div>
    <div class="modal-body">
      <p style="font-size:0.84rem;color:var(--text-secondary);margin-bottom:1rem;">
        Hubungkan Google Sheets sebagai database cloud Anda. Anda dapat menarik voucher dan menyimpan hasil rekap penjualan secara otomatis.
      </p>

      <div class="form-group" style="margin-bottom:1rem;">
        <label for="m-sheets-url">Link Spreadsheet / Web App Script URL *</label>
        <input type="url" id="m-sheets-url" class="form-input" value="${esc(currentUrl)}" placeholder="https://script.google.com/macros/s/.../exec ATAU https://docs.google.com/spreadsheets/d/...">
      </div>

      <div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius-xs);padding:0.85rem;margin-bottom:1.15rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
          <strong style="font-size:0.82rem;color:var(--primary);">💡 Panduan 2 Menit Setup Database Gratis:</strong>
          <button class="btn btn-secondary btn-sm" id="btn-copy-gas-code">📋 Salin Script Google</button>
        </div>
        <ol style="font-size:0.76rem;color:var(--text-secondary);padding-left:1.2rem;line-height:1.6;">
          <li>Buka <strong>Google Sheets</strong> baru di browser Anda.</li>
          <li>Klik menu <strong>Ekstensi (Extensions)</strong> ➔ <strong>Apps Script</strong>.</li>
          <li>Hapus kode bawaan, lalu paste kode dari tombol <strong>"Salin Script Google"</strong> di atas.</li>
          <li>Klik <strong>Deploy (Terapkan)</strong> ➔ <strong>New Deployment (Penerapan Baru)</strong> ➔ pilih <strong>Web App</strong>.</li>
          <li>Setel <em>"Who has access"</em> menjadi <strong>"Anyone" (Siapa saja)</strong>, lalu klik <strong>Deploy</strong>.</li>
          <li>Salin <strong>Web App URL</strong> yang dihasilkan ke kotak di atas!</li>
        </ol>
      </div>

      <div style="display:flex;gap:0.55rem;flex-wrap:wrap;">
        <button class="btn btn-primary btn-sm" id="btn-modal-sync-sheets">📥 Tarik Data dari Spreadsheet</button>
        <button class="btn btn-secondary btn-sm" id="btn-modal-save-sheets">📤 Simpan / Ekspor ke Spreadsheet</button>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Tutup</button>
      <button class="btn btn-primary" id="btn-modal-save-sheets-config">Simpan Link Spreadsheet</button>
    </div>
  `;

  openModal(html, 'modal-wide');

  on('btn-copy-gas-code', () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE).then(() => {
      showToast('Kode Google Apps Script berhasil disalin ke clipboard!');
    }).catch(() => {
      showToast('Gagal menyalin. Silakan copy manual.', 'error');
    });
  });

  on('btn-modal-save-sheets-config', () => {
    const url = ($id('m-sheets-url')?.value || '').trim();
    state.settings.sheetsUrl = url;
    setVal('sheets-url-input', url);
    saveState();
    closeModal();
    showToast('Link Google Spreadsheet berhasil disimpan!');
    triggerBackgroundAutoSync();
  });

  on('btn-modal-sync-sheets', () => {
    const url = ($id('m-sheets-url')?.value || '').trim();
    if (url) {
      state.settings.sheetsUrl = url;
      setVal('sheets-url-input', url);
      saveState();
    }
    syncFromGoogleSheets();
  });

  on('btn-modal-save-sheets', () => {
    const url = ($id('m-sheets-url')?.value || '').trim();
    if (url) {
      state.settings.sheetsUrl = url;
      setVal('sheets-url-input', url);
      saveState();
    }
    saveToGoogleSheets();
  });
}

// ===== 📊 1-UNIFIED ACCOUNT CLOUD DATABASE & REALTIME AUTO-SYNC =====
let autoSaveSheetsTimeout = null;

function triggerBackgroundAutoSync() {
  if (!state.isPro || !state.settings.sheetsUrl || state.settings.autoSyncSheets === false) return;
  if (autoSaveSheetsTimeout) clearTimeout(autoSaveSheetsTimeout);
  autoSaveSheetsTimeout = setTimeout(() => {
    saveToGoogleSheets({ silent: true });
  }, 1200);
}

function resolveGoogleSheetsUrl(rawUrl) {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();

  if (trimmed.includes('script.google.com')) {
    return { type: 'apps_script', url: trimmed };
  }

  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    const sheetId = match[1];
    return {
      type: 'csv',
      url: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
    };
  }

  return { type: 'csv', url: trimmed };
}

async function syncFromGoogleSheets(opts = {}) {
  if (!requirePro('Database Cloud Google Spreadsheet')) return;

  const rawUrl = state.settings.sheetsUrl || $id('sheets-url-input')?.value;
  if (!rawUrl) {
    if (!opts.silent) {
      showToast('Masukkan link Google Spreadsheet / Apps Script terlebih dahulu.', 'error');
      showGoogleSheetsModal();
    }
    return;
  }

  const resolved = resolveGoogleSheetsUrl(rawUrl);
  if (!resolved) {
    if (!opts.silent) showToast('Format link Spreadsheet tidak valid.', 'error');
    return;
  }

  if (!opts.silent) showToast('Menghubungkan ke Cloud Google Spreadsheet...');

  try {
    if (resolved.type === 'apps_script') {
      const res = await fetch(resolved.url, { method: 'GET' });
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        handleImportedSheetsVouchers(json.data, opts);
        logActivity('SYNC', `Sinkronisasi ${json.data.length} voucher dari Google Sheets`);
        return;
      }
    }

    const res = await fetch(resolved.url);
    const csvText = await res.text();
    const parsedVouchers = parseRuijieCSV(csvText);
    if (parsedVouchers.length === 0) {
      if (!opts.silent) showToast('Tidak ada data voucher ditemukan di Spreadsheet.', 'error');
      return;
    }
    handleImportedSheetsVouchers(parsedVouchers, opts);
    logActivity('SYNC', `Tarik ${parsedVouchers.length} voucher dari Spreadsheet CSV`);
  } catch (err) {
    console.error('Google Sheets sync error:', err);
    if (!opts.silent) showToast('Gagal menarik data dari Google Sheets. Pastikan akses disetel "Anyone".', 'error');
  }
}

function handleImportedSheetsVouchers(importedList, opts = {}) {
  const existingMap = new Set(state.vouchers.map(v => (v.code || '').toLowerCase().trim()));
  let newCount = 0;

  let processList = importedList;
  if (!state.isPro) {
    const currentLen = state.vouchers.length;
    const remainingSlots = Math.max(0, FREE_TIER_MAX_VOUCHERS - currentLen);
    if (remainingSlots <= 0) {
      requirePro('Kapasitas Lebih dari 25 Voucher');
      return;
    }
    processList = importedList.slice(0, remainingSlots);
    if (importedList.length > remainingSlots) {
      showToast(`Versi Gratis dibatasi maksimal ${FREE_TIER_MAX_VOUCHERS} voucher. Hanya ${remainingSlots} voucher diimpor. Upgrade PRO untuk unlimited!`, 'error');
    }
  }

  processList.forEach(item => {
    const code = (item.code || '').trim();
    if (code && !existingMap.has(code.toLowerCase())) {
      state.vouchers.push({
        code: code,
        paket: item.paket || 'Reguler',
        harga: item.harga || '',
        periode: item.periode || '',
        speed: item.speed || '',
        quota: item.quota || '',
        resellerName: item.resellerName || null,
        resellerId: null,
        createdAt: item.createdAt || new Date().toISOString(),
        printed: !!item.printed,
        printedAt: item.printedAt || null,
        selected: true
      });
      existingMap.add(code.toLowerCase());
      newCount++;
    }
  });

  saveState();
  checkStockAlerts();
  renderQuickPOSGrid();
  renderTable();
  renderPreview();

  if (!opts.silent) {
    showToast(`✨ Sukses! ${newCount} voucher disinkronkan dari Google Sheets.`);
  } else if (newCount > 0) {
    showToast(`☁️ Cloud Auto-Sync: ${newCount} voucher baru disinkronkan.`);
  }
}

async function saveToGoogleSheets(opts = {}) {
  if (!requirePro('Database Cloud Google Spreadsheet')) return;

  const rawUrl = state.settings.sheetsUrl || $id('sheets-url-input')?.value;
  if (!rawUrl) {
    if (!opts.silent) {
      showToast('Masukkan link Google Apps Script Web App terlebih dahulu.', 'error');
      showGoogleSheetsModal();
    }
    return;
  }

  const resolved = resolveGoogleSheetsUrl(rawUrl);
  if (!resolved || resolved.type !== 'apps_script') {
    if (!opts.silent) {
      showToast('Untuk menyimpan otomatis, gunakan link Web App Google Apps Script (lihat panduan).', 'error');
      showGoogleSheetsModal();
    }
    return;
  }

  if (!opts.silent) showToast('Mengunggah data ke Google Spreadsheet...');

  try {
    await fetch(resolved.url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_vouchers',
        email: state.proLicense?.email || 'pro@user',
        vouchers: state.vouchers
      })
    });

    logActivity('SYNC', `Backup ${state.vouchers.length} voucher ke Google Sheets`);
    if (!opts.silent) {
      showToast(`✅ Berhasil! ${state.vouchers.length} voucher tersimpan di Google Sheets.`);
    }
  } catch (err) {
    console.error('Save to sheets error:', err);
    if (!opts.silent) showToast('Gagal menyimpan ke Google Sheets.', 'error');
  }
}

// ===== ROLE MODE & ADMIN PIN SECURITY =====
function handleSwitchToAdmin() {
  if (state.uiMode === 'admin') return;

  showPinPromptModal(() => {
    setUIMode('admin');
  });
}

function setUIMode(mode) {
  state.uiMode = mode;
  applyUIMode();
  saveState();
  showToast(`Beralih ke: ${mode === 'kasir' ? 'Mode Kasir (POS)' : 'Mode Admin (Full Control)'}`);
}

function applyUIMode() {
  const fontClass = state.settings.fontFamily || 'font-inter';
  const borderClass = state.settings.borderStyle || 'border-dashed';
  const darkClass = state.themeMode === 'dark' ? 'dark-mode' : 'theme-light';
  document.body.className = `mode-${state.uiMode} ${fontClass} ${borderClass} ${darkClass}`;
  
  const btnAdmin = $id('btn-mode-admin');
  const btnKasir = $id('btn-mode-kasir');
  if (btnAdmin) btnAdmin.classList.toggle('active', state.uiMode === 'admin');
  if (btnKasir) btnKasir.classList.toggle('active', state.uiMode === 'kasir');
}

function showPinPromptModal(onSuccess) {
  const html = `
    <div class="modal-header">
      <h3>🔒 Masukkan PIN Admin</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
    </div>
    <div class="modal-body" style="text-align:center;">
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:1.2rem;">
        Menu Admin dilindungi PIN untuk mencegah kasir merubah data dan laporan.
      </p>
      <div class="pin-input-wrap">
        <input type="password" id="m-pin-input" maxlength="6" class="form-input" style="font-size:1.6rem;text-align:center;letter-spacing:0.3em;max-width:200px;margin:0 auto;" autofocus placeholder="••••">
      </div>
      <p style="font-size:0.75rem;color:var(--text-muted);">Default PIN: <strong>1234</strong></p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" id="btn-verify-pin">Buka Kunci</button>
    </div>
  `;

  openModal(html);

  const verify = () => {
    const entered = ($id('m-pin-input')?.value || '').trim();
    if (entered === (state.adminPin || '1234')) {
      closeModal();
      onSuccess();
    } else {
      showToast('PIN Admin salah!', 'error');
      const input = $id('m-pin-input');
      if (input) {
        input.value = '';
        input.focus();
      }
    }
  };

  on('btn-verify-pin', 'click', verify);
  on('m-pin-input', 'keydown', (e) => {
    if (e.key === 'Enter') verify();
  });
}

function showChangePinModal() {
  const html = `
    <div class="modal-header">
      <h3>🔒 Ubah PIN Keamanan Admin</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
    </div>
    <div class="modal-body">
      <div class="modal-form">
        <div class="form-group">
          <label for="m-old-pin">PIN Lama</label>
          <input type="password" id="m-old-pin" class="form-input" maxlength="6" placeholder="Default: 1234" autofocus>
        </div>
        <div class="form-group">
          <label for="m-new-pin">PIN Baru (4-6 Digit Angka)</label>
          <input type="password" id="m-new-pin" class="form-input" maxlength="6" placeholder="Contoh: 5678">
        </div>
        <div class="form-group">
          <label for="m-confirm-pin">Ulangi PIN Baru</label>
          <input type="password" id="m-confirm-pin" class="form-input" maxlength="6" placeholder="Ulangi PIN baru">
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" id="btn-save-new-pin">Simpan PIN Baru</button>
    </div>
  `;

  openModal(html);

  on('btn-save-new-pin', () => {
    const oldPin = ($id('m-old-pin')?.value || '').trim();
    const newPin = ($id('m-new-pin')?.value || '').trim();
    const confirmPin = ($id('m-confirm-pin')?.value || '').trim();

    if (oldPin !== (state.adminPin || '1234')) {
      showToast('PIN lama tidak cocok!', 'error');
      return;
    }
    if (!newPin || newPin.length < 4) {
      showToast('PIN baru minimal 4 karakter!', 'error');
      return;
    }
    if (newPin !== confirmPin) {
      showToast('Konfirmasi PIN baru tidak sama!', 'error');
      return;
    }

    state.adminPin = newPin;
    saveState();
    closeModal();
    showToast('PIN Admin berhasil diperbarui!');
  });
}

// ===== 🖨️ DYNAMIC PRINT STYLES ENGINE (A4 vs THERMAL 58mm / 80mm) =====
function preparePrintStyles(layoutVal = '25') {
  let styleEl = document.getElementById('dynamic-print-page-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-print-page-style';
    document.head.appendChild(styleEl);
  }

  if (layoutVal === 'thermal-58' || layoutVal === 'receipt') {
    styleEl.textContent = `
      @page {
        size: 58mm 210mm !important;
        margin: 0mm !important;
      }
      @media print {
        html, body {
          width: 58mm !important;
          max-width: 58mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }
        #print-area {
          width: 58mm !important;
          max-width: 58mm !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .print-page {
          width: 58mm !important;
          max-width: 58mm !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          display: block !important;
          margin: 0 !important;
          padding: 0 !important;
          page-break-after: auto !important;
          break-after: auto !important;
        }
      }
    `;
  } else if (layoutVal === 'thermal-80') {
    styleEl.textContent = `
      @page {
        size: 80mm 297mm !important;
        margin: 0mm !important;
      }
      @media print {
        html, body {
          width: 80mm !important;
          max-width: 80mm !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }
        #print-area {
          width: 80mm !important;
          max-width: 80mm !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .print-page {
          width: 80mm !important;
          max-width: 80mm !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          display: block !important;
          margin: 0 !important;
          padding: 0 !important;
          page-break-after: auto !important;
          break-after: auto !important;
        }
      }
    `;
  } else {
    styleEl.textContent = `
      @page {
        size: A4 portrait !important;
        margin: 5mm 5mm 5mm 5mm !important;
      }
      @media print {
        html, body {
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        #print-area {
          width: 100% !important;
          margin: 0 auto !important;
        }
      }
    `;
  }
}

// ===== 🖨️ THERMAL PRINTER SETUP & TEST PRINT (PC & MOBILE) =====
function showThermalPrinterModal() {
  const isSerialConnected = !!window.activeSerialPort;
  const isUsbConnected = !!window.activeUsbDevice;
  const isBTConnected = !!state.bluetoothDevice;
  const currentLayout = state.settings.layout || '25';

  const html = `
    <div class="modal-header">
      <h3>🖨️ Panduan & Koneksi Printer Thermal CP-58B / POS-58</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
    </div>
    <div class="modal-body" style="max-height:82vh;overflow-y:auto;">
      
      <!-- Panduan PIN Pairing Windows (PENTING) -->
      <div style="background:#fef3c7;border:1.5px solid #f59e0b;border-radius:8px;padding:0.8rem;margin-bottom:0.85rem;font-size:0.77rem;color:#92400e;line-height:1.5;">
        <div style="font-weight:900;font-size:0.84rem;margin-bottom:0.35rem;display:flex;align-items:center;gap:0.35rem;">
          <span>🔑 Cara Isi PIN Pairing CP-58B di Windows PC:</span>
        </div>
        <div>Di komputer PC Windows, permintaan PIN (<code>0000</code> atau <code>1234</code>) harus dimasukkan terlebih dahulu di <strong>Windows Settings</strong> (bukan langsung di browser):</div>
        <div style="background:#fff;border:1px solid #fde68a;border-radius:6px;padding:0.5rem 0.7rem;margin-top:0.45rem;color:#1e293b;">
          <div>1️⃣ Buka <strong>Settings Windows</strong> (Tekan tombol keyboard <kbd>Win + I</kbd>).</div>
          <div>2️⃣ Masuk ke menu <strong>Bluetooth & devices</strong> ➔ Klik tombol <strong>Add device (+ Tambah perangkat)</strong>.</div>
          <div>3️⃣ Pilih <strong>Bluetooth</strong> ➔ Klik nama printer <strong>CP-58B / POS-58</strong> yang terdeteksi.</div>
          <div>4️⃣ Windows akan meminta PIN ➔ Ketik <strong>0000</strong> (atau <strong>1234</strong>) lalu klik <strong>Connect</strong>.</div>
          <div>5️⃣ Setelah statusnya <em>"Paired / Terhubung"</em> di Windows, klik tombol <strong>"⚡ Hubungkan Port CP-58B"</strong> di bawah ini!</div>
        </div>
      </div>

      <!-- Pilihan 1: Web Serial / Bluetooth Windows (Khusus CP-58B) -->
      <div style="background:var(--surface-alt);border:1.5px solid var(--primary);border-radius:10px;padding:0.95rem;margin-bottom:1rem;">
        <div style="font-size:0.88rem;font-weight:850;color:var(--primary);margin-bottom:0.4rem;display:flex;align-items:center;gap:0.4rem;">
          <span>⚡ 1. Hubungkan Port CP-58B (Setelah di-Pair di Windows)</span>
        </div>
        <p style="font-size:0.77rem;color:var(--text);line-height:1.45;margin-bottom:0.65rem;">
          Klik tombol di bawah untuk menyambungkan port komunikasi data langsung ke CP-58B:
        </p>

        <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:6px;padding:0.65rem 0.8rem;margin-bottom:0.75rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.4rem;">
          <div>
            <div style="font-size:0.78rem;font-weight:800;color:var(--primary);">Status Port CP-58B:</div>
            <div style="font-size:0.72rem;color:var(--text-secondary);"><strong style="color:${isSerialConnected ? 'var(--success)' : 'var(--text-muted)'};">${isSerialConnected ? '🟢 Terhubung ke Port Serial CP-58B' : '⚪ Belum Terhubung'}</strong></div>
          </div>
          <button class="btn ${isSerialConnected ? 'btn-secondary' : 'btn-primary'} btn-sm" id="btn-modal-connect-serial" style="font-size:0.75rem;font-weight:800;">
            ${isSerialConnected ? '🔄 Putus / Ganti Port' : '⚡ Hubungkan Port CP-58B'}
          </button>
        </div>

        <div style="font-size:0.76rem;font-weight:800;color:var(--text);margin-bottom:0.4rem;">
          🧪 Tes Cetak Struk 58mm:
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" onclick="testPrintThermal(58)" style="font-weight:800;">
            🧪 Test Print Struk 58mm (CP-58B)
          </button>
          <button class="btn btn-secondary btn-sm" onclick="testPrintThermal(80)">
            🧪 Test Print Struk 80mm
          </button>
        </div>
      </div>

      <!-- Pilihan 2: Dialog Print Windows / Chrome (Jalur Driver POS-58) -->
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:0.95rem;margin-bottom:1rem;">
        <div style="font-size:0.86rem;font-weight:850;color:var(--text);margin-bottom:0.4rem;">
          🖨️ 2. Panduan Dialog Cetak Chrome / Edge PC (Agar Tidak Format A4)
        </div>
        <p style="font-size:0.76rem;color:var(--text-secondary);line-height:1.45;margin-bottom:0.55rem;">
          Saat jendela print browser muncul di PC:
        </p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:0.6rem 0.8rem;font-size:0.75rem;color:#0f172a;line-height:1.5;">
          <div>1️⃣ <strong>Destination (Tujuan):</strong> Pilih nama printer Anda (contoh: <em>POS-58 / CP-58B</em>).</div>
          <div>2️⃣ <strong>Paper size:</strong> Pilih <code>58mm</code> / <code>Receipt</code> / <code>Roll Paper</code>.</div>
          <div>3️⃣ <strong>Margins:</strong> Pilih <strong>None (Tanpa Margin)</strong>.</div>
          <div>4️⃣ <strong>Options:</strong> <strong>Hapus centang</strong> "Headers and footers".</div>
        </div>
      </div>

      <!-- Pilihan 3: Direct WebUSB & Mobile Bluetooth -->
      <div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:10px;padding:0.85rem;margin-bottom:0.85rem;">
        <div style="font-size:0.84rem;font-weight:800;color:var(--text);margin-bottom:0.5rem;">
          📱 3. Opsi Lain (Direct USB & Bluetooth Android)
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" id="btn-modal-connect-usb">
            ${isUsbConnected ? '🟢 USB Terhubung' : '🔌 Hubungkan via WebUSB'}
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-modal-connect-bt">
            ${isBTConnected ? '🟢 Bluetooth Terhubung' : '📶 Hubungkan Bluetooth Android'}
          </button>
        </div>
      </div>

      <!-- Layout Selector Shortcut -->
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:0.8rem;">
        <div style="font-size:0.78rem;font-weight:800;color:var(--text);margin-bottom:0.35rem;">
          ⚙️ Format Layout Kertas Cetak Saat Ini:
        </div>
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
          <button class="btn ${currentLayout === 'thermal-58' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setPaperLayoutFromModal('thermal-58')">
            🧾 Thermal 58mm (Aktif)
          </button>
          <button class="btn ${currentLayout === 'thermal-80' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setPaperLayoutFromModal('thermal-80')">
            🧾 Thermal 80mm
          </button>
          <button class="btn ${!currentLayout.startsWith('thermal') ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="setPaperLayoutFromModal('25')">
            📄 Kertas A4 (25/hal)
          </button>
        </div>
      </div>

    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="closeModal()">Tutup</button>
    </div>
  `;

  openModal(html, 'modal-medium');
  on('btn-modal-connect-serial', handleConnectSerial);
  on('btn-modal-connect-usb', handleConnectUSB);
  on('btn-modal-connect-bt', handleConnectBluetooth);
}

function setPaperLayoutFromModal(layoutVal) {
  state.settings.layout = layoutVal;
  const layoutSelect = $id('layout-select');
  if (layoutSelect) layoutSelect.value = layoutVal;
  saveState();
  renderPreview();
  showToast(`Format kertas diubah ke: ${layoutVal.toUpperCase()}`);
  showThermalPrinterModal();
}

function testPrintThermal(widthMm = 58) {
  const layoutVal = `thermal-${widthMm}`;
  const testVoucher = {
    code: 'RJ-TEST99',
    paket: 'Paket 1 Hari',
    harga: '5000',
    periode: '24 Jam',
    speed: '10 Mbps',
    quota: 'Unlimited',
    printed: false,
    selected: false
  };

  const rawBytes = generateESCPOSVoucher(testVoucher, 1, state.settings);

  // 1. Try Serial first (best for CP-58B on PC)
  if (window.activeSerialPort) {
    sendRawESCPOSViaSerial(rawBytes).then(success => {
      if (success) {
        showToast('⚡ Berhasil test print via Port Serial CP-58B!');
      } else {
        triggerBrowserTestPrint(testVoucher, layoutVal, widthMm);
      }
    });
    return;
  }

  // 2. Try USB
  if (window.activeUsbDevice) {
    sendRawESCPOSViaUSB(rawBytes).then(success => {
      if (success) {
        showToast('⚡ Berhasil test print via Direct USB!');
      } else {
        triggerBrowserTestPrint(testVoucher, layoutVal, widthMm);
      }
    });
    return;
  }

  // 3. Fallback to Browser Print Dialog
  triggerBrowserTestPrint(testVoucher, layoutVal, widthMm);
}

function triggerBrowserTestPrint(testVoucher, layoutVal, widthMm) {
  const receiptHtml = buildThermalReceiptHTML(testVoucher, 1, state.settings, widthMm);
  printThermalPopout(receiptHtml, widthMm);
}

function printThermalPopout(receiptHtml, widthMm = 58) {
  const win = window.open('', '_blank', 'width=380,height=600,top=100,left=100');
  if (!win) {
    // If popup blocked, fallback to in-page print area
    const printArea = $id('print-area');
    if (printArea) {
      printArea.innerHTML = `<div class="print-page layout-thermal-${widthMm}">${receiptHtml}</div>`;
      preparePrintStyles(`thermal-${widthMm}`);
      window.print();
    }
    return;
  }

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Struk Voucher ${widthMm}mm</title>
      <meta charset="utf-8">
      <style>
        @page {
          size: ${widthMm === 80 ? '80mm 297mm' : '58mm 210mm'} !important;
          margin: 0mm !important;
        }
        @media print {
          html, body {
            width: ${widthMm}mm !important;
            max-width: ${widthMm}mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          .thermal-receipt-box {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 2mm 1mm !important;
            border: none !important;
            box-shadow: none !important;
          }
        }
        body {
          font-family: monospace, 'Courier New', Courier, sans-serif;
          margin: 0;
          padding: 2mm;
          background: #ffffff;
          color: #000000;
          width: ${widthMm}mm;
          box-sizing: border-box;
        }
      </style>
    </head>
    <body>
      ${receiptHtml}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.focus();
            window.print();
            setTimeout(function() { window.close(); }, 1000);
          }, 200);
        };
      </script>
    </body>
    </html>
  `);
  win.document.close();
  showToast(`🖨️ Membuka struk thermal roll ${widthMm}mm...`);
}

// ===== ⚡ DIRECT WEB SERIAL ENGINE (CP-58B / BLUETOOTH WINDOWS / COM PORT) =====
window.activeSerialPort = null;

async function handleConnectSerial() {
  if (window.activeSerialPort) {
    try {
      await window.activeSerialPort.close();
    } catch (e) {}
    window.activeSerialPort = null;
    showToast('Port Serial CP-58B diputuskan.');
    if ($id('modal-overlay')?.classList.contains('active')) {
      showThermalPrinterModal();
    }
    return;
  }

  if (!navigator.serial) {
    showToast('Web Serial API didukung di Google Chrome / Microsoft Edge di PC Windows.', 'warning');
    return;
  }

  try {
    showToast('Pilih Port CP-58B / Bluetooth Serial di daftar popup...');
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    window.activeSerialPort = port;

    const btn = $id('btn-thermal-printer-setup');
    if (btn) {
      btn.textContent = `⚡ CP-58B Serial`;
      btn.classList.add('btn-primary');
    }

    showToast('✅ Berhasil terhubung ke Port Serial CP-58B!');
    if ($id('modal-overlay')?.classList.contains('active')) {
      showThermalPrinterModal();
    }
  } catch (err) {
    console.warn('Serial connect error:', err);
    if (err.name !== 'NotFoundError') {
      showToast('Info Serial: ' + (err.message || 'Gunakan mode print biasa'), 'info');
    }
  }
}

async function sendRawESCPOSViaSerial(commandsUint8Array) {
  if (!window.activeSerialPort || !window.activeSerialPort.writable) return false;
  try {
    const writer = window.activeSerialPort.writable.getWriter();
    await writer.write(commandsUint8Array);
    writer.releaseLock();
    return true;
  } catch (err) {
    console.warn('Serial write error:', err);
    return false;
  }
}

function generateESCPOSVoucher(v, num, settings) {
  const encoder = new TextEncoder();
  const ESC = 0x1B;
  const GS = 0x1D;

  const init = [ESC, 0x40];
  const alignCenter = [ESC, 0x61, 0x01];
  const alignLeft = [ESC, 0x61, 0x00];
  const boldOn = [ESC, 0x45, 0x01];
  const boldOff = [ESC, 0x45, 0x00];
  const doubleHeightOn = [GS, 0x21, 0x10];
  const doubleSizeOn = [GS, 0x21, 0x11];
  const normalSize = [GS, 0x21, 0x00];
  const cutPaper = [GS, 0x56, 0x41, 0x03];

  const storeName = (state.presets.find(p => p.id === state.activePresetId) || DEFAULT_PRESET).name || 'WIFI HOTSPOT';
  const ssid = settings.ssid || 'Hotspot';
  const sn = String(num).padStart(3, '0');

  let bytes = [...init, ...alignCenter, ...boldOn, ...doubleHeightOn];
  bytes.push(...encoder.encode(storeName + '\n'));
  bytes.push(...normalSize, ...boldOff);
  bytes.push(...encoder.encode('SSID: ' + ssid + '\n'));
  bytes.push(...encoder.encode('--------------------------------\n'));

  bytes.push(...alignLeft);
  bytes.push(...encoder.encode(`#${sn}  ${v.paket || 'VOUCHER'}  Rp ${formatNumber(v.harga || 0)}\n`));
  bytes.push(...alignCenter);
  bytes.push(...encoder.encode('================================\n'));
  bytes.push(...encoder.encode('KODE VOUCHER / PASSWORD:\n'));
  bytes.push(...boldOn, ...doubleSizeOn);
  bytes.push(...encoder.encode(v.code + '\n'));
  bytes.push(...normalSize, ...boldOff);
  bytes.push(...encoder.encode('================================\n'));

  bytes.push(...alignLeft);
  bytes.push(...encoder.encode(`Masa Aktif : ${v.periode || '-'}\n`));
  if (settings.showSpeed && v.speed) bytes.push(...encoder.encode(`Kecepatan  : ${v.speed}\n`));
  if (settings.showQuota && v.quota) bytes.push(...encoder.encode(`Kuota      : ${v.quota}\n`));
  if (settings.showHint && settings.loginHint) {
    bytes.push(...encoder.encode('--------------------------------\n'));
    bytes.push(...alignCenter, ...encoder.encode(settings.loginHint + '\n'));
  }
  bytes.push(...encoder.encode('--------------------------------\n'));
  bytes.push(...alignCenter, ...encoder.encode('Terima Kasih • Selamat Berinternet\n\n\n'));
  bytes.push(...cutPaper);

  return new Uint8Array(bytes);
}

// ===== DIRECT WEB BLUETOOTH PRINTING (ESC/POS) =====
async function handleConnectBluetooth() {
  if (!requirePro('Koneksi Printer Bluetooth POS')) return;

  if (!navigator.bluetooth) {
    showToast('Web Bluetooth API hanya didukung di Google Chrome Android / Laptop dengan Bluetooth aktif.', 'warning');
    return;
  }

  try {
    showToast('Mencari printer Bluetooth thermal...');
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', 0xFFE0]
    });

    state.bluetoothDevice = device;
    const btn = $id('btn-thermal-printer-setup');
    if (btn) {
      btn.textContent = `📶 ${device.name || 'Printer POS'}`;
      btn.classList.add('btn-primary');
    }
    showToast(`Berhasil terhubung ke: ${device.name || 'Printer Bluetooth'}`);
    if ($id('modal-overlay')?.classList.contains('active')) {
      showThermalPrinterModal();
    }
  } catch (err) {
    console.warn('Bluetooth connect error:', err);
    if (err.name !== 'NotFoundError') {
      showToast('Gagal menghubungkan printer Bluetooth.', 'error');
    }
  }
}

// ===== BACKGROUND CARD IMAGE =====
function handleBgUpload(e) {
  if (!requirePro('Custom Background Gambar')) {
    e.target.value = '';
    return;
  }

  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    state.settings.bgImage = evt.target.result;
    const wrap = $id('bg-opacity-wrap');
    if (wrap) wrap.style.display = 'block';
    saveState();
    renderPreview();
    showToast('Background gambar berhasil diterapkan!');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function removeBackground() {
  state.settings.bgImage = null;
  const wrap = $id('bg-opacity-wrap');
  if (wrap) wrap.style.display = 'none';
  saveState();
  renderPreview();
  showToast('Background gambar dihapus');
}

// ===== POS CASHIER SHIFT MANAGEMENT =====
function showShiftModal() {
  const shift = state.activeShift || {};
  const sDate = new Date(shift.startTime || Date.now());
  const formattedStart = `${sDate.toLocaleDateString('id-ID')} ${sDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

  const html = `
    <div class="modal-header">
      <h3>🚪 Manajemen Shift Kasir POS</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
    </div>
    <div class="modal-body">
      <div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius-xs);padding:1rem;margin-bottom:1.15rem;">
        <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;">
          <span style="color:var(--text-secondary);">Kasir Aktif:</span>
          <strong>${esc(shift.cashierName || 'Umum')}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;">
          <span style="color:var(--text-secondary);">Mulai Shift:</span>
          <span>${formattedStart}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;">
          <span style="color:var(--text-secondary);">Modal Kas Awal:</span>
          <strong>Rp ${formatNumber(shift.startCash || 0)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;border-top:1px dashed var(--border);padding-top:0.5rem;margin-top:0.5rem;">
          <span style="color:var(--text-secondary);">Voucher Terjual Shift Ini:</span>
          <strong style="color:var(--success);">${shift.salesCount || 0} pcs</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:0.25rem;">
          <span style="color:var(--text-secondary);">Omset Kasir Shift Ini:</span>
          <strong style="color:var(--primary);font-size:1.15rem;">Rp ${formatNumber(shift.salesOmset || 0)}</strong>
        </div>
      </div>

      <div class="modal-form">
        <div class="form-group">
          <label for="m-shift-cashier">Ganti Nama Kasir / Buka Shift Baru</label>
          <input type="text" id="m-shift-cashier" class="form-input" value="${esc(shift.cashierName || 'Kasir 1')}" placeholder="Nama Kasir">
        </div>
        <div class="form-group">
          <label for="m-shift-start-cash">Modal Kas Awal (Rp)</label>
          <input type="number" id="m-shift-start-cash" class="form-input" value="${shift.startCash || 50000}">
        </div>
      </div>
    </div>
    <div class="modal-footer" style="justify-content:space-between;">
      <button class="btn btn-secondary" onclick="closeModal()">Tutup</button>
      <div style="display:flex;gap:0.45rem;">
        <button class="btn btn-secondary" id="btn-print-close-shift">🖨️ Cetak Struk Tutup Shift</button>
        <button class="btn btn-primary" id="btn-save-open-shift">✨ Buka / Mulai Shift Baru</button>
      </div>
    </div>
  `;

  openModal(html);

  on('btn-save-open-shift', () => {
    state.activeShift = {
      id: 'shift_' + Date.now(),
      cashierName: ($id('m-shift-cashier')?.value || '').trim() || 'Kasir',
      startTime: new Date().toISOString(),
      startCash: parseFloat($id('m-shift-start-cash')?.value) || 0,
      salesCount: 0,
      salesOmset: 0,
      closed: false
    };
    logActivity('SHIFT', `Buka shift baru untuk kasir: ${state.activeShift.cashierName} (Modal Rp ${formatNumber(state.activeShift.startCash)})`);
    saveState();
    setText('pos-cashier-name', state.activeShift.cashierName);
    closeModal();
    showToast(`Shift dibuka untuk kasir: ${state.activeShift.cashierName}`);
  });

  on('btn-print-close-shift', printCloseShiftReceipt);
}

function printCloseShiftReceipt() {
  const shift = state.activeShift || {};
  const activePreset = state.presets.find(p => p.id === state.activePresetId) || DEFAULT_PRESET;
  const sDate = new Date(shift.startTime || Date.now());
  const now = new Date();

  logActivity('SHIFT', `Tutup shift kasir: ${shift.cashierName} (Omset Rp ${formatNumber(shift.salesOmset)}, ${shift.salesCount} pcs)`);

  const receiptHtml = `
    <div style="font-family:monospace;font-size:12px;width:280px;margin:0 auto;padding:10px;line-height:1.4;color:#000;">
      <div style="text-align:center;border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;">
        <div style="font-size:15px;font-weight:bold;">${esc(activePreset.name)}</div>
        <div>WiFi: ${esc(state.settings.ssid || 'Hotspot')}</div>
        <div style="font-size:10px;margin-top:4px;">*** STRUK TUTUP SHIFT KASIR ***</div>
        <div style="font-size:10px;">Kasir: ${esc(shift.cashierName || 'Umum')}</div>
        <div style="font-size:10px;">Mulai: ${sDate.toLocaleTimeString('id-ID')} • Tutup: ${now.toLocaleTimeString('id-ID')}</div>
      </div>

      <div style="border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;">
          <span>Modal Kas Awal:</span>
          <span>Rp ${formatNumber(shift.startCash || 0)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span>Voucher Terjual:</span>
          <span>${shift.salesCount || 0} pcs</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-weight:bold;margin-top:4px;">
          <span>Omset Voucher:</span>
          <span>Rp ${formatNumber(shift.salesOmset || 0)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold;border-top:1px dashed #000;padding-top:4px;margin-top:4px;">
          <span>TOTAL SETORAN KAS:</span>
          <span>Rp ${formatNumber((shift.startCash || 0) + (shift.salesOmset || 0))}</span>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;margin-top:25px;text-align:center;font-size:10px;">
        <div style="width:100px;">
          <div>Kasir Bertugas,</div>
          <div style="height:35px;"></div>
          <div>( ${esc(shift.cashierName || 'Kasir')} )</div>
        </div>
        <div style="width:100px;">
          <div>Owner / Manager,</div>
          <div style="height:35px;"></div>
          <div>( ..................... )</div>
        </div>
      </div>
    </div>
  `;

  const printArea = $id('print-area');
  if (printArea) {
    printArea.innerHTML = receiptHtml;
    preparePrintStyles('receipt');
    window.print();
  }
}

// ===== 📄 EXPORT PDF =====
function exportPDF() {
  if (!requirePro('Export Lembar Cetak PDF')) return;

  const selected = getSelectedVouchers();
  if (selected.length === 0 && state.vouchers.length > 0) {
    showToast('Pilih voucher dengan mencentang kotak ceklis terlebih dahulu.', 'error');
    return;
  }

  showToast('Membuka dialog Export PDF (Pilih "Save as PDF" di printer dialog)...');
  const layoutVal = state.settings.layout || '25';
  const toPrint = selected.length > 0 ? selected : state.vouchers;
  buildPrintArea(toPrint, layoutVal);

  setTimeout(() => {
    window.print();
  }, 100);
}

// ===== 🖼️ EXPORT PNG =====
function exportPreviewAsPNG() {
  const selected = getSelectedVouchers();
  if (selected.length === 0 && state.vouchers.length > 0) {
    showToast('Pilih minimal 1 voucher untuk diekspor ke gambar.', 'error');
    return;
  }

  showToast('Menyiapkan file gambar siap cetak...');

  const previewPage = document.querySelector('.preview-page');
  if (!previewPage) return;

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1700;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">
          ${previewPage.outerHTML}
        </div>
      </foreignObject>
    </svg>
  `);

  img.onload = () => {
    ctx.drawImage(img, 0, 0);
    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `lembar_voucher_${state.settings.layout}_${Date.now()}.png`;
    link.href = pngUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Lembar voucher PNG berhasil didownload!');
  };

  img.onerror = () => {
    window.print();
  };
}

// ===== ⚡ QUICK POS CASHIER PRINT ENGINE =====
function renderQuickPOSGrid() {
  const container = $id('quick-pos-grid');
  if (!container) return;

  const pkgMap = {};
  state.vouchers.forEach(v => {
    const pkg = v.paket || 'Reguler';
    if (!pkgMap[pkg]) {
      pkgMap[pkg] = { name: pkg, harga: v.harga || '0', unprintedCount: 0, totalCount: 0 };
    }
    pkgMap[pkg].totalCount++;
    if (!v.printed) {
      pkgMap[pkg].unprintedCount++;
    }
  });

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  let todayCount = 0;
  let todayOmset = 0;

  state.vouchers.forEach(v => {
    if (v.printed && v.printedAt) {
      const pDate = new Date(v.printedAt);
      if (!isNaN(pDate.getTime()) && pDate >= startToday) {
        todayCount++;
        todayOmset += parseFloat(String(v.harga).replace(/[^\d.]/g, '')) || 0;
      }
    }
  });

  setText('pos-today-count', todayCount);
  setText('pos-today-omset', `Rp ${formatNumber(todayOmset)}`);
  setText('pos-cashier-name', (state.activeShift && state.activeShift.cashierName) || 'Umum');

  const pkgs = Object.values(pkgMap);
  if (pkgs.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;color:var(--text-muted);font-size:0.85rem;padding:0.75rem;">
        Belum ada paket voucher. Klik tombol <strong>"📁 Import File Ruijie"</strong> atau <strong>"＋ Tambah"</strong> untuk mulai.
      </div>
    `;
    return;
  }

  container.innerHTML = pkgs.map(p => {
    let badgeClass = '';
    let badgeText = `📦 Sisa: ${p.unprintedCount} pcs`;

    if (p.unprintedCount === 0) {
      badgeClass = 'empty';
      badgeText = '❌ Habis';
    } else if (p.unprintedCount <= 3) {
      badgeClass = 'warning';
      badgeText = `⚠️ Kritis: ${p.unprintedCount} pcs`;
    }

    return `
      <button class="btn-pos-pkg" data-pkg="${esc(p.name)}" ${p.unprintedCount === 0 ? 'disabled' : ''}>
        <div class="pos-pkg-name">⚡ ${esc(p.name)}</div>
        <div class="pos-pkg-price">Rp ${formatNumber(p.harga)}</div>
        <div class="pos-pkg-stock-badge ${badgeClass}">${badgeText}</div>
      </button>
    `;
  }).join('');

  container.querySelectorAll('.btn-pos-pkg').forEach(btn => {
    btn.addEventListener('click', () => {
      const pkgName = btn.dataset.pkg;
      quickPrintPackage(pkgName, 1);
    });
  });
}

function quickPrintPackage(pkgName, qty = 1) {
  const matches = state.vouchers.filter(v => !v.printed && (v.paket || 'Reguler') === pkgName);
  if (matches.length === 0) {
    showToast(`Stok voucher ${pkgName} habis! Silakan import voucher baru.`, 'error');
    return;
  }

  const toPrint = matches.slice(0, qty);
  toPrint.forEach(v => {
    v.printed = true;
    v.printedAt = new Date().toISOString();
    v.selected = false;
    const priceVal = parseFloat(String(v.harga).replace(/[^\d.]/g, '')) || 0;
    if (state.activeShift) {
      state.activeShift.salesCount = (state.activeShift.salesCount || 0) + 1;
      state.activeShift.salesOmset = (state.activeShift.salesOmset || 0) + priceVal;
    }
    logActivity('PRINT_POS', `Cetak POS 1x [${v.code}] ${pkgName} (Rp ${formatNumber(v.harga)})`);
  });

  const layoutVal = (state.settings.layout && state.settings.layout.startsWith('thermal')) ? state.settings.layout : 'thermal-58';
  saveState();
  checkStockAlerts();
  triggerBackgroundAutoSync();

  // 1. Direct Serial (CP-58B)
  if (window.activeSerialPort) {
    toPrint.forEach((v, idx) => {
      const rawBytes = generateESCPOSVoucher(v, idx + 1, state.settings);
      sendRawESCPOSViaSerial(rawBytes);
    });
    renderQuickPOSGrid();
    renderTable();
    renderPreview();
    showToast(`⚡ Berhasil cetak 1 voucher ${pkgName} via CP-58B Serial!`);
    return;
  }

  // 2. Direct USB
  if (window.activeUsbDevice) {
    toPrint.forEach((v, idx) => {
      const rawBytes = generateESCPOSVoucher(v, idx + 1, state.settings);
      sendRawESCPOSViaUSB(rawBytes);
    });
    renderQuickPOSGrid();
    renderTable();
    renderPreview();
    showToast(`⚡ Berhasil cetak 1 voucher ${pkgName} via Direct USB!`);
    return;
  }

  // 3. Fallback to Browser Thermal Popout Window (100% True 58mm/80mm, No A4)
  const is80 = layoutVal === 'thermal-80';
  const widthMm = is80 ? 80 : 58;
  const receiptHtml = toPrint.map((v, idx) => buildThermalReceiptHTML(v, idx + 1, state.settings, widthMm)).join('');
  printThermalPopout(receiptHtml, widthMm);

  renderQuickPOSGrid();
  renderTable();
  renderPreview();
}

// ===== RESELLER & AGENT MANAGEMENT =====
function renderResellerFilterSelect() {
  const select = $id('filter-reseller-select');
  if (!select) return;

  let options = `<option value="all">Semua Reseller / Warung</option><option value="direct">Tanpa Reseller (Langsung)</option>`;
  state.resellers.forEach(r => {
    options += `<option value="${r.id}" ${state.filterReseller === r.id ? 'selected' : ''}>🏪 ${esc(r.name)}</option>`;
  });
  select.innerHTML = options;
}

function showResellerModal() {
  if (!requirePro('Manajemen Reseller & Surat Jalan')) return;

  const resellerStats = {};
  state.resellers.forEach(r => {
    resellerStats[r.id] = { reseller: r, totalVouchers: 0, printedVouchers: 0, unprintedVouchers: 0, totalOmset: 0 };
  });

  state.vouchers.forEach(v => {
    if (v.resellerId && resellerStats[v.resellerId]) {
      const s = resellerStats[v.resellerId];
      s.totalVouchers++;
      const p = parseFloat(String(v.harga).replace(/[^\d.]/g, '')) || 0;
      s.totalOmset += p;
      if (v.printed) s.printedVouchers++;
      else s.unprintedVouchers++;
    }
  });

  const cardsHtml = state.resellers.map(r => {
    const s = resellerStats[r.id] || { totalVouchers: 0, printedVouchers: 0, unprintedVouchers: 0, totalOmset: 0 };
    return `
      <div class="reseller-card" id="reseller-card-${r.id}">
        <div class="reseller-card-header">
          <div class="reseller-name">🏪 ${esc(r.name)}</div>
          <span class="badge" style="background:var(--primary-light);color:var(--primary);font-size:0.72rem;font-weight:800;">
            ${s.totalVouchers} pcs Dititip
          </span>
        </div>
        <div class="reseller-meta">
          <div>📞 <strong>${esc(r.phone || '-')}</strong> • 📍 ${esc(r.address || '-')}</div>
          ${r.note ? `<div style="font-style:italic;color:var(--text-muted);margin-top:2px;">📝 ${esc(r.note)}</div>` : ''}
        </div>
        <div class="reseller-stat-row">
          <span>Stok Dititip: <strong>${s.totalVouchers} pcs</strong></span>
          <span style="color:var(--success);">Terjual: <strong>${s.printedVouchers} pcs</strong></span>
          <span style="color:var(--warning);">Sisa: <strong>${s.unprintedVouchers} pcs</strong></span>
        </div>
        <div class="reseller-stat-row">
          <span>Total Nilai Titipan:</span>
          <strong style="color:var(--primary);font-size:0.92rem;">Rp ${formatNumber(s.totalOmset)}</strong>
        </div>
        <div class="reseller-card-actions" style="grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));">
          <button class="btn btn-primary btn-sm" onclick="showAssignResellerModal('${r.id}')" title="Titip voucher ke warung ini">
            ⚡ Titip Voucher
          </button>
          <button class="btn btn-secondary btn-sm" onclick="printResellerVouchers('${r.id}')" title="Cetak lembaran voucher untuk warung ini">
            🖨️ Cetak Voucher
          </button>
          <button class="btn btn-secondary btn-sm" onclick="printSuratJalan('${r.id}')" title="Cetak Surat Jalan Tanda Terima">
            📄 Surat Jalan
          </button>
          <button class="btn btn-secondary btn-sm" onclick="showEditResellerForm('${r.id}')" title="Edit Data Warung">
            ✏️ Edit Profil
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteReseller('${r.id}')" title="Hapus Warung">
            🗑️ Hapus
          </button>
        </div>
      </div>
    `;
  }).join('');

  const html = `
    <div class="modal-header">
      <h3>🏪 Manajemen Reseller & Titip Warung</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.85rem;flex-wrap:wrap;gap:0.5rem;">
        <p style="font-size:0.82rem;color:var(--text-secondary);margin:0;">
          Kelola mitra warung/agen, titip voucher otomatis per jumlah, dan cetak langsung lembaran/surat jalan.
        </p>
        <div style="display:flex;gap:0.4rem;">
          <button class="btn btn-secondary btn-sm" onclick="showAssignResellerModal()">⚡ Titip Cepat per Jumlah</button>
          <button class="btn btn-primary btn-sm" id="btn-add-new-reseller">＋ Tambah Reseller</button>
        </div>
      </div>

      <div class="reseller-card-grid">
        ${cardsHtml || '<div style="color:var(--text-muted);padding:1.5rem;text-align:center;background:var(--surface-alt);border-radius:var(--radius-xs);border:1px dashed var(--border);">Belum ada reseller. Klik "Tambah Reseller" untuk mulai mendaftarkan warung mitra.</div>'}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="closeModal()">Tutup</button>
    </div>
  `;

  openModal(html, 'modal-wide');
  on('btn-add-new-reseller', showAddResellerForm);
}

function showAddResellerForm() {
  const html = `
    <div class="modal-header">
      <h3>Tambah Reseller / Warung Baru</h3>
      <button class="btn-icon" onclick="showResellerModal()" title="Kembali">✕</button>
    </div>
    <div class="modal-body">
      <div class="modal-form">
        <div class="form-group">
          <label for="m-res-name">Nama Warung / Agen *</label>
          <input type="text" id="m-res-name" class="form-input" placeholder="Contoh: Warung Bu Ani / Kios Pojok" autofocus>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="m-res-phone">No. WhatsApp / HP</label>
            <input type="text" id="m-res-phone" class="form-input" placeholder="Contoh: 08123456789">
          </div>
          <div class="form-group">
            <label for="m-res-address">Alamat / Lokasi</label>
            <input type="text" id="m-res-address" class="form-input" placeholder="Contoh: Jl. Melati No. 12">
          </div>
        </div>
        <div class="form-group">
          <label for="m-res-note">Catatan / Perjanjian Bagi Hasil</label>
          <input type="text" id="m-res-note" class="form-input" placeholder="Contoh: Fee warung Rp 500/voucher, setoran mingguan">
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="showResellerModal()">Batal</button>
      <button class="btn btn-primary" id="btn-save-reseller">Simpan Reseller</button>
    </div>
  `;

  openModal(html);

  on('btn-save-reseller', () => {
    const name = ($id('m-res-name')?.value || '').trim();
    if (!name) {
      showToast('Nama reseller wajib diisi', 'error');
      $id('m-res-name')?.focus();
      return;
    }

    const newRes = {
      id: 'res_' + Date.now(),
      name: name,
      phone: ($id('m-res-phone')?.value || '').trim(),
      address: ($id('m-res-address')?.value || '').trim(),
      note: ($id('m-res-note')?.value || '').trim()
    };

    state.resellers.push(newRes);
    logActivity('RESELLER_ADD', `Menambah reseller baru: ${name}`);
    saveState();
    renderResellerFilterSelect();
    showToast(`Reseller "${name}" berhasil ditambahkan!`);
    showResellerModal();
  });
}

function showEditResellerForm(resellerId) {
  const reseller = state.resellers.find(r => r.id === resellerId);
  if (!reseller) return;

  const html = `
    <div class="modal-header">
      <h3>✏️ Edit Profil Reseller / Warung</h3>
      <button class="btn-icon" onclick="showResellerModal()" title="Kembali">✕</button>
    </div>
    <div class="modal-body">
      <div class="modal-form">
        <div class="form-group">
          <label for="m-edit-res-name">Nama Warung / Agen *</label>
          <input type="text" id="m-edit-res-name" class="form-input" value="${esc(reseller.name)}" required autofocus>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="m-edit-res-phone">No. WhatsApp / HP</label>
            <input type="text" id="m-edit-res-phone" class="form-input" value="${esc(reseller.phone || '')}" placeholder="Contoh: 08123456789">
          </div>
          <div class="form-group">
            <label for="m-edit-res-address">Alamat / Lokasi</label>
            <input type="text" id="m-edit-res-address" class="form-input" value="${esc(reseller.address || '')}" placeholder="Contoh: Jl. Melati No. 12">
          </div>
        </div>
        <div class="form-group">
          <label for="m-edit-res-note">Catatan / Perjanjian Bagi Hasil</label>
          <input type="text" id="m-edit-res-note" class="form-input" value="${esc(reseller.note || '')}" placeholder="Contoh: Fee warung Rp 500/voucher, setoran tiap Sabtu">
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="showResellerModal()">Batal</button>
      <button class="btn btn-primary" id="btn-update-reseller">Simpan Perubahan</button>
    </div>
  `;

  openModal(html);

  on('btn-update-reseller', () => {
    const updatedName = ($id('m-edit-res-name')?.value || '').trim();
    if (!updatedName) {
      showToast('Nama reseller wajib diisi!', 'error');
      $id('m-edit-res-name')?.focus();
      return;
    }

    reseller.name = updatedName;
    reseller.phone = ($id('m-edit-res-phone')?.value || '').trim();
    reseller.address = ($id('m-edit-res-address')?.value || '').trim();
    reseller.note = ($id('m-edit-res-note')?.value || '').trim();

    // Synchronize resellerName on all assigned vouchers
    state.vouchers.forEach(v => {
      if (v.resellerId === resellerId) {
        v.resellerName = updatedName;
      }
    });

    logActivity('RESELLER_EDIT', `Mengubah data reseller: ${updatedName}`);
    saveState();
    renderResellerFilterSelect();
    renderTable();
    showToast(`Profil reseller "${updatedName}" berhasil diperbarui!`);
    showResellerModal();
  });
}

function deleteReseller(resellerId) {
  const reseller = state.resellers.find(r => r.id === resellerId);
  if (!reseller) return;

  const assignedCount = state.vouchers.filter(v => v.resellerId === resellerId).length;

  let confirmMsg = `Yakin ingin menghapus profil reseller "🏪 ${reseller.name}"?`;
  if (assignedCount > 0) {
    confirmMsg += `\n\n⚠️ Terdapat ${assignedCount} voucher yang saat ini berstatus dititipkan ke warung ini. Voucher tersebut akan dikembalikan ke status stok utama (Langsung / Unassigned).`;
  }

  if (!confirm(confirmMsg)) return;

  // Unassign vouchers
  state.vouchers.forEach(v => {
    if (v.resellerId === resellerId) {
      v.resellerId = null;
      v.resellerName = null;
    }
  });

  // Remove reseller
  state.resellers = state.resellers.filter(r => r.id !== resellerId);
  if (state.filterReseller === resellerId) {
    state.filterReseller = 'all';
  }

  logActivity('RESELLER_DELETE', `Menghapus reseller ${reseller.name} (${assignedCount} voucher dikembalikan ke stok utama)`);
  saveState();
  renderResellerFilterSelect();
  renderTable();
  renderPreview();
  showToast(`Reseller "${reseller.name}" berhasil dihapus.`);
  showResellerModal();
}

function printResellerVouchers(resellerId, customVouchers = null) {
  const reseller = state.resellers.find(r => r.id === resellerId);
  const layoutVal = state.settings.layout || '25';

  let toPrint = customVouchers;
  if (!toPrint || toPrint.length === 0) {
    toPrint = state.vouchers.filter(v => v.resellerId === resellerId && !v.printed);
    if (toPrint.length === 0) {
      toPrint = state.vouchers.filter(v => v.resellerId === resellerId);
    }
  }

  if (!toPrint || toPrint.length === 0) {
    showToast(`Tidak ada voucher untuk warung "${reseller ? reseller.name : 'Reseller'}" yang bisa dicetak.`, 'error');
    return;
  }

  closeModal();

  buildPrintArea(toPrint, layoutVal);

  toPrint.forEach(v => {
    v.printed = true;
    v.printedAt = new Date().toISOString();
  });

  logActivity('PRINT_RESELLER', `Cetak ${toPrint.length} voucher titipan untuk ${reseller ? reseller.name : 'Warung'}`);
  saveState();
  checkStockAlerts();
  triggerBackgroundAutoSync();

  setTimeout(() => {
    window.print();
    renderQuickPOSGrid();
    renderTable();
    renderPreview();
    showToast(`🖨️ Berhasil mencetak ${toPrint.length} voucher titipan untuk "🏪 ${reseller ? reseller.name : 'Warung'}"!`);
  }, 120);
}

function showAssignResellerModal(preSelectedResellerId = null) {
  if (!requirePro('Titip Voucher ke Warung Reseller')) return;

  if (state.resellers.length === 0) {
    showToast('Belum ada data warung/reseller. Silakan tambah reseller terlebih dahulu.', 'warning');
    showAddResellerForm();
    return;
  }

  const checkedVouchers = getSelectedVouchers();
  const hasManualChecked = checkedVouchers.length > 0;

  // Distinct packages for filtering
  const distinctPackages = Array.from(new Set(state.vouchers.map(v => v.paket || 'Reguler'))).filter(Boolean);

  const resellerOptionsHtml = state.resellers.map(r => `
    <option value="${r.id}" ${preSelectedResellerId === r.id ? 'selected' : ''}>
      🏪 ${esc(r.name)} (${esc(r.phone || '-')})
    </option>
  `).join('');

  const packageOptionsHtml = distinctPackages.map(pkg => `
    <option value="${esc(pkg)}">Paket: ${esc(pkg)}</option>
  `).join('');

  const html = `
    <div class="modal-header">
      <h3>⚡ Alokasi Titip Voucher ke Warung / Reseller</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
    </div>
    <div class="modal-body">
      <!-- Mode Tabs -->
      <div style="display:flex;gap:0.5rem;margin-bottom:1rem;border-bottom:1px solid var(--border);padding-bottom:0.5rem;">
        <button class="filter-tab ${!hasManualChecked ? 'active' : ''}" id="tab-assign-batch" style="font-size:0.8rem;">
          ⚡ Alokasi Cepat (Berapa Voucher)
        </button>
        <button class="filter-tab ${hasManualChecked ? 'active' : ''}" id="tab-assign-checked" style="font-size:0.8rem;">
          📋 Dari Centang Tabel (${checkedVouchers.length} Terpilih)
        </button>
      </div>

      <!-- Reseller Target Selector -->
      <div class="form-group" style="margin-bottom:0.85rem;">
        <label for="m-assign-reseller-target" style="font-weight:750;">Pilih Warung / Reseller Tujuan *</label>
        <select id="m-assign-reseller-target" class="form-input" style="font-weight:750;">
          ${resellerOptionsHtml}
        </select>
      </div>

      <!-- Section A: Batch Quantity Allocation (No Manual Clicks Required!) -->
      <div id="section-assign-batch" style="display:${!hasManualChecked ? 'block' : 'none'};background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius-xs);padding:0.9rem;margin-bottom:1rem;">
        <div style="font-size:0.84rem;font-weight:800;color:var(--primary);margin-bottom:0.6rem;">
          📦 Alokasi Otomatis Berdasarkan Jumlah Voucher:
        </div>

        <div class="form-row" style="margin-bottom:0.6rem;">
          <div class="form-group">
            <label for="m-assign-pkg-filter" style="font-size:0.76rem;font-weight:750;">Filter Paket Voucher</label>
            <select id="m-assign-pkg-filter" class="form-input">
              <option value="all">Semua Paket</option>
              ${packageOptionsHtml}
            </select>
          </div>
          <div class="form-group">
            <label for="m-assign-status-filter" style="font-size:0.76rem;font-weight:750;">Ambil Dari Voucher</label>
            <select id="m-assign-status-filter" class="form-input">
              <option value="unassigned_unprinted" selected>Belum Dititip & Belum Terjual</option>
              <option value="unassigned_all">Semua yang Belum Dititip</option>
              <option value="all_unprinted">Semua yang Belum Terjual</option>
            </select>
          </div>
        </div>

        <div class="form-group" style="margin-bottom:0.6rem;">
          <label for="m-assign-qty-input" style="font-size:0.76rem;font-weight:750;">
            Jumlah Voucher yang Ingin Dititipkan (pcs) *
          </label>
          <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap;">
            <input type="number" id="m-assign-qty-input" class="form-input" min="1" value="25" style="max-width:110px;font-size:1.05rem;font-weight:850;text-align:center;">
            <button class="btn btn-secondary btn-sm" onclick="$id('m-assign-qty-input').value = 10; updateBatchAssignInfo();">10 pcs</button>
            <button class="btn btn-secondary btn-sm" onclick="$id('m-assign-qty-input').value = 25; updateBatchAssignInfo();">25 pcs</button>
            <button class="btn btn-secondary btn-sm" onclick="$id('m-assign-qty-input').value = 50; updateBatchAssignInfo();">50 pcs</button>
            <button class="btn btn-secondary btn-sm" onclick="$id('m-assign-qty-input').value = 100; updateBatchAssignInfo();">100 pcs</button>
            <button class="btn btn-secondary btn-sm" id="btn-assign-all-avail">Semua Sisa</button>
          </div>
        </div>

        <!-- Live Stock & Omset Info -->
        <div id="m-assign-live-info" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:0.6rem 0.8rem;font-size:0.78rem;color:#1e40af;line-height:1.4;">
          <!-- Will be updated dynamically -->
        </div>
      </div>

      <!-- Section B: From Table Checkboxes -->
      <div id="section-assign-checked" style="display:${hasManualChecked ? 'block' : 'none'};background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius-xs);padding:0.9rem;margin-bottom:1rem;">
        <div style="font-size:0.84rem;font-weight:800;color:var(--primary);margin-bottom:0.4rem;">
          📋 Titipkan Baris yang Dicentang:
        </div>
        <p style="font-size:0.82rem;color:var(--text);margin:0;">
          Anda sedang memilih <strong>${checkedVouchers.length}</strong> voucher dari tabel.
        </p>
      </div>

      <!-- Action: Reset / Tarik Kembali ke Stok Utama -->
      <div style="background:var(--surface);border:1px dashed var(--border);border-radius:var(--radius-xs);padding:0.6rem 0.8rem;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:0.75rem;color:var(--text-secondary);">Ingin menarik kembali voucher dari warung?</span>
        <button class="btn btn-secondary btn-sm" id="btn-unassign-reseller" style="font-size:0.72rem;color:var(--danger);">
          ↩️ Tarik Kembali ke Stok Utama
        </button>
      </div>
    </div>
    <div class="modal-footer" style="justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
      <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <div style="display:flex;gap:0.45rem;flex-wrap:wrap;">
        <button class="btn btn-secondary" id="btn-execute-assign-surat-jalan" style="font-weight:750;" title="Simpan titipan dan langsung cetak Surat Jalan">
          📄 Simpan & Cetak Surat Jalan
        </button>
        <button class="btn btn-secondary" id="btn-execute-assign-print" style="font-weight:750;" title="Simpan titipan dan langsung cetak Lembar Voucher">
          🖨️ Simpan & Langsung Cetak Voucher
        </button>
        <button class="btn btn-primary" id="btn-execute-assign" style="font-weight:800;">
          ⚡ Simpan Saja
        </button>
      </div>
    </div>
  `;

  openModal(html, 'modal-medium');

  let activeTab = hasManualChecked ? 'checked' : 'batch';

  const tabBatch = $id('tab-assign-batch');
  const tabChecked = $id('tab-assign-checked');
  const secBatch = $id('section-assign-batch');
  const secChecked = $id('section-assign-checked');
  const pkgFilter = $id('m-assign-pkg-filter');
  const statusFilter = $id('m-assign-status-filter');
  const qtyInput = $id('m-assign-qty-input');
  const liveInfo = $id('m-assign-live-info');

  function getAvailableCandidates() {
    const selectedPkg = pkgFilter?.value || 'all';
    const selectedStatus = statusFilter?.value || 'unassigned_unprinted';

    return state.vouchers.filter(v => {
      // Package filter
      if (selectedPkg !== 'all' && (v.paket || 'Reguler') !== selectedPkg) return false;

      // Status filter
      if (selectedStatus === 'unassigned_unprinted') {
        return !v.resellerId && !v.printed;
      } else if (selectedStatus === 'unassigned_all') {
        return !v.resellerId;
      } else if (selectedStatus === 'all_unprinted') {
        return !v.printed;
      }
      return true;
    });
  }

  function updateBatchAssignInfo() {
    if (!liveInfo) return;
    const candidates = getAvailableCandidates();
    const qty = parseInt(qtyInput?.value || '0', 10);
    const targetResId = $id('m-assign-reseller-target')?.value;
    const targetRes = state.resellers.find(r => r.id === targetResId);

    const actualAssign = Math.min(qty, candidates.length);
    let sampleVal = 0;
    for (let i = 0; i < actualAssign; i++) {
      sampleVal += parseFloat(String(candidates[i].harga).replace(/[^\d.]/g, '')) || 0;
    }

    liveInfo.innerHTML = `
      <div>📦 <strong>Tersedia:</strong> ${candidates.length} voucher siap dititipkan.</div>
      <div>🏪 <strong>Target Warung:</strong> ${targetRes ? esc(targetRes.name) : '-'}</div>
      <div>⚡ <strong>Akan Dititipkan:</strong> ${actualAssign} voucher (Estimasi Nilai Titipan: <strong>Rp ${formatNumber(sampleVal)}</strong>)</div>
    `;

    if (candidates.length === 0) {
      liveInfo.innerHTML = `<span style="color:#b91c1c;">⚠️ Tidak ada voucher yang sesuai dengan filter di atas. Import atau tambah voucher terlebih dahulu.</span>`;
    }
  }

  window.updateBatchAssignInfo = updateBatchAssignInfo;

  if (tabBatch && tabChecked && secBatch && secChecked) {
    tabBatch.addEventListener('click', () => {
      activeTab = 'batch';
      tabBatch.classList.add('active');
      tabChecked.classList.remove('active');
      secBatch.style.display = 'block';
      secChecked.style.display = 'none';
      updateBatchAssignInfo();
    });

    tabChecked.addEventListener('click', () => {
      activeTab = 'checked';
      tabChecked.classList.add('active');
      tabBatch.classList.remove('active');
      secBatch.style.display = 'none';
      secChecked.style.display = 'block';
    });
  }

  if (pkgFilter) pkgFilter.addEventListener('change', updateBatchAssignInfo);
  if (statusFilter) statusFilter.addEventListener('change', updateBatchAssignInfo);
  if (qtyInput) qtyInput.addEventListener('input', updateBatchAssignInfo);
  if ($id('m-assign-reseller-target')) $id('m-assign-reseller-target').addEventListener('change', updateBatchAssignInfo);

  on('btn-assign-all-avail', 'click', () => {
    const candidates = getAvailableCandidates();
    if (qtyInput) qtyInput.value = candidates.length;
    updateBatchAssignInfo();
  });

  // Initial calculation
  updateBatchAssignInfo();

  function processAssignment(actionAfter = 'none') {
    const targetResId = $id('m-assign-reseller-target')?.value;
    const targetRes = state.resellers.find(r => r.id === targetResId);

    if (!targetRes) {
      showToast('Pilih warung / reseller tujuan!', 'error');
      return;
    }

    let vouchersToAssign = [];

    if (activeTab === 'checked') {
      vouchersToAssign = getSelectedVouchers();
      if (vouchersToAssign.length === 0) {
        showToast('Tidak ada voucher yang dicentang di tabel!', 'error');
        return;
      }
    } else {
      const candidates = getAvailableCandidates();
      const qty = parseInt(qtyInput?.value || '0', 10);
      if (qty <= 0) {
        showToast('Masukkan jumlah voucher yang valid (minimal 1)!', 'error');
        qtyInput?.focus();
        return;
      }
      if (candidates.length === 0) {
        showToast('Tidak ada voucher yang tersedia untuk dititipkan!', 'error');
        return;
      }
      vouchersToAssign = candidates.slice(0, qty);
    }

    vouchersToAssign.forEach(v => {
      v.resellerId = targetRes.id;
      v.resellerName = targetRes.name;
    });

    logActivity('STATUS_CHANGE', `Menitipkan ${vouchersToAssign.length} voucher ke ${targetRes.name}`);
    saveState();
    renderTable();
    renderPreview();

    if (actionAfter === 'print_vouchers') {
      printResellerVouchers(targetRes.id, vouchersToAssign);
    } else if (actionAfter === 'print_surat_jalan') {
      closeModal();
      printSuratJalan(targetRes.id);
    } else {
      closeModal();
      showToast(`⚡ Berhasil menitipkan ${vouchersToAssign.length} voucher ke "🏪 ${targetRes.name}"!`);
    }
  }

  // Action Buttons
  on('btn-execute-assign', 'click', () => processAssignment('none'));
  on('btn-execute-assign-print', 'click', () => processAssignment('print_vouchers'));
  on('btn-execute-assign-surat-jalan', 'click', () => processAssignment('print_surat_jalan'));

  // Unassign / Return to Main Stock
  on('btn-unassign-reseller', 'click', () => {
    const checked = getSelectedVouchers();
    if (checked.length > 0) {
      checked.forEach(v => {
        v.resellerId = null;
        v.resellerName = null;
      });
      logActivity('STATUS_CHANGE', `Menarik ${checked.length} voucher kembali ke stok utama`);
      saveState();
      renderTable();
      renderPreview();
      closeModal();
      showToast(`${checked.length} voucher berhasil dikembalikan ke stok utama.`);
    } else {
      const targetResId = $id('m-assign-reseller-target')?.value;
      const targetRes = state.resellers.find(r => r.id === targetResId);
      if (!targetRes) return;

      const resVouchers = state.vouchers.filter(v => v.resellerId === targetResId);
      if (resVouchers.length === 0) {
        showToast(`Tidak ada voucher yang sedang dititipkan di ${targetRes.name}.`, 'warning');
        return;
      }

      if (confirm(`Tarik kembali SEMUA ${resVouchers.length} voucher dari warung "${targetRes.name}" ke stok utama?`)) {
        resVouchers.forEach(v => {
          v.resellerId = null;
          v.resellerName = null;
        });
        logActivity('STATUS_CHANGE', `Menarik semua ${resVouchers.length} voucher dari ${targetRes.name}`);
        saveState();
        renderTable();
        renderPreview();
        closeModal();
        showToast(`Semua ${resVouchers.length} voucher dari ${targetRes.name} berhasil dikembalikan ke stok utama.`);
      }
    }
  });
}

function printSuratJalan(resellerId) {
  const reseller = state.resellers.find(r => r.id === resellerId);
  if (!reseller) return;

  const resVouchers = state.vouchers.filter(v => v.resellerId === resellerId);
  const pkgCounts = {};
  let totalRp = 0;

  resVouchers.forEach(v => {
    const pkg = v.paket || 'Reguler';
    if (!pkgCounts[pkg]) {
      pkgCounts[pkg] = { count: 0, harga: v.harga || '0', total: 0 };
    }
    pkgCounts[pkg].count++;
    const p = parseFloat(String(v.harga).replace(/[^\d.]/g, '')) || 0;
    pkgCounts[pkg].total += p;
    totalRp += p;
  });

  const rowsHtml = Object.keys(pkgCounts).map((pkg, idx) => {
    const item = pkgCounts[pkg];
    return `
      <tr>
        <td style="border:1px solid #000;padding:6px;text-align:center;">${idx + 1}</td>
        <td style="border:1px solid #000;padding:6px;font-weight:bold;">${esc(pkg)}</td>
        <td style="border:1px solid #000;padding:6px;text-align:center;">${item.count} lembar</td>
        <td style="border:1px solid #000;padding:6px;text-align:right;">Rp ${formatNumber(item.harga)}</td>
        <td style="border:1px solid #000;padding:6px;text-align:right;font-weight:bold;">Rp ${formatNumber(item.total)}</td>
      </tr>
    `;
  }).join('');

  const activePreset = state.presets.find(p => p.id === state.activePresetId) || DEFAULT_PRESET;

  const html = `
    <div style="font-family:sans-serif;font-size:13px;max-width:680px;margin:20px auto;color:#000;line-height:1.5;">
      <div style="display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:15px;">
        <div>
          <h2 style="font-size:18px;margin:0 0 4px;">${esc(activePreset.name)}</h2>
          <div style="font-size:12px;">WiFi Hotspot Provider • SSID: ${esc(state.settings.ssid || '-')}</div>
        </div>
        <div style="text-align:right;">
          <h3 style="font-size:16px;margin:0 0 4px;">SURAT JALAN & TANDA TERIMA</h3>
          <div style="font-size:12px;">Tanggal: ${new Date().toLocaleDateString('id-ID')}</div>
        </div>
      </div>

      <div style="margin-bottom:15px;background:#f8fafc;padding:10px;border:1px solid #ccc;">
        <div><strong>Penerima / Reseller:</strong> ${esc(reseller.name)}</div>
        <div><strong>No. Telp / WA:</strong> ${esc(reseller.phone || '-')}</div>
        <div><strong>Alamat:</strong> ${esc(reseller.address || '-')}</div>
        ${reseller.note ? `<div><strong>Catatan:</strong> ${esc(reseller.note)}</div>` : ''}
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:15px;">
        <thead>
          <tr style="background:#e2e8f0;">
            <th style="border:1px solid #000;padding:6px;width:35px;">No</th>
            <th style="border:1px solid #000;padding:6px;text-align:left;">Nama Paket Hotspot</th>
            <th style="border:1px solid #000;padding:6px;width:100px;">Jumlah</th>
            <th style="border:1px solid #000;padding:6px;text-align:right;width:110px;">Harga Satuan</th>
            <th style="border:1px solid #000;padding:6px;text-align:right;width:120px;">Total Nilai</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="5" style="text-align:center;padding:10px;">Belum ada voucher yang ditugaskan ke reseller ini.</td></tr>'}
          <tr style="background:#f1f5f9;font-weight:bold;">
            <td colspan="4" style="border:1px solid #000;padding:8px;text-align:right;">TOTAL TAGIHAN / SETORAN:</td>
            <td style="border:1px solid #000;padding:8px;text-align:right;font-size:15px;">Rp ${formatNumber(totalRp)}</td>
          </tr>
        </tbody>
      </table>

      <div style="display:flex;justify-content:space-between;margin-top:40px;text-align:center;">
        <div style="width:200px;">
          <div>Yang Menyerahkan,</div>
          <div style="height:60px;"></div>
          <div style="border-top:1px solid #000;font-weight:bold;">( ${esc(activePreset.name)} )</div>
        </div>
        <div style="width:200px;">
          <div>Yang Menerima / Agen,</div>
          <div style="height:60px;"></div>
          <div style="border-top:1px solid #000;font-weight:bold;">( ${esc(reseller.name)} )</div>
        </div>
      </div>
    </div>
  `;

  const printArea = $id('print-area');
  if (printArea) {
    printArea.innerHTML = html;
    preparePrintStyles('A4');
    window.print();
  }
}

// ===== PRESET STORE / PROFIL TOKO MODAL =====
function showStorePresetsModal() {
  const optionsHtml = state.presets.map(p => `
    <div style="display:flex;justify-content:space-between;align-items:center;background:var(--surface-alt);border:1px solid var(--border);padding:0.75rem;border-radius:var(--radius-xs);margin-bottom:0.5rem;">
      <div>
        <strong>🏪 ${esc(p.name)}</strong>
        <div style="font-size:0.75rem;color:var(--text-secondary);">SSID: ${esc(p.ssid || '-')}</div>
      </div>
      <div style="display:flex;gap:0.35rem;">
        <button class="btn btn-secondary btn-sm" onclick="switchPresetDirect('${p.id}')" ${p.id === state.activePresetId ? 'disabled' : ''}>
          ${p.id === state.activePresetId ? '✓ Aktif' : 'Pilih'}
        </button>
      </div>
    </div>
  `).join('');

  const html = `
    <div class="modal-header">
      <h3>🏪 Kelola Profil / Cabang Toko</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.85rem;">
        <p style="font-size:0.82rem;color:var(--text-secondary);">Ganti profil toko atau buat pengaturan cabang baru.</p>
        <button class="btn btn-primary btn-sm" id="btn-modal-add-preset">＋ Tambah Toko</button>
      </div>
      ${optionsHtml}
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Tutup</button>
    </div>
  `;

  openModal(html);
  on('btn-modal-add-preset', showAddPresetModal);
}

function switchPresetDirect(id) {
  const target = state.presets.find(p => p.id === id);
  if (!target) return;
  state.activePresetId = id;
  state.settings.ssid = target.ssid || '';
  state.settings.logo = target.logo || null;
  state.settings.theme = target.theme || 'theme-blue';
  state.settings.loginHint = target.loginHint || 'Buka browser utk login';

  restoreUI();
  saveState();
  renderPreview();
  closeModal();
  showToast(`Beralih ke profil: ${target.name}`);
}

function showAddPresetModal() {
  if (state.presets.length >= 1 && !requirePro('Multi-Cabang Profil Toko')) return;

  const html = `
    <div class="modal-header">
      <h3>Tambah Profil / Cabang Baru</h3>
      <button class="btn-icon" onclick="showStorePresetsModal()" title="Kembali">✕</button>
    </div>
    <div class="modal-body">
      <div class="modal-form">
        <div class="form-group">
          <label for="m-preset-name">Nama Profil / Toko *</label>
          <input type="text" id="m-preset-name" class="form-input" placeholder="Contoh: Warkop Cabang 2 / Kos Melati" autofocus>
        </div>
        <div class="form-group">
          <label for="m-preset-ssid">Nama WiFi (SSID)</label>
          <input type="text" id="m-preset-ssid" class="form-input" placeholder="Contoh: Warkop_Cabang2_5G">
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="showStorePresetsModal()">Batal</button>
      <button class="btn btn-primary" id="btn-confirm-add-preset">Simpan Profil Baru</button>
    </div>
  `;

  openModal(html);

  on('btn-confirm-add-preset', () => {
    const name = ($id('m-preset-name')?.value || '').trim();
    if (!name) {
      showToast('Nama profil wajib diisi', 'error');
      return;
    }

    const newId = 'preset_' + Date.now();
    const newPreset = {
      id: newId,
      name: name,
      ssid: ($id('m-preset-ssid')?.value || '').trim() || name,
      logo: state.settings.logo || null,
      theme: state.settings.theme || 'theme-blue',
      loginHint: state.settings.loginHint || 'Buka browser utk login'
    };

    state.presets.push(newPreset);
    state.activePresetId = newId;
    state.settings.ssid = newPreset.ssid;

    saveState();
    restoreUI();
    renderPreview();
    showToast(`Profil "${name}" berhasil dibuat`);
    showStorePresetsModal();
  });
}

// ===== 📊 REKAP OMSET & DUAL VISUAL CHARTS =====
let rekapFilter = {
  period: 'all',
  package: 'all',
  status: 'all',
  startDate: '',
  endDate: ''
};

function parseVoucherDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  if (typeof dateStr === 'string' && dateStr.includes('/')) {
    const parts = dateStr.trim().split(' ');
    const dateParts = parts[0].split('/');
    if (dateParts.length === 3) {
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1;
      const day = parseInt(dateParts[2], 10);
      let hour = 0, min = 0, sec = 0;
      if (parts[1]) {
        const timeParts = parts[1].split(':');
        hour = parseInt(timeParts[0], 10) || 0;
        min = parseInt(timeParts[1], 10) || 0;
        sec = parseInt(timeParts[2], 10) || 0;
      }
      return new Date(year, month, day, hour, min, sec);
    }
  }

  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function getRekapFilteredData() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const startOf7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOf30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let startCustom = null;
  let endCustom = null;
  if (rekapFilter.period === 'custom') {
    if (rekapFilter.startDate) startCustom = new Date(rekapFilter.startDate + 'T00:00:00');
    if (rekapFilter.endDate) endCustom = new Date(rekapFilter.endDate + 'T23:59:59');
  }

  return state.vouchers.filter(v => {
    if (rekapFilter.status === 'printed' && !v.printed) return false;
    if (rekapFilter.status === 'unprinted' && v.printed) return false;
    if (rekapFilter.package !== 'all' && (v.paket || 'Reguler') !== rekapFilter.package) return false;

    if (rekapFilter.period === 'all') return true;
    const vDate = parseVoucherDate(v.printedAt || v.createdAt) || now;

    if (rekapFilter.period === 'today') return vDate >= startOfToday;
    if (rekapFilter.period === '7days') return vDate >= startOf7Days;
    if (rekapFilter.period === '30days') return vDate >= startOf30Days;
    if (rekapFilter.period === 'custom') {
      if (startCustom && vDate < startCustom) return false;
      if (endCustom && vDate > endCustom) return false;
      return true;
    }
    return true;
  });
}

function showRekapModal() {
  openModal('', 'modal-rekap');
  renderRekapModalContent();
}

function renderRekapModalContent() {
  const filtered = getRekapFilteredData();
  const allPackages = Array.from(new Set(state.vouchers.map(v => v.paket || 'Reguler'))).filter(Boolean);

  const printedList = filtered.filter(v => v.printed);
  const unprintedList = filtered.filter(v => !v.printed);

  let totalOmsetPrinted = 0;
  printedList.forEach(v => {
    totalOmsetPrinted += parseFloat(String(v.harga).replace(/[^\d.]/g, '')) || 0;
  });

  let totalOmsetUnprinted = 0;
  unprintedList.forEach(v => {
    totalOmsetUnprinted += parseFloat(String(v.harga).replace(/[^\d.]/g, '')) || 0;
  });

  const totalOmsetAll = totalOmsetPrinted + totalOmsetUnprinted;

  const packageStats = {};
  filtered.forEach(v => {
    const pkg = v.paket || 'Reguler';
    if (!packageStats[pkg]) {
      packageStats[pkg] = { count: 0, printed: 0, unprinted: 0, harga: v.harga || '0', omsetPrinted: 0, omsetTotal: 0 };
    }
    packageStats[pkg].count++;
    const p = parseFloat(String(v.harga).replace(/[^\d.]/g, '')) || 0;
    packageStats[pkg].omsetTotal += p;

    if (v.printed) {
      packageStats[pkg].printed++;
      packageStats[pkg].omsetPrinted += p;
    } else {
      packageStats[pkg].unprinted++;
    }
  });

  // Chart 1: Top Selling Packages
  const chartPkgs = Object.keys(packageStats);
  const maxPrintedCount = Math.max(1, ...chartPkgs.map(k => packageStats[k].printed));
  
  const pkgBarsHtml = chartPkgs.map(pkg => {
    const s = packageStats[pkg];
    const heightPercent = Math.max(8, Math.round((s.printed / maxPrintedCount) * 100));
    return `
      <div class="chart-bar-col" title="${esc(pkg)}: ${s.printed} pcs terjual (Rp ${formatNumber(s.omsetPrinted)})">
        <div class="chart-bar-value">${s.printed}</div>
        <div class="chart-bar-fill" style="height: ${heightPercent}%;"></div>
        <div class="chart-bar-label">${esc(pkg.substring(0, 8))}</div>
      </div>
    `;
  }).join('');

  // Chart 2: Timeline Omset (Last 7 Days)
  const daysTrendMap = {};
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    daysTrendMap[key] = { label: dayNames[d.getDay()], count: 0, omset: 0 };
  }

  printedList.forEach(v => {
    const d = parseVoucherDate(v.printedAt || v.createdAt);
    if (d) {
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (daysTrendMap[key]) {
        daysTrendMap[key].count++;
        daysTrendMap[key].omset += parseFloat(String(v.harga).replace(/[^\d.]/g, '')) || 0;
      }
    }
  });

  const timelineDays = Object.values(daysTrendMap);
  const maxDayOmset = Math.max(1, ...timelineDays.map(t => t.omset));

  const timelineBarsHtml = timelineDays.map(t => {
    const heightPercent = Math.max(8, Math.round((t.omset / maxDayOmset) * 100));
    return `
      <div class="chart-bar-col" title="${t.label}: Rp ${formatNumber(t.omset)} (${t.count} pcs)">
        <div class="chart-bar-value">${t.omset >= 1000 ? Math.round(t.omset/1000) + 'k' : t.omset}</div>
        <div class="chart-bar-fill accent-gold" style="height: ${heightPercent}%;"></div>
        <div class="chart-bar-label">${t.label}</div>
      </div>
    `;
  }).join('');

  const packageRows = chartPkgs.map(pkg => {
    const s = packageStats[pkg];
    const contrib = totalOmsetPrinted > 0 ? ((s.omsetPrinted / totalOmsetPrinted) * 100).toFixed(1) : '0';
    return `
      <tr>
        <td style="font-weight:750;">${esc(pkg)}</td>
        <td>Rp ${formatNumber(s.harga)}</td>
        <td style="color:var(--success);font-weight:750;">${s.printed} pcs</td>
        <td style="color:var(--text-muted);">${s.unprinted} pcs</td>
        <td style="font-weight:850;color:var(--primary);">Rp ${formatNumber(s.omsetPrinted)}</td>
        <td style="font-size:0.76rem;font-weight:650;color:var(--text-muted);">${contrib}%</td>
      </tr>
    `;
  }).join('');

  const maxList = 40;
  const listSlice = filtered.slice(0, maxList);
  const detailRows = listSlice.map((v, idx) => {
    const rawDate = v.printedAt || v.createdAt;
    const d = parseVoucherDate(rawDate);
    const dateFormatted = d ? `${d.toLocaleDateString('id-ID')} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : '-';
    const statusBadge = v.printed
      ? `<span class="badge-status badge-status-printed">⚪ Dicetak</span>`
      : `<span class="badge-status badge-status-unprinted">🟢 Belum</span>`;

    return `
      <tr>
        <td style="font-size:0.75rem;color:var(--text-muted);">${idx + 1}</td>
        <td style="font-family:var(--font-mono);font-weight:750;color:var(--primary);">${esc(v.code)}</td>
        <td>${esc(v.paket)}</td>
        <td style="font-weight:750;">${v.harga ? 'Rp ' + formatNumber(v.harga) : '-'}</td>
        <td>${statusBadge}</td>
        <td style="font-size:0.74rem;color:var(--text-muted);">${dateFormatted}</td>
      </tr>
    `;
  }).join('');

  const moreDetailCount = filtered.length - maxList;

  const html = `
    <div class="modal-header">
      <h3>📊 Laporan Penjualan & Dashboard Omset</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
    </div>
    <div class="modal-body">
      <!-- Periode Tabs -->
      <div class="rekap-period-tabs">
        <button class="rekap-period-tab ${rekapFilter.period === 'today' ? 'active' : ''}" data-p="today">📅 Hari Ini</button>
        <button class="rekap-period-tab ${rekapFilter.period === '7days' ? 'active' : ''}" data-p="7days">📅 7 Hari (Mingguan)</button>
        <button class="rekap-period-tab ${rekapFilter.period === '30days' ? 'active' : ''}" data-p="30days">📅 30 Hari (Bulanan)</button>
        <button class="rekap-period-tab ${rekapFilter.period === 'all' ? 'active' : ''}" data-p="all">📅 Semua Waktu</button>
        <button class="rekap-period-tab ${rekapFilter.period === 'custom' ? 'active' : ''}" data-p="custom">⚙️ Kustom Tanggal</button>
      </div>

      <!-- Filter Controls Row -->
      <div class="rekap-filter-row">
        <div class="form-group">
          <label for="rekap-pkg-select">Filter Paket</label>
          <select id="rekap-pkg-select" class="form-input form-input-sm">
            <option value="all" ${rekapFilter.package === 'all' ? 'selected' : ''}>Semua Paket (${allPackages.length})</option>
            ${allPackages.map(p => `<option value="${esc(p)}" ${rekapFilter.package === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="rekap-status-select">Status Voucher</label>
          <select id="rekap-status-select" class="form-input form-input-sm">
            <option value="all" ${rekapFilter.status === 'all' ? 'selected' : ''}>Semua Status</option>
            <option value="printed" ${rekapFilter.status === 'printed' ? 'selected' : ''}>⚪ Sudah Dicetak (Terjual)</option>
            <option value="unprinted" ${rekapFilter.status === 'unprinted' ? 'selected' : ''}>🟢 Belum Dicetak (Stok)</option>
          </select>
        </div>
        ${rekapFilter.period === 'custom' ? `
          <div style="display:flex;gap:0.4rem;align-items:flex-end;">
            <div class="form-group">
              <label for="rekap-start-date">Dari</label>
              <input type="date" id="rekap-start-date" class="form-input form-input-sm" value="${rekapFilter.startDate}">
            </div>
            <div class="form-group">
              <label for="rekap-end-date">Sampai</label>
              <input type="date" id="rekap-end-date" class="form-input form-input-sm" value="${rekapFilter.endDate}">
            </div>
          </div>
        ` : ''}
      </div>

      <!-- 3 Metrics KPI Cards -->
      <div class="rekap-card-grid-3">
        <div class="rekap-card rekap-card-accent-green">
          <div class="rekap-label">Omset Voucher Terjual</div>
          <div class="rekap-val" style="color:var(--success);">Rp ${formatNumber(totalOmsetPrinted)}</div>
          <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:3px;">✨ <strong>${printedList.length}</strong> voucher terjual</div>
        </div>
        <div class="rekap-card rekap-card-accent-blue">
          <div class="rekap-label">Sisa Nilai Stok</div>
          <div class="rekap-val" style="color:var(--primary);">Rp ${formatNumber(totalOmsetUnprinted)}</div>
          <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:3px;">📦 <strong>${unprintedList.length}</strong> voucher siap cetak</div>
        </div>
        <div class="rekap-card rekap-card-accent-purple">
          <div class="rekap-label">Total Potensi Nilai</div>
          <div class="rekap-val" style="color:#7c3aed;">Rp ${formatNumber(totalOmsetAll)}</div>
          <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:3px;">📋 <strong>${filtered.length}</strong> voucher terdata</div>
        </div>
      </div>

      <!-- Section: Dual Visual Analytics Charts -->
      <div class="rekap-charts-grid">
        <div class="rekap-chart-box">
          <div class="rekap-chart-title">
            <span>📈 Tren Omset 7 Hari Terakhir</span>
            <span style="font-size:0.7rem;color:var(--text-muted);">Harian (Rp)</span>
          </div>
          <div class="rekap-bars-grid">
            ${timelineBarsHtml}
          </div>
        </div>
        <div class="rekap-chart-box">
          <div class="rekap-chart-title">
            <span>🏆 Paket Paling Laku (Pcs Terjual)</span>
            <span style="font-size:0.7rem;color:var(--text-muted);">Volume</span>
          </div>
          <div class="rekap-bars-grid">
            ${pkgBarsHtml || '<div style="color:var(--text-muted);font-size:0.75rem;margin:auto;">Belum ada data</div>'}
          </div>
        </div>
      </div>

      <!-- Section: Rincian Paket -->
      <div class="rekap-section-title">
        <span>📦 Rincian Omset per Paket Hotspot</span>
        <span style="font-size:0.74rem;color:var(--text-muted);">${chartPkgs.length} Paket</span>
      </div>
      <table class="data-table" style="margin-bottom:1rem;background:var(--surface);">
        <thead>
          <tr>
            <th>Paket</th>
            <th>Harga Satuan</th>
            <th>Terjual</th>
            <th>Sisa Stok</th>
            <th>Subtotal Omset</th>
            <th>Kontribusi</th>
          </tr>
        </thead>
        <tbody>
          ${packageRows || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">Tidak ada data pada filter ini</td></tr>'}
        </tbody>
      </table>

      <!-- Section: Rincian Voucher -->
      <div class="rekap-section-title">
        <span>📋 Log & Riwayat Transaksi Voucher (${filtered.length} voucher)</span>
        <span style="font-size:0.74rem;color:var(--text-muted);">Menampilkan ${listSlice.length} baris</span>
      </div>
      <div class="rekap-table-wrapper">
        <table class="data-table" style="background:var(--surface);">
          <thead>
            <tr>
              <th>No</th>
              <th>Kode Voucher</th>
              <th>Paket</th>
              <th>Harga</th>
              <th>Status</th>
              <th>Waktu Terakhir</th>
            </tr>
          </thead>
          <tbody>
            ${detailRows || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">Tidak ada voucher</td></tr>'}
            ${moreDetailCount > 0 ? `<tr><td colspan="6" style="text-align:center;font-size:0.75rem;color:var(--text-muted);font-style:italic;">...dan ${moreDetailCount} voucher lainnya (Export CSV untuk melihat lengkap)</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-footer" style="justify-content:space-between;flex-wrap:wrap;">
      <div style="display:flex;gap:0.45rem;">
        <button class="btn btn-secondary btn-sm" id="btn-export-rekap-csv" title="Download data laporan ke Excel/CSV">📥 Export CSV</button>
        <button class="btn btn-secondary btn-sm" id="btn-print-rekap-receipt" title="Cetak struk rekap penjualan">🖨️ Cetak Struk Rekap</button>
      </div>
      <button class="btn btn-primary btn-sm" onclick="closeModal()">Tutup</button>
    </div>
  `;

  const modalContent = $id('modal-content');
  if (modalContent) modalContent.innerHTML = html;

  $$('.rekap-period-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      rekapFilter.period = tab.dataset.p;
      renderRekapModalContent();
    });
  });

  on('rekap-pkg-select', 'change', (e) => {
    rekapFilter.package = e.target.value;
    renderRekapModalContent();
  });

  on('rekap-status-select', 'change', (e) => {
    rekapFilter.status = e.target.value;
    renderRekapModalContent();
  });

  on('rekap-start-date', 'change', (e) => {
    rekapFilter.startDate = e.target.value;
    renderRekapModalContent();
  });

  on('rekap-end-date', 'change', (e) => {
    rekapFilter.endDate = e.target.value;
    renderRekapModalContent();
  });

  on('btn-export-rekap-csv', exportRekapCSV);
  on('btn-print-rekap-receipt', printRekapReceipt);
}

function exportRekapCSV() {
  const filtered = getRekapFilteredData();
  if (filtered.length === 0) {
    showToast('Tidak ada data laporan untuk diekspor.', 'error');
    return;
  }

  const activePreset = state.presets.find(p => p.id === state.activePresetId) || DEFAULT_PRESET;
  let csv = `LAPORAN PENJUALAN VOUCHER RUIJIE\n`;
  csv += `Toko / Profil:,"${activePreset.name}"\n`;
  csv += `SSID WiFi:,"${state.settings.ssid || '-'}"\n`;
  csv += `Periode:,"${rekapFilter.period.toUpperCase()}"\n`;
  csv += `Tanggal Export:,"${new Date().toLocaleString('id-ID')}"\n\n`;

  csv += `No,Kode Voucher,Paket,Harga,Status,Waktu\n`;
  filtered.forEach((v, idx) => {
    const rawDate = v.printedAt || v.createdAt;
    const d = parseVoucherDate(rawDate);
    const dateFormatted = d ? `${d.toLocaleDateString('id-ID')} ${d.toLocaleTimeString('id-ID')}` : '-';
    csv += `${idx + 1},"${v.code}","${v.paket || 'Reguler'}",${v.harga || 0},"${v.printed ? 'Sudah Dicetak' : 'Belum Dicetak'}","${dateFormatted}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `rekap_voucher_${rekapFilter.period}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('Laporan CSV berhasil didownload!');
}

function printRekapReceipt() {
  const filtered = getRekapFilteredData();
  const activePreset = state.presets.find(p => p.id === state.activePresetId) || DEFAULT_PRESET;
  const printedList = filtered.filter(v => v.printed);

  let totalOmsetPrinted = 0;
  printedList.forEach(v => {
    totalOmsetPrinted += parseFloat(String(v.harga).replace(/[^\d.]/g, '')) || 0;
  });

  const packageStats = {};
  filtered.forEach(v => {
    const pkg = v.paket || 'Reguler';
    if (!packageStats[pkg]) {
      packageStats[pkg] = { count: 0, printed: 0, harga: v.harga || '0', omsetPrinted: 0 };
    }
    packageStats[pkg].count++;
    if (v.printed) {
      packageStats[pkg].printed++;
      const p = parseFloat(String(v.harga).replace(/[^\d.]/g, '')) || 0;
      packageStats[pkg].omsetPrinted += p;
    }
  });

  const rows = Object.keys(packageStats).map(pkg => {
    const s = packageStats[pkg];
    return `
      <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
        <span>${esc(pkg)} (${s.printed}x)</span>
        <strong>Rp ${formatNumber(s.omsetPrinted)}</strong>
      </div>
    `;
  }).join('');

  const receiptHtml = `
    <div style="font-family:monospace;font-size:12px;width:280px;margin:0 auto;padding:10px;line-height:1.4;color:#000;">
      <div style="text-align:center;border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;">
        <div style="font-size:15px;font-weight:bold;">${esc(activePreset.name)}</div>
        <div>WiFi: ${esc(state.settings.ssid || 'Hotspot')}</div>
        <div style="font-size:10px;margin-top:4px;">*** STRUK REKAP PENJUALAN ***</div>
        <div style="font-size:10px;">Periode: ${rekapFilter.period.toUpperCase()}</div>
        <div style="font-size:10px;">Waktu: ${new Date().toLocaleString('id-ID')}</div>
      </div>

      <div style="border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;">
        <div style="font-weight:bold;margin-bottom:4px;">RINCIAN PAKET TERJUAL:</div>
        ${rows || '<div>Tidak ada transaksi tercetak</div>'}
      </div>

      <div style="border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:bold;">
          <span>TOTAL OMSET:</span>
          <span>Rp ${formatNumber(totalOmsetPrinted)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#333;margin-top:2px;">
          <span>Total Voucher Terjual:</span>
          <span>${printedList.length} pcs</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#333;">
          <span>Sisa Stok Belum Cetak:</span>
          <span>${filtered.length - printedList.length} pcs</span>
        </div>
      </div>

      <div style="text-align:center;font-size:10px;margin-top:6px;">
        <div>Terima Kasih</div>
        <div>Sistem Cetak Voucher Ruijie</div>
      </div>
    </div>
  `;

  const printArea = $id('print-area');
  if (printArea) {
    printArea.innerHTML = receiptHtml;
    preparePrintStyles('receipt');
    window.print();
  }
}

// ===== LOGO UPLOAD =====
function handleLogoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('File harus berupa gambar (PNG/JPG)', 'error');
    return;
  }

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  img.onload = () => {
    try {
      const maxW = 360;
      const maxH = 160;
      let w = img.width;
      let h = img.height;

      const ratio = Math.min(maxW / w, maxH / h);
      if (ratio < 1) {
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, w);
      canvas.height = Math.max(1, h);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      state.settings.logo = canvas.toDataURL('image/png');
      updateLogoUI();
      saveState();
      renderPreview();
      showToast('Logo berhasil diunggah');
    } catch (err) {
      console.error('Logo process error:', err);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };
  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    showToast('Gagal memproses gambar logo', 'error');
  };
  img.src = objectUrl;
  e.target.value = '';
}

function updateLogoUI() {
  const preview = $id('logo-preview');
  const placeholder = $id('logo-placeholder');
  if (!preview || !placeholder) return;
  if (state.settings.logo) {
    preview.src = state.settings.logo;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    preview.style.display = 'none';
    placeholder.style.display = 'flex';
  }
}

// ===== FILE IMPORT (RUIJIE EXCEL & CSV) =====
function handleFileInput(e) {
  const file = e.target.files[0];
  if (!file) return;

  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const vouchers = parseRuijieRows(rows);
        if (vouchers.length === 0) {
          showToast('Tidak ada voucher berstatus "Tidak digunakan" dalam file Excel.', 'error');
          return;
        }
        showImportPreview(vouchers);
      } catch (err) {
        console.error('XLSX parse error:', err);
        showToast('Gagal membaca file Excel.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const vouchers = parseRuijieCSV(evt.target.result);
        if (vouchers.length === 0) {
          showToast('Tidak ada voucher berstatus "Tidak digunakan" dalam file CSV.', 'error');
          return;
        }
        showImportPreview(vouchers);
      } catch (err) {
        console.error('CSV parse error:', err);
        showToast('Gagal membaca file CSV.', 'error');
      }
    };
    reader.readAsText(file);
  }

  e.target.value = '';
}

function parseRuijieCSV(text) {
  const firstLine = text.split('\n')[0] || '';
  let delimiter = ',';
  const counts = {
    ',': (firstLine.match(/,/g) || []).length,
    ';': (firstLine.match(/;/g) || []).length,
    '\t': (firstLine.match(/\t/g) || []).length
  };
  if (counts[';'] > counts[',']) delimiter = ';';
  if (counts['\t'] > counts[delimiter]) delimiter = '\t';

  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return [];

  const rows = lines.map(line => parseCSVLine(line, delimiter));
  return parseRuijieRows(rows);
}

function parseCSVLine(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseRuijieRows(rows) {
  if (!rows || rows.length < 2) return [];

  let start = 0;
  const first = rows[0];
  if (first && first[0] != null) {
    const val = String(first[0]).toLowerCase();
    if (val.includes('kode') || val.includes('voucher') || val.includes('code') || val.includes('no')) {
      start = 1;
    }
  }

  const results = [];
  for (let i = start; i < rows.length; i++) {
    const c = rows[i];
    if (!c || c.length < 2) continue;

    const cells = c.map(cell => String(cell == null ? '' : cell).trim());
    const code = cells[0];
    if (!code) continue;

    const status = cells[2] || '';
    const disabled = cells[3] || '';

    if (status && status !== 'Tidak digunakan' && status !== 'Unused') continue;
    if (disabled && disabled !== 'Tidak' && disabled !== 'No') continue;

    let quota = '';
    if (cells[15]) {
      const parts = cells[15].split('/');
      quota = parts.length >= 2 ? parts[parts.length - 1].trim() : cells[15].trim();
    }

    results.push({
      code: code,
      paket: cells[1] || 'Reguler',
      harga: cells[4] || '',
      periode: cells[5] || '',
      createdAt: cells[10] || new Date().toISOString(),
      speed: cells[16] || '',
      quota: quota,
      resellerId: null,
      resellerName: null,
      printed: false,
      printedAt: null,
      selected: true
    });
  }

  return results;
}

// ===== SMART IMPORT PREVIEW =====
function showImportPreview(uploadedVouchers) {
  const existingCodeMap = new Map();
  state.vouchers.forEach((v, idx) => {
    existingCodeMap.set(v.code.toLowerCase().trim(), idx);
  });

  const newVouchers = [];
  const duplicateVouchers = [];

  uploadedVouchers.forEach(v => {
    const cleanCode = v.code.toLowerCase().trim();
    if (existingCodeMap.has(cleanCode)) {
      duplicateVouchers.push(v);
    } else {
      newVouchers.push(v);
    }
  });

  const totalCount = uploadedVouchers.length;
  const newCount = newVouchers.length;
  const dupCount = duplicateVouchers.length;

  const displayList = newCount > 0 ? newVouchers : uploadedVouchers;
  const maxShow = 6;
  const showing = displayList.slice(0, maxShow);
  const more = displayList.length - maxShow;

  let tableRows = showing.map((v, i) => `
    <tr>
      <td>${i + 1}</td>
      <td class="col-code">${esc(v.code)}</td>
      <td>${esc(v.paket)}</td>
      <td>${v.harga ? 'Rp ' + esc(v.harga) : '-'}</td>
      <td>${esc(v.periode) || '-'}</td>
      <td><span class="badge-status badge-status-unprinted">Baru</span></td>
    </tr>
  `).join('');

  if (more > 0) {
    tableRows += `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);font-style:italic;">...dan ${more} voucher lainnya</td></tr>`;
  }

  const html = `
    <div class="modal-header">
      <h3>Import & Cegah Voucher Dobel</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
    </div>
    <div class="modal-body">
      <div class="rekap-card-grid-3" style="margin-bottom:1rem;">
        <div class="rekap-card">
          <div class="rekap-val">${totalCount}</div>
          <div class="rekap-label">Total File</div>
        </div>
        <div class="rekap-card rekap-card-accent-green">
          <div class="rekap-val" style="color:var(--success);">✨ ${newCount}</div>
          <div class="rekap-label">Voucher Baru</div>
        </div>
        <div class="rekap-card">
          <div class="rekap-val" style="color:var(--text-muted);">🔁 ${dupCount}</div>
          <div class="rekap-label">Sudah Ada (Dobel)</div>
        </div>
      </div>

      ${dupCount > 0 ? `
        <div style="font-size:0.82rem;color:var(--text);background:var(--surface-alt);border:1px solid var(--border);padding:0.65rem 0.85rem;border-radius:var(--radius-xs);margin-bottom:0.9rem;">
          💡 Ditemukan <strong>${dupCount}</strong> voucher yang sudah ada di sistem. Sistem otomatis memisahkan voucher baru agar <strong>tidak tercetak dobel</strong>.
        </div>
      ` : ''}

      <table class="data-table" style="background:var(--surface);">
        <thead>
          <tr>
            <th>No</th>
            <th>Kode</th>
            <th>Paket</th>
            <th>Harga</th>
            <th>Periode</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
      ${newCount > 0 ? `
        <button class="btn btn-primary" id="btn-confirm-import-new">✨ Import ${newCount} Voucher Baru Saja</button>
      ` : ''}
      <button class="btn btn-secondary" id="btn-confirm-replace-all">🔄 Ganti Semua Data (${totalCount})</button>
    </div>
  `;

  openModal(html);

  on('btn-confirm-import-new', () => {
    importNewVouchersOnly(newVouchers);
    closeModal();
  });

  on('btn-confirm-replace-all', () => {
    replaceAllVouchers(uploadedVouchers);
    closeModal();
  });
}

function importNewVouchersOnly(newVouchers) {
  if (newVouchers.length === 0) {
    showToast('Tidak ada voucher baru untuk ditambahkan.', 'error');
    return;
  }

  let toAdd = newVouchers;
  if (!state.isPro) {
    const curLen = state.vouchers.length;
    const remainingSlots = Math.max(0, FREE_TIER_MAX_VOUCHERS - curLen);
    if (remainingSlots <= 0) {
      requirePro('Kapasitas Lebih dari 25 Voucher');
      return;
    }
    toAdd = newVouchers.slice(0, remainingSlots);
    if (newVouchers.length > remainingSlots) {
      showToast(`Versi Gratis dibatasi maksimal ${FREE_TIER_MAX_VOUCHERS} voucher. Hanya ${remainingSlots} voucher baru ditambahkan. Upgrade PRO untuk unlimited!`, 'error');
    }
  }

  state.vouchers.forEach(v => v.selected = false);
  toAdd.forEach(v => {
    v.selected = true;
    v.printed = false;
  });
  state.vouchers.push(...toAdd);
  state.filter = 'unprinted';
  $$('.filter-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === 'unprinted');
  });

  logActivity('SYNC', `Import ${toAdd.length} voucher baru dari file`);
  saveState();
  checkStockAlerts();
  renderQuickPOSGrid();
  renderTable();
  renderPreview();
  showToast(`Berhasil menambahkan ${toAdd.length} voucher baru`);
}

function replaceAllVouchers(allVouchers) {
  let toSet = allVouchers;
  if (!state.isPro && allVouchers.length > FREE_TIER_MAX_VOUCHERS) {
    toSet = allVouchers.slice(0, FREE_TIER_MAX_VOUCHERS);
    showToast(`Versi Gratis dibatasi maksimal ${FREE_TIER_MAX_VOUCHERS} voucher. Upgrade ke PRO untuk kapasitas tanpa batas!`, 'error');
  }

  state.vouchers = toSet;
  state.filter = 'all';
  $$('.filter-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === 'all');
  });

  logActivity('SYNC', `Ganti total database dengan ${toSet.length} voucher`);
  saveState();
  checkStockAlerts();
  renderQuickPOSGrid();
  renderTable();
  renderPreview();
  showToast(`Seluruh daftar diganti dengan ${toSet.length} voucher`);
}

// ===== ADD MANUAL MODAL =====
function showAddModal() {
  if (!state.isPro && state.vouchers.length >= FREE_TIER_MAX_VOUCHERS) {
    if (!requirePro('Kapasitas Lebih dari 25 Voucher')) return;
  }

  const html = `
    <div class="modal-header">
      <h3>Tambah Voucher Manual</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
    </div>
    <div class="modal-body">
      <div class="modal-form">
        <div class="form-group">
          <label for="m-code">Kode Voucher / Password *</label>
          <input type="text" id="m-code" class="form-input" placeholder="Contoh: 4fx5hi" autofocus>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="m-paket">Nama Paket / Profil</label>
            <input type="text" id="m-paket" class="form-input" placeholder="Contoh: Paket 1GB">
          </div>
          <div class="form-group">
            <label for="m-harga">Harga (Tanpa Rp)</label>
            <input type="text" id="m-harga" class="form-input" placeholder="Contoh: 5000">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="m-periode">Durasi / Masa Aktif</label>
            <input type="text" id="m-periode" class="form-input" placeholder="Contoh: 1 Hari">
          </div>
          <div class="form-group">
            <label for="m-speed">Kecepatan (Up/Down)</label>
            <input type="text" id="m-speed" class="form-input" placeholder="Contoh: 1M/2M">
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" id="btn-confirm-add">Simpan</button>
    </div>
  `;

  openModal(html);

  const confirmAdd = () => {
    const code = ($id('m-code')?.value || '').trim();
    if (!code) {
      showToast('Kode voucher wajib diisi', 'error');
      $id('m-code')?.focus();
      return;
    }

    const exists = state.vouchers.some(v => v.code.toLowerCase().trim() === code.toLowerCase());
    if (exists) {
      showToast('Kode voucher ini sudah ada di daftar!', 'error');
      return;
    }

    state.vouchers.push({
      code: code,
      paket: ($id('m-paket')?.value || '').trim() || 'Reguler',
      harga: ($id('m-harga')?.value || '').trim(),
      periode: ($id('m-periode')?.value || '').trim(),
      speed: ($id('m-speed')?.value || '').trim(),
      quota: '',
      resellerId: null,
      resellerName: null,
      createdAt: new Date().toISOString(),
      printed: false,
      printedAt: null,
      selected: true
    });
    logActivity('SYNC', `Tambah voucher manual [${code}]`);
    saveState();
    checkStockAlerts();
    renderQuickPOSGrid();
    renderTable();
    renderPreview();
    closeModal();
    showToast('Voucher baru berhasil ditambahkan');
  };

  on('btn-confirm-add', 'click', confirmAdd);
  on('modal-content', 'keydown', (e) => {
    if (e.key === 'Enter') confirmAdd();
  });
}

// ===== FILTERED & SEARCHED VOUCHERS =====
function getFilteredVouchersWithIndices() {
  const filter = state.filter || 'all';
  const query = state.searchQuery;
  const resellerFilter = state.filterReseller || 'all';
  const autoArchive = state.autoArchive24h;

  const now = new Date();
  const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return state.vouchers
    .map((v, originalIndex) => ({ voucher: v, originalIndex }))
    .filter(({ voucher }) => {
      if (filter === 'unprinted' && voucher.printed) return false;
      if (filter === 'printed' && !voucher.printed) return false;

      if (resellerFilter !== 'all') {
        if (resellerFilter === 'direct' && voucher.resellerId) return false;
        if (resellerFilter !== 'direct' && voucher.resellerId !== resellerFilter) return false;
      }

      if (autoArchive && voucher.printed && voucher.printedAt) {
        const pDate = new Date(voucher.printedAt);
        if (!isNaN(pDate.getTime()) && pDate < past24h) {
          if (!query) return false;
        }
      }

      if (query) {
        const codeMatch = (voucher.code || '').toLowerCase().includes(query);
        const pkgMatch = (voucher.paket || '').toLowerCase().includes(query);
        const resMatch = (voucher.resellerName || '').toLowerCase().includes(query);
        const priceMatch = (voucher.harga || '').includes(query);
        if (!codeMatch && !pkgMatch && !resMatch && !priceMatch) return false;
      }

      return true;
    });
}

function getSelectedVouchers() {
  return state.vouchers.filter(v => v.selected !== false);
}

// ===== SELECTION HELPERS =====
function handleCheckAll(e) {
  const isChecked = e.target.checked;
  const filtered = getFilteredVouchersWithIndices();
  filtered.forEach(({ voucher }) => {
    voucher.selected = isChecked;
  });
  saveState();
  renderTable();
  renderPreview();
}

function selectAll(val) {
  const filtered = getFilteredVouchersWithIndices();
  filtered.forEach(({ voucher }) => {
    voucher.selected = val;
  });
  saveState();
  renderTable();
  renderPreview();
}

function selectUnprintedOnly() {
  state.vouchers.forEach(v => {
    v.selected = !v.printed;
  });
  saveState();
  renderTable();
  renderPreview();
  const unprintedCount = state.vouchers.filter(v => !v.printed).length;
  showToast(`Dipilih ${unprintedCount} voucher yang belum dicetak`);
}

function selectOnePageUnprinted() {
  const layoutVal = state.settings.layout || '25';
  let perBatch = 25;
  if (layoutVal === 'label-103') perBatch = 12;
  else if (layoutVal === 'label-108') perBatch = 40;
  else if (layoutVal === 'label-121') perBatch = 10;
  else if (layoutVal.startsWith('thermal')) perBatch = 10;
  else perBatch = parseInt(layoutVal, 10) || 25;

  let count = 0;
  state.vouchers.forEach(v => {
    if (!v.printed && count < perBatch) {
      v.selected = true;
      count++;
    } else {
      v.selected = false;
    }
  });
  saveState();
  renderTable();
  renderPreview();
  showToast(`Dipilih ${count} voucher belum dicetak (1 batch)`);
}

function handleTableClick(e) {
  const checkbox = e.target.closest('.row-checkbox');
  if (checkbox) {
    const index = parseInt(checkbox.dataset.index, 10);
    if (!isNaN(index) && state.vouchers[index]) {
      if (e.shiftKey && lastCheckedIndex !== null) {
        const start = Math.min(lastCheckedIndex, index);
        const end = Math.max(lastCheckedIndex, index);
        const val = checkbox.checked;
        for (let i = start; i <= end; i++) {
          if (state.vouchers[i]) state.vouchers[i].selected = val;
        }
      } else {
        state.vouchers[index].selected = checkbox.checked;
      }
      lastCheckedIndex = index;
      saveState();
      updateSelectionUI();
      renderPreview();
      
      const tr = checkbox.closest('tr');
      if (tr) {
        tr.classList.toggle('row-selected', checkbox.checked);
      }
    }
    return;
  }

  const statusBadge = e.target.closest('.badge-status-toggle');
  if (statusBadge) {
    const index = parseInt(statusBadge.dataset.index, 10);
    if (!isNaN(index) && state.vouchers[index]) {
      const v = state.vouchers[index];
      v.printed = !v.printed;
      v.printedAt = v.printed ? new Date().toISOString() : null;
      logActivity('STATUS_CHANGE', `Ubah status [${v.code}] menjadi ${v.printed ? 'Sudah Dicetak' : 'Belum Dicetak'}`);
      saveState();
      checkStockAlerts();
      renderQuickPOSGrid();
      renderTable();
      renderPreview();
    }
    return;
  }

  const deleteBtn = e.target.closest('.btn-delete-row');
  if (deleteBtn) {
    const index = parseInt(deleteBtn.dataset.index, 10);
    if (!isNaN(index)) deleteVoucher(index);
  }
}

function toggleSelectedPrintedStatus() {
  const selected = getSelectedVouchers();
  if (selected.length === 0) {
    showToast('Pilih minimal 1 voucher dengan mencentang kotak ceklis.', 'error');
    return;
  }

  const unprintedCount = selected.filter(v => !v.printed).length;
  const targetStatus = unprintedCount > 0;

  selected.forEach(v => {
    v.printed = targetStatus;
    v.printedAt = targetStatus ? new Date().toISOString() : null;
  });

  logActivity('STATUS_CHANGE', `Ubah status ${selected.length} voucher menjadi "${targetStatus ? 'Sudah Dicetak' : 'Belum Dicetak'}"`);
  saveState();
  checkStockAlerts();
  triggerBackgroundAutoSync();
  renderQuickPOSGrid();
  renderTable();
  renderPreview();
  showToast(`${selected.length} voucher ditandai sebagai "${targetStatus ? 'Sudah Dicetak' : 'Belum Dicetak'}"`);
}

function updateSelectionUI() {
  const total = state.vouchers.length;
  const unprintedCount = state.vouchers.filter(v => !v.printed).length;
  const printedCount = total - unprintedCount;
  const selectedCount = getSelectedVouchers().length;

  setText('voucher-count', total);
  setText('count-all', total);
  setText('count-unprinted', unprintedCount);
  setText('count-printed', printedCount);

  setText('selected-info', `${selectedCount} dari ${total} dipilih`);
  setText('btn-print-count', selectedCount);

  const filtered = getFilteredVouchersWithIndices();
  const filteredSelectedCount = filtered.filter(({ voucher }) => voucher.selected).length;

  const checkAllBox = $id('check-all');
  if (checkAllBox) {
    if (filtered.length === 0) {
      checkAllBox.checked = false;
      checkAllBox.indeterminate = false;
    } else if (filteredSelectedCount === filtered.length) {
      checkAllBox.checked = true;
      checkAllBox.indeterminate = false;
    } else if (filteredSelectedCount === 0) {
      checkAllBox.checked = false;
      checkAllBox.indeterminate = false;
    } else {
      checkAllBox.checked = false;
      checkAllBox.indeterminate = true;
    }
  }

  const printBtn = $id('btn-print');
  if (printBtn) {
    if (selectedCount === 0 && total > 0) {
      printBtn.style.opacity = '0.5';
    } else {
      printBtn.style.opacity = '1';
    }
  }
}

// ===== DELETE & CLEAR =====
function deleteVoucher(index) {
  const v = state.vouchers[index];
  if (v) {
    logActivity('DELETE', `Hapus 1 voucher [${v.code}]`);
  }
  state.vouchers.splice(index, 1);
  saveState();
  checkStockAlerts();
  triggerBackgroundAutoSync();
  renderQuickPOSGrid();
  renderTable();
  renderPreview();
}

function confirmDeleteSelected() {
  const selected = getSelectedVouchers();
  if (selected.length === 0) {
    showToast('Pilih voucher yang ingin dihapus dengan mencentang kotak ceklis.', 'error');
    return;
  }

  const html = `
    <div class="modal-header">
      <h3>Hapus Voucher Terpilih</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
    </div>
    <div class="modal-body">
      <p style="font-size:0.88rem;color:var(--text);">Yakin ingin menghapus <strong>${selected.length}</strong> voucher yang dicentang dari daftar?</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button class="btn btn-danger" id="btn-confirm-delete-sel">Hapus ${selected.length} Voucher</button>
    </div>
  `;

  openModal(html);
  on('btn-confirm-delete-sel', () => {
    logActivity('DELETE', `Hapus batch ${selected.length} voucher`);
    state.vouchers = state.vouchers.filter(v => v.selected === false);
    saveState();
    checkStockAlerts();
    triggerBackgroundAutoSync();
    renderQuickPOSGrid();
    renderTable();
    renderPreview();
    closeModal();
    showToast(`${selected.length} voucher terpilih telah dihapus`);
  });
}

// ===== MODAL UTILS =====
function openModal(html, extraClass = '') {
  const content = $id('modal-content');
  if (content) {
    content.className = 'modal-content' + (extraClass ? ' ' + extraClass : '');
    if (html) content.innerHTML = html;
  }
  const overlay = $id('modal-overlay');
  if (overlay) overlay.classList.add('active');
  setTimeout(() => {
    const input = content?.querySelector('input');
    if (input) input.focus();
  }, 100);
}

function closeModal() {
  const overlay = $id('modal-overlay');
  if (overlay) overlay.classList.remove('active');
  const content = $id('modal-content');
  if (content) {
    content.className = 'modal-content';
  }
}

// ===== RENDER TABLE =====
function renderTable() {
  const tbody = $id('voucher-table');
  const empty = $id('empty-state');
  if (!tbody || !empty) return;

  const filtered = getFilteredVouchersWithIndices();
  const total = state.vouchers.length;

  if (total === 0 || filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    if (total > 0 && filtered.length === 0) {
      const p = empty.querySelector('p');
      const hint = empty.querySelector('.hint');
      if (p) p.textContent = 'Tidak ada voucher yang cocok dengan filter / pencarian ini';
      if (hint) hint.textContent = 'Coba bersihkan kolom pencarian atau ubah filter';
    } else {
      const p = empty.querySelector('p');
      const hint = empty.querySelector('.hint');
      if (p) p.textContent = 'Belum Ada Data Voucher Hotspot';
      if (hint) hint.textContent = 'Import file dari Ruijie Cloud, sinkronkan Google Sheets, atau tambah voucher manual untuk mulai mencetak';
    }
    updateSelectionUI();
    return;
  }

  empty.style.display = 'none';
  const startNum = parseInt(state.settings.startNumber, 10) || 1;

  tbody.innerHTML = filtered.map(({ voucher: v, originalIndex: i }) => {
    const isSelected = v.selected !== false;
    const rowClass = isSelected ? 'row-selected' : '';
    const isPrinted = !!v.printed;
    const statusBadge = isPrinted
      ? `<span class="badge-status badge-status-printed badge-status-toggle" data-index="${i}" title="Klik untuk ubah status">⚪ Sudah Dicetak</span>`
      : `<span class="badge-status badge-status-unprinted badge-status-toggle" data-index="${i}" title="Klik untuk ubah status">🟢 Belum Dicetak</span>`;

    const resellerBadge = v.resellerName
      ? `<span class="badge-reseller" title="Dititipkan ke ${esc(v.resellerName)}">🏪 ${esc(v.resellerName)}</span>`
      : `<span style="color:var(--text-muted);font-size:0.75rem;">-</span>`;

    return `
      <tr class="${rowClass}">
        <td class="col-check">
          <input type="checkbox" class="row-checkbox" data-index="${i}" ${isSelected ? 'checked' : ''}>
        </td>
        <td class="col-no">#${String(startNum + i).padStart(3, '0')}</td>
        <td class="col-code">${esc(v.code)}</td>
        <td>${esc(v.paket)}</td>
        <td>${v.harga ? state.settings.pricePrefix + formatNumber(v.harga) : '-'}</td>
        <td>${esc(v.periode) || '-'}</td>
        <td>${resellerBadge}</td>
        <td>${statusBadge}</td>
        <td class="col-action admin-only">
          <button class="btn-icon btn-delete-row" data-index="${i}" title="Hapus voucher ini">🗑</button>
        </td>
      </tr>
    `;
  }).join('');

  updateSelectionUI();
}

// ===== RENDER PREVIEW =====
function renderPreview() {
  const container = $id('preview-grid');
  if (!container) return;

  const badge = $id('preview-layout-badge');
  const { settings } = state;
  let vouchersToRender = getSelectedVouchers();
  let isDummyMode = false;

  const layoutVal = settings.layout || '25';
  const isThermal = layoutVal.startsWith('thermal');

  if (badge) {
    if (layoutVal === 'thermal-58') badge.textContent = 'Thermal 58mm';
    else if (layoutVal === 'thermal-80') badge.textContent = 'Thermal 80mm';
    else if (layoutVal === 'label-103') badge.textContent = 'Label TJ 103 (12/hal)';
    else if (layoutVal === 'label-108') badge.textContent = 'Label TJ 108 (40/hal)';
    else if (layoutVal === 'label-121') badge.textContent = 'Label TJ 121 (10/hal)';
    else badge.textContent = `A4 ${layoutVal}/hal`;
  }

  if (state.vouchers.length === 0) {
    vouchersToRender = SAMPLE_DUMMY_VOUCHERS;
    isDummyMode = true;
  } else if (vouchersToRender.length === 0) {
    container.innerHTML = '<div class="preview-empty">⚠️ Tidak ada voucher yang dicentang.<br>Klik tombol <strong>"🟢 Belum Dicetak"</strong> atau centang kotak pada tabel untuk mencetak.</div>';
    return;
  }

  const startNum = parseInt(settings.startNumber, 10) || 1;
  const dummyBanner = isDummyMode
    ? '<div class="preview-dummy-banner">✨ Pratinjau Desain Aktif (Data Contoh — Silakan Import File Ruijie / Spreadsheet)</div>'
    : '';

  if (isThermal) {
    const cards = vouchersToRender.map((v, vi) => {
      const num = startNum + vi;
      return buildCardHTML(v, num, settings, true);
    }).join('');

    container.innerHTML = `${dummyBanner}<div class="preview-page layout-${layoutVal}">${cards}</div>`;
    return;
  }

  let perPage = 25;
  if (layoutVal === 'label-103') perPage = 12;
  else if (layoutVal === 'label-108') perPage = 40;
  else if (layoutVal === 'label-121') perPage = 10;
  else perPage = Math.max(1, parseInt(layoutVal, 10) || 25);

  const pages = chunkArray(vouchersToRender, perPage);
  const layoutClass = `layout-${layoutVal}`;

  const maxPreviewPages = Math.min(pages.length, 2);
  const previewPages = pages.slice(0, maxPreviewPages);

  let html = previewPages.map((pageVouchers, pi) => {
    const cards = pageVouchers.map((v, vi) => {
      const num = startNum + pi * perPage + vi;
      return buildCardHTML(v, num, settings, true);
    }).join('');

    const remaining = perPage - pageVouchers.length;
    const empties = remaining > 0 ? Array(remaining).fill('<div class="v-card-preview" style="opacity:0.15;border-style:dashed;"></div>').join('') : '';

    return `<div class="preview-page ${layoutClass}">${cards}${empties}</div>`;
  }).join('');

  if (pages.length > maxPreviewPages && !isDummyMode) {
    html += `<div class="preview-more">➕ ${pages.length - maxPreviewPages} halaman berikutnya siap dicetak (Total ${pages.length} lembar / ${vouchersToRender.length} voucher terpilih)</div>`;
  }

  container.innerHTML = dummyBanner + html;
}

// ===== CARD TEMPLATE BUILDER =====
function buildCardHTML(v, num, settings, isPreview) {
  const prefix = isPreview ? 'v-card-preview' : 'v-card';
  const themeClass = settings.theme || 'theme-blue';
  const snFormatted = String(num).padStart(3, '0');

  const ssidText = settings.ssid ? `📶 WiFi: ${esc(settings.ssid)}` : '';
  const logoPos = settings.logoPos || 'center';

  let headerHtml = '';

  if (settings.logo) {
    if (logoPos === 'left') {
      headerHtml = `
        <div class="v-top v-header-left">
          <div class="v-left-brand">
            <img class="v-logo-side" src="${settings.logo}" alt="Logo">
            <div class="v-ssid-inline">${ssidText || 'WIFI HOTSPOT'}</div>
          </div>
          <div class="v-sn-badge">
            <span class="v-sn-label">#</span>
            <span class="v-sn-val">${snFormatted}</span>
          </div>
        </div>
      `;
    } else {
      headerHtml = `
        <div class="v-top v-header-center">
          <div class="v-logo-row">
            <img class="v-logo-wide" src="${settings.logo}" alt="Logo">
            <div class="v-sn-badge">
              <span class="v-sn-label">#</span>
              <span class="v-sn-val">${snFormatted}</span>
            </div>
          </div>
          ${ssidText ? `<div class="v-ssid-bar">${ssidText}</div>` : ''}
        </div>
      `;
    }
  } else {
    headerHtml = `
      <div class="v-top v-header-center">
        <div class="v-no-logo-header">
          <div class="v-no-logo-ssid">${ssidText || 'WIFI HOTSPOT'}</div>
          <div class="v-sn-badge">
            <span class="v-sn-label">#</span>
            <span class="v-sn-val">${snFormatted}</span>
          </div>
        </div>
      </div>
    `;
  }

  const heroRowHtml = `
    <div class="v-hero-row">
      <div class="v-code-box">
        <div class="v-code-label">KODE VOUCHER / PASSWORD</div>
        <div class="v-code-value">${esc(v.code)}</div>
      </div>
    </div>
  `;

  let subItems = [];
  if (settings.showSpeed && v.speed) {
    subItems.push(`<span class="v-sub-item">⚡ ${esc(v.speed)}</span>`);
  }
  if (settings.showQuota && v.quota) {
    subItems.push(`<span class="v-sub-item">📦 ${esc(v.quota)}</span>`);
  }
  const subGridHtml = subItems.length > 0 ? `<div class="v-sub-grid">${subItems.join('')}</div>` : '';

  const footerHtml = settings.showHint && settings.loginHint
    ? `<div class="v-footer"><span class="v-hint">${esc(settings.loginHint)}</span></div>`
    : '';

  const priceHtml = v.harga
    ? `<div class="v-meta-item v-meta-price"><span class="v-meta-val">${settings.pricePrefix}${formatNumber(v.harga)}</span></div>`
    : '';

  const bgStyle = settings.bgImage
    ? `background-image: url('${settings.bgImage}'); opacity: ${(settings.bgOpacity || 20) / 100};`
    : 'display:none;';

  const watermarkHtml = settings.showWatermark && settings.watermarkText
    ? `<div class="v-card-watermark">${esc(settings.watermarkText)}</div>`
    : '';

  return `
    <div class="${prefix} ${themeClass}">
      <div class="v-card-bg-layer" style="${bgStyle}"></div>
      ${watermarkHtml}
      <div class="v-card-content">
        ${headerHtml}
        ${heroRowHtml}

        <div class="v-meta-grid">
          <div class="v-meta-item v-meta-profile">
            <span class="v-meta-tag">${esc(v.paket) || 'VOUCHER'}</span>
          </div>
          <div class="v-meta-item v-meta-period">
            <span class="v-meta-val">${esc(v.periode) || '-'}</span>
          </div>
          ${priceHtml}
        </div>

        ${subGridHtml}
        ${footerHtml}
      </div>
    </div>
  `;
}

// ===== 🧾 THERMAL RECEIPT BUILDER (AUTHENTIC POS FORMAT) =====
function buildThermalReceiptHTML(v, num, settings, widthMm = 58) {
  const snFormatted = String(num).padStart(3, '0');
  const ssidText = settings.ssid || 'WIFI HOTSPOT';
  const activePreset = state.presets.find(p => p.id === state.activePresetId) || DEFAULT_PRESET;
  const storeName = activePreset.name || 'WIFI HOTSPOT';
  const is80 = widthMm >= 80;

  return `
    <div class="thermal-receipt-box" style="font-family:monospace,'Courier New',Courier,sans-serif;color:#000;background:#ffffff;text-align:center;width:${is80 ? '76mm' : '54mm'};margin:0 auto 3mm;padding:2.5mm 1.5mm;line-height:1.25;box-sizing:border-box;">
      <!-- Store & SSID Header -->
      <div style="font-weight:900;font-size:${is80 ? '12.5pt' : '10pt'};text-transform:uppercase;letter-spacing:0.02em;margin-bottom:1px;color:#000;">
        ${esc(storeName)}
      </div>
      <div style="font-size:${is80 ? '9.5pt' : '8pt'};color:#000;margin-bottom:2px;">
        📶 SSID: <strong>${esc(ssidText)}</strong>
      </div>
      
      <div style="border-top:1px dashed #000;margin:3px 0;"></div>
      
      <!-- Voucher Details -->
      <div style="display:flex;justify-content:space-between;font-size:${is80 ? '9pt' : '8pt'};font-weight:bold;margin:2px 0;color:#000;">
        <span>#${snFormatted} • ${esc(v.paket || 'VOUCHER')}</span>
        <span>${settings.pricePrefix || 'Rp '}${formatNumber(v.harga || 0)}</span>
      </div>
      
      <!-- Big Coupon Code Box -->
      <div style="border:1.5px dashed #000;border-radius:4px;padding:3mm 1mm;margin:2.5mm 0;background:#fff;">
        <div style="font-size:${is80 ? '7.5pt' : '6.5pt'};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;color:#000;">
          KODE VOUCHER / PASSWORD
        </div>
        <div style="font-size:${is80 ? '16pt' : '13pt'};font-weight:900;letter-spacing:0.08em;font-family:monospace;color:#000;">
          ${esc(v.code)}
        </div>
      </div>
      
      <!-- Meta Details (Durasi, Kecepatan, Kuota) -->
      <div style="font-size:${is80 ? '8.5pt' : '7.5pt'};text-align:left;margin:2px 0;color:#000;">
        <div style="display:flex;justify-content:space-between;margin-bottom:1px;">
          <span>⏱️ Masa Aktif:</span>
          <strong>${esc(v.periode || '-')}</strong>
        </div>
        ${settings.showSpeed && v.speed ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:1px;">
            <span>⚡ Kecepatan:</span>
            <strong>${esc(v.speed)}</strong>
          </div>
        ` : ''}
        ${settings.showQuota && v.quota ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:1px;">
            <span>📦 Kuota:</span>
            <strong>${esc(v.quota)}</strong>
          </div>
        ` : ''}
      </div>
      
      <!-- Login Hint / Footer -->
      ${settings.showHint && settings.loginHint ? `
        <div style="border-top:1px dashed #000;margin:3px 0 2px;"></div>
        <div style="font-size:${is80 ? '8pt' : '6.8pt'};color:#000;line-height:1.2;font-style:italic;">
          ${esc(settings.loginHint)}
        </div>
      ` : ''}
      
      <div style="border-top:1px dashed #000;margin:3px 0 2px;"></div>
      <div style="font-size:${is80 ? '7.5pt' : '6.5pt'};color:#000;">
        Terima Kasih • Selamat Berinternet
      </div>
    </div>
  `;
}

// ===== PRINT BUILDER =====
function buildPrintArea(selectedVouchers, layoutVal) {
  const printArea = $id('print-area');
  if (!printArea) return;
  printArea.innerHTML = '';

  preparePrintStyles(layoutVal);

  const fragment = document.createDocumentFragment();
  const startNum = parseInt(state.settings.startNumber, 10) || 1;
  const isThermal = layoutVal.startsWith('thermal');

  if (isThermal) {
    const pageEl = document.createElement('div');
    pageEl.className = `print-page layout-${layoutVal}`;
    const widthMm = layoutVal === 'thermal-80' ? 80 : 58;

    let html = selectedVouchers.map((v, vi) => {
      const num = startNum + vi;
      return buildThermalReceiptHTML(v, num, state.settings, widthMm);
    }).join('');

    pageEl.innerHTML = html;
    fragment.appendChild(pageEl);
  } else {
    let perPage = 25;
    if (layoutVal === 'label-103') perPage = 12;
    else if (layoutVal === 'label-108') perPage = 40;
    else if (layoutVal === 'label-121') perPage = 10;
    else perPage = Math.max(1, parseInt(layoutVal, 10) || 25);

    const pages = chunkArray(selectedVouchers, perPage);
    const layoutClass = `layout-${layoutVal}`;

    for (let pi = 0; pi < pages.length; pi++) {
      const pageVouchers = pages[pi];
      const pageEl = document.createElement('div');
      pageEl.className = `print-page ${layoutClass}`;

      let pageHtml = '';
      for (let vi = 0; vi < pageVouchers.length; vi++) {
        const v = pageVouchers[vi];
        const num = startNum + pi * perPage + vi;
        pageHtml += buildCardHTML(v, num, state.settings, false);
      }

      const remaining = perPage - pageVouchers.length;
      if (remaining > 0) {
        pageHtml += Array(remaining).fill('<div class="v-card v-card-empty"></div>').join('');
      }

      // Free Tier Printable Watermark
      if (!state.isPro) {
        pageHtml += `<div class="print-free-watermark">⚡ Cetak Voucher Ruijie (Free Version • https://cetakvoucher.harojuan.net) — Upgrade PRO untuk hapus watermark</div>`;
      }

      pageEl.innerHTML = pageHtml;
      fragment.appendChild(pageEl);
    }
  }

  printArea.appendChild(fragment);
}

function getPageCapacity(layout) {
  switch (layout) {
    case '80': return 80;
    case '60': return 60;
    case '50': return 50;
    case '40': return 40;
    case '30': return 30;
    case '25': return 25;
    case '20': return 20;
    case '16': return 16;
    case '10': return 10;
    case 'thermal-58':
    case 'thermal-80': return 1;
    case 'label-103': return 12;
    case 'label-108': return 40;
    case 'label-121': return 10;
    default: return 25;
  }
}

function handlePrint() {
  if (state.vouchers.length === 0) {
    showToast('Belum ada voucher. Silakan import file dari Ruijie Cloud terlebih dahulu.', 'error');
    return;
  }

  showPrintBatchModal();
}

function showPrintBatchModal() {
  const layoutVal = state.settings.layout || '25';
  const perPage = getPageCapacity(layoutVal);
  const unprinted = state.vouchers.filter(v => !v.printed);
  const availablePages = Math.max(1, Math.ceil(unprinted.length / perPage));
  const totalCount = unprinted.length;

  const html = `
    <div class="modal-header">
      <h3>🖨️ Cetak Voucher Sesuai Lembar (Batch)</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
    </div>
    <div class="modal-body">
      <div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius-xs);padding:0.9rem;margin-bottom:1.15rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
        <div>
          <div style="font-size:0.8rem;color:var(--text-secondary);">Stok Voucher Belum Dicetak:</div>
          <div style="font-size:1.15rem;font-weight:900;color:var(--success);">
            🟢 ${totalCount} Voucher <span style="font-size:0.82rem;font-weight:600;color:var(--text-secondary);">(${availablePages} lembar A4 @ ${perPage} pcs)</span>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:0.75rem;color:var(--text-secondary);">Layout Kertas:</div>
          <div style="font-size:0.88rem;font-weight:750;color:var(--primary);">${perPage} Voucher / Lembar</div>
        </div>
      </div>

      <div style="font-size:0.86rem;font-weight:800;color:var(--text);margin-bottom:0.65rem;">
        Pilih Berapa Lembar yang Ingin Dicetak Sekarang:
      </div>

      <!-- Quick Batch Buttons -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:0.55rem;margin-bottom:1.15rem;">
        <button class="btn btn-secondary btn-batch-opt" onclick="executeBatchPrint(1, ${perPage})" style="padding:0.85rem 0.5rem;text-align:center;flex-direction:column;gap:3px;">
          <span style="font-size:1rem;font-weight:850;">📄 1 Lembar</span>
          <span style="color:var(--text-muted);font-size:0.72rem;">(${Math.min(totalCount || perPage, perPage * 1)} voucher)</span>
        </button>

        ${availablePages >= 2 ? `
          <button class="btn btn-secondary btn-batch-opt" onclick="executeBatchPrint(2, ${perPage})" style="padding:0.85rem 0.5rem;text-align:center;flex-direction:column;gap:3px;">
            <span style="font-size:1rem;font-weight:850;">📄📄 2 Lembar</span>
            <span style="color:var(--text-muted);font-size:0.72rem;">(${Math.min(totalCount, perPage * 2)} voucher)</span>
          </button>
        ` : ''}

        ${availablePages >= 3 ? `
          <button class="btn btn-secondary btn-batch-opt" onclick="executeBatchPrint(3, ${perPage})" style="padding:0.85rem 0.5rem;text-align:center;flex-direction:column;gap:3px;">
            <span style="font-size:1rem;font-weight:850;">📄 3 Lembar</span>
            <span style="color:var(--text-muted);font-size:0.72rem;">(${Math.min(totalCount, perPage * 3)} voucher)</span>
          </button>
        ` : ''}

        ${availablePages >= 5 ? `
          <button class="btn btn-secondary btn-batch-opt" onclick="executeBatchPrint(5, ${perPage})" style="padding:0.85rem 0.5rem;text-align:center;flex-direction:column;gap:3px;">
            <span style="font-size:1rem;font-weight:850;">📄 5 Lembar</span>
            <span style="color:var(--text-muted);font-size:0.72rem;">(${Math.min(totalCount, perPage * 5)} voucher)</span>
          </button>
        ` : ''}

        ${availablePages >= 10 ? `
          <button class="btn btn-secondary btn-batch-opt" onclick="executeBatchPrint(10, ${perPage})" style="padding:0.85rem 0.5rem;text-align:center;flex-direction:column;gap:3px;">
            <span style="font-size:1rem;font-weight:850;">📄 10 Lembar</span>
            <span style="color:var(--text-muted);font-size:0.72rem;">(${Math.min(totalCount, perPage * 10)} voucher)</span>
          </button>
        ` : ''}
      </div>

      <!-- Custom Page Input Row -->
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-xs);padding:0.85rem;margin-bottom:1rem;">
        <div style="font-size:0.8rem;font-weight:750;color:var(--text);margin-bottom:0.45rem;">
          Atau Masukkan Jumlah Lembar Kustom:
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <input type="number" id="m-batch-custom-pages" class="form-input" min="1" max="${Math.max(1, availablePages)}" value="1" style="width:100px;text-align:center;font-weight:800;font-size:1rem;">
          <span style="font-size:0.85rem;color:var(--text-secondary);">Lembar (<span id="m-batch-voucher-calc">${Math.min(totalCount || perPage, perPage)}</span> voucher)</span>
          <button class="btn btn-primary" style="margin-left:auto;font-weight:800;" onclick="executeCustomBatchPrint(${perPage})">
            🖨️ Cetak Lembar Ini
          </button>
        </div>
      </div>

      ${totalCount > 0 ? `
        <button class="btn btn-secondary" style="width:100%;justify-content:center;font-size:0.82rem;" onclick="executeBatchPrint(${availablePages}, ${perPage})">
          🖨️ Cetak SEMUA Stok Belum Dicetak (${totalCount} Voucher • ${availablePages} Lembar)
        </button>
      ` : `
        <button class="btn btn-secondary" style="width:100%;justify-content:center;font-size:0.82rem;" onclick="executeBatchPrint(1, ${perPage})">
          🔄 Cetak Ulang 1 Lembar (${perPage} Voucher)
        </button>
      `}
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
    </div>
  `;

  openModal(html, 'modal-medium');

  const customInput = $id('m-batch-custom-pages');
  const calcSpan = $id('m-batch-voucher-calc');
  if (customInput && calcSpan) {
    customInput.addEventListener('input', () => {
      const p = Math.max(1, parseInt(customInput.value, 10) || 1);
      const count = Math.min(totalCount || (p * perPage), p * perPage);
      calcSpan.textContent = count;
    });
  }
}

function executeBatchPrint(pages, perPage) {
  const layoutVal = state.settings.layout || '25';
  const neededCount = pages * perPage;
  
  // Ambil hanya voucher yang BELUM dicetak secara berurutan
  let toPrint = state.vouchers.filter(v => !v.printed).slice(0, neededCount);

  // Jika stok belum dicetak kosong (misal reprint), ambil dari awal daftar
  if (toPrint.length === 0) {
    toPrint = state.vouchers.slice(0, neededCount);
  }

  if (toPrint.length === 0) {
    showToast('Tidak ada voucher yang dapat dicetak.', 'error');
    return;
  }

  closeModal();

  // Bangun area print hanya untuk voucher terpilih tersebut
  buildPrintArea(toPrint, layoutVal);

  // Tandai HANYA voucher yang dicetak tersebut sebagai "printed = true"
  toPrint.forEach(v => {
    v.printed = true;
    v.printedAt = new Date().toISOString();
  });

  logActivity('PRINT_BATCH', `Cetak ${pages} lembar (${toPrint.length} voucher) Layout: ${layoutVal}`);
  saveState();
  checkStockAlerts();
  triggerBackgroundAutoSync();

  setTimeout(() => {
    window.print();
    renderQuickPOSGrid();
    renderTable();
    renderPreview();
    showToast(`✅ Berhasil mencetak ${pages} lembar (${toPrint.length} voucher)! Sisa voucher tetap tersimpan di stok.`);
  }, 120);
}

function executeCustomBatchPrint(perPage) {
  const input = $id('m-batch-custom-pages');
  const pages = Math.max(1, parseInt(input?.value, 10) || 1);
  executeBatchPrint(pages, perPage);
}

function onSettingChange() {
  state.settings.ssid = $id('ssid-name')?.value || '';
  state.settings.loginHint = $id('login-hint')?.value || '';
  state.settings.startNumber = Math.max(1, parseInt($id('start-number')?.value, 10) || 1);
  state.settings.layout = $id('layout-select')?.value || '25';
  state.settings.logoPos = $id('logo-pos-select')?.value || 'center';
  state.settings.theme = $id('theme-select')?.value || 'theme-blue';
  state.settings.fontFamily = $id('font-select')?.value || 'font-inter';
  state.settings.borderStyle = $id('border-select')?.value || 'border-dashed';
  state.settings.showSpeed = $id('show-speed')?.checked !== false;
  state.settings.showQuota = $id('show-quota')?.checked !== false;
  state.settings.showHint = $id('show-hint')?.checked !== false;

  applyUIMode();
  saveState();
  renderTable();
  renderPreview();
}

function setFilter(filterName) {
  state.filter = filterName;
  $$('.filter-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === filterName);
  });
  renderTable();
}

// ===== LOCAL STORAGE PERSISTENCE =====
const STORAGE_KEY = 'ruijie_voucher_app_v12_pro_gated';

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save state to localStorage:', e);
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('ruijie_voucher_app_v11_licensed') || localStorage.getItem('ruijie_voucher_app_v10_pro');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.uiMode) state.uiMode = parsed.uiMode;
      if (parsed.themeMode) state.themeMode = parsed.themeMode;
      if (parsed.adminPin) state.adminPin = parsed.adminPin;
      if (parsed.isPro !== undefined) state.isPro = parsed.isPro;
      if (parsed.proLicense) state.proLicense = parsed.proLicense;
      if (parsed.activeShift) state.activeShift = parsed.activeShift;
      if (Array.isArray(parsed.auditLogs)) state.auditLogs = parsed.auditLogs;
      if (Array.isArray(parsed.vouchers)) {
        state.vouchers = parsed.vouchers.map(v => ({
          ...v,
          printed: !!v.printed,
          printedAt: v.printedAt || null,
          resellerId: v.resellerId || null,
          resellerName: v.resellerName || null,
          selected: v.selected !== false
        }));
      }
      if (Array.isArray(parsed.resellers) && parsed.resellers.length > 0) {
        state.resellers = parsed.resellers;
      }
      if (Array.isArray(parsed.presets) && parsed.presets.length > 0) {
        state.presets = parsed.presets;
        state.activePresetId = parsed.activePresetId || state.presets[0].id;
      }
      if (parsed.settings) {
        state.settings = { ...state.settings, ...parsed.settings };
      }
    }
  } catch (e) {
    console.warn('Failed to load state:', e);
  }
}

function restoreUI() {
  setVal('ssid-name', state.settings.ssid || '');
  setVal('login-hint', state.settings.loginHint || '');
  setVal('start-number', state.settings.startNumber || 1);
  setVal('layout-select', state.settings.layout || '25');
  setVal('logo-pos-select', state.settings.logoPos || 'center');
  setVal('theme-select', state.settings.theme || 'theme-blue');
  setVal('font-select', state.settings.fontFamily || 'font-inter');
  setVal('border-select', state.settings.borderStyle || 'border-dashed');
  setVal('sheets-url-input', state.settings.sheetsUrl || '');
  setChecked('show-speed', state.settings.showSpeed !== false);
  setChecked('show-quota', state.settings.showQuota !== false);
  setChecked('show-hint', state.settings.showHint !== false);
  setVal('watermark-text', state.settings.watermarkText || '');
  setChecked('show-watermark', !!state.settings.showWatermark);
  
  $$('.theme-preset-card').forEach(card => {
    card.classList.toggle('active', card.dataset.themePreset === state.settings.theme);
  });

  if (state.settings.bgImage) {
    const wrap = $id('bg-opacity-wrap');
    if (wrap) wrap.style.display = 'block';
    setVal('bg-opacity-slider', state.settings.bgOpacity || 20);
    setText('bg-opacity-val', `${state.settings.bgOpacity || 20}%`);
  }
  updateLogoUI();
}

// ===== UTILS =====
function chunkArray(arr, size) {
  const safeSize = Math.max(1, parseInt(size, 10) || 25);
  const chunks = [];
  for (let i = 0; i < arr.length; i += safeSize) {
    chunks.push(arr.slice(i, i + safeSize));
  }
  return chunks;
}

function formatNumber(num) {
  if (!num) return '0';
  const clean = String(num).replace(/[^\d]/g, '');
  if (!clean) return String(num);
  return parseInt(clean, 10).toLocaleString('id-ID');
}

function esc(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ===== TOAST NOTIFICATION =====
function showToast(message, type = 'success') {
  let toast = $id('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.background = type === 'error' ? '#ef4444' : (state.themeMode === 'dark' ? '#1e293b' : '#0f172a');
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 2800);
}
