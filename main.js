/**
 * Aplikasi Cetak Voucher Ruijie Cloud — POS & Print Studio Pro
 * Features: Settings Tabs (Anti-Clutter), Live Dummy Preview Fallback,
 * Watermark / Stempel Agen, Direct Bluetooth Thermal (ESC/POS), Export PDF,
 * Visual Trend Bar Chart, Dark Mode, Shift Kasir, Reseller & Surat Jalan,
 * Tom & Jerry Sticker Labels, Anti-Deduplication.
 */

// ===== DEFAULT PRESETS & RESELLERS =====
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

// Sample Dummy Vouchers for Live Preview when user has not imported yet
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
  vouchers: [],
  resellers: DEFAULT_RESELLERS,
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
    fontFamily: 'font-inter',
    borderStyle: 'border-dashed',
    layout: '25', // '50' | '30' | '25' | '20' | '16' | 'thermal-58' | 'thermal-80' | 'label-103' | 'label-108' | 'label-121'
    theme: 'theme-blue',
    showQr: true,
    qrUrlTemplate: '',
    showSpeed: true,
    showQuota: true,
    showHint: true,
    loginHint: 'Buka browser utk login',
    startNumber: 1,
    pricePrefix: 'Rp '
  }
};

let lastCheckedIndex = null;

// ===== DOM HELPERS =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const $id = (id) => document.getElementById(id);

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initTheme();
  bindEvents();
  applyUIMode();
  renderPresetSelect();
  renderResellerFilterSelect();
  restoreUI();
  renderQuickPOSGrid();
  renderTable();
  renderPreview();
  initPWA();
});

// ===== THEME ENGINE (DARK / LIGHT MODE) =====
function initTheme() {
  const savedTheme = localStorage.getItem('ruijie_theme_mode') || 'light';
  state.themeMode = savedTheme;
  applyTheme();

  const themeToggle = $id('btn-theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      state.themeMode = state.themeMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('ruijie_theme_mode', state.themeMode);
      applyTheme();
      showToast(`Mode: ${state.themeMode === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}`);
    });
  }
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

// ===== PWA INSTALLATION & SERVICE WORKER =====
let deferredPwaPrompt = null;

function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        console.log('PWA Service Worker registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('PWA Service Worker registration failed:', err);
      });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    const installBtn = $id('btn-install-pwa');
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
      installBtn.addEventListener('click', async () => {
        if (deferredPwaPrompt) {
          deferredPwaPrompt.prompt();
          const { outcome } = await deferredPwaPrompt.userChoice;
          if (outcome === 'accepted') {
            showToast('Aplikasi berhasil dipasang di layar utama!');
            installBtn.style.display = 'none';
          }
          deferredPwaPrompt = null;
        }
      });
    }
  });

  window.addEventListener('appinstalled', () => {
    const installBtn = $id('btn-install-pwa');
    if (installBtn) installBtn.style.display = 'none';
    showToast('Aplikasi Voucher Ruijie siap digunakan secara mandiri!');
  });
}

// ===== EVENT BINDING =====
function bindEvents() {
  // Settings Tab Navigation (Anti-Clutter)
  $$('.btn-setting-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      $$('.btn-setting-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $$('.setting-tab-pane').forEach(pane => {
        pane.style.display = pane.id === `pane-${tabId}` ? 'block' : 'none';
      });
    });
  });

  // Role Mode Switcher with PIN Lock
  $id('btn-mode-admin').addEventListener('click', handleSwitchToAdmin);
  $id('btn-mode-kasir').addEventListener('click', () => setUIMode('kasir'));
  $id('btn-change-pin').addEventListener('click', showChangePinModal);

  // Bluetooth Direct Printing & POS Shift Management
  $id('btn-connect-bluetooth').addEventListener('click', handleConnectBluetooth);
  $id('btn-toggle-shift').addEventListener('click', showShiftModal);

  // Preset Store Manager
  $id('preset-select').addEventListener('change', handlePresetChange);
  $id('btn-save-preset').addEventListener('click', saveCurrentPreset);
  $id('btn-add-preset').addEventListener('click', showAddPresetModal);

  // Reseller & Pro & Rekap Tools
  $id('btn-reseller').addEventListener('click', showResellerModal);
  $id('btn-assign-reseller').addEventListener('click', showAssignResellerModal);
  $id('btn-rekap').addEventListener('click', showRekapModal);
  $id('btn-upgrade-pro').addEventListener('click', showUpgradeProModal);
  $id('btn-export-pdf').addEventListener('click', exportPDF);
  $id('btn-export-png').addEventListener('click', exportPreviewAsPNG);

  // Background Image Upload & Opacity
  $id('btn-upload-bg').addEventListener('click', () => $id('bg-upload').click());
  $id('bg-upload').addEventListener('change', handleBgUpload);
  $id('bg-opacity-slider').addEventListener('input', (e) => {
    state.settings.bgOpacity = parseInt(e.target.value, 10);
    $id('bg-opacity-val').textContent = `${state.settings.bgOpacity}%`;
    saveState();
    renderPreview();
  });
  $id('btn-remove-bg').addEventListener('click', removeBackground);

  // Watermark / Stempel
  $id('watermark-text').addEventListener('input', (e) => {
    state.settings.watermarkText = e.target.value.trim();
    saveState();
    renderPreview();
  });
  $id('show-watermark').addEventListener('change', (e) => {
    state.settings.showWatermark = e.target.checked;
    saveState();
    renderPreview();
  });

  // Live Search & Toolbar Filters
  const searchInput = $id('search-input');
  const searchClear = $id('search-clear-btn');
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim().toLowerCase();
    searchClear.style.display = state.searchQuery ? 'block' : 'none';
    renderTable();
    renderPreview();
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    searchClear.style.display = 'none';
    renderTable();
    renderPreview();
  });

  // Global search shortcut '/'
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput && !$('#modal-overlay').classList.contains('active')) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  $id('filter-reseller-select').addEventListener('change', (e) => {
    state.filterReseller = e.target.value;
    renderTable();
    renderPreview();
  });

  $id('auto-archive-toggle').addEventListener('change', (e) => {
    state.autoArchive24h = e.target.checked;
    renderTable();
    renderPreview();
  });

  // Settings & Branding
  $id('logo-upload').addEventListener('change', handleLogoUpload);
  $id('logo-area').addEventListener('click', () => $id('logo-upload').click());
  $id('ssid-name').addEventListener('input', onSettingChange);
  $id('login-hint').addEventListener('input', onSettingChange);
  $id('qr-url-template').addEventListener('input', onSettingChange);
  $id('start-number').addEventListener('input', onSettingChange);
  $id('layout-select').addEventListener('change', onSettingChange);
  $id('logo-pos-select').addEventListener('change', onSettingChange);
  $id('theme-select').addEventListener('change', onSettingChange);
  $id('font-select').addEventListener('change', onSettingChange);
  $id('border-select').addEventListener('change', onSettingChange);
  $id('show-qr').addEventListener('change', onSettingChange);
  $id('show-speed').addEventListener('change', onSettingChange);
  $id('show-quota').addEventListener('change', onSettingChange);
  $id('show-hint').addEventListener('change', onSettingChange);

  // Actions & File Import
  $id('btn-add').addEventListener('click', showAddModal);
  $id('btn-import').addEventListener('click', () => $id('csv-file').click());
  $id('csv-file').addEventListener('change', handleFileInput);
  $id('btn-toggle-printed').addEventListener('click', toggleSelectedPrintedStatus);
  $id('btn-delete-selected').addEventListener('click', confirmDeleteSelected);
  $id('btn-print').addEventListener('click', handlePrint);

  // Filter Tabs
  $id('tab-all').addEventListener('click', () => setFilter('all'));
  $id('tab-unprinted').addEventListener('click', () => setFilter('unprinted'));
  $id('tab-printed').addEventListener('click', () => setFilter('printed'));

  // Checkbox Selection Controls
  $id('check-all').addEventListener('change', handleCheckAll);
  $id('btn-select-unprinted').addEventListener('click', selectUnprintedOnly);
  $id('btn-select-all').addEventListener('click', () => selectAll(true));
  $id('btn-deselect-all').addEventListener('click', () => selectAll(false));
  $id('btn-select-page').addEventListener('click', selectOnePageUnprinted);

  // Table row click delegation
  $id('voucher-table').addEventListener('click', handleTableClick);

  // Modal close
  $id('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
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
  $id('btn-mode-admin').classList.toggle('active', state.uiMode === 'admin');
  $id('btn-mode-kasir').classList.toggle('active', state.uiMode === 'kasir');
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
    const entered = $id('m-pin-input').value.trim();
    if (entered === (state.adminPin || '1234')) {
      closeModal();
      onSuccess();
    } else {
      showToast('PIN Admin salah!', 'error');
      $id('m-pin-input').value = '';
      $id('m-pin-input').focus();
    }
  };

  $id('btn-verify-pin').addEventListener('click', verify);
  $id('m-pin-input').addEventListener('keydown', (e) => {
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

  $id('btn-save-new-pin').addEventListener('click', () => {
    const oldPin = $id('m-old-pin').value.trim();
    const newPin = $id('m-new-pin').value.trim();
    const confirmPin = $id('m-confirm-pin').value.trim();

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

// ===== DIRECT WEB BLUETOOTH PRINTING (ESC/POS) =====
async function handleConnectBluetooth() {
  if (!navigator.bluetooth) {
    showToast('Browser ini belum mendukung Web Bluetooth (Gunakan Google Chrome di Android / Laptop).', 'error');
    return;
  }

  try {
    showToast('Mencari printer Bluetooth thermal...');
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', 0xFFE0]
    });

    state.bluetoothDevice = device;
    $id('btn-connect-bluetooth').textContent = `📶 ${device.name || 'Printer Terhubung'}`;
    $id('btn-connect-bluetooth').classList.add('btn-primary');
    showToast(`Berhasil terhubung ke: ${device.name || 'Printer Bluetooth'}`);
  } catch (err) {
    console.warn('Bluetooth connect error:', err);
    if (err.name !== 'NotFoundError') {
      showToast('Gagal menghubungkan printer Bluetooth.', 'error');
    }
  }
}

// ===== BACKGROUND CARD IMAGE =====
function handleBgUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    state.settings.bgImage = evt.target.result;
    $id('bg-opacity-wrap').style.display = 'block';
    saveState();
    renderPreview();
    showToast('Background gambar berhasil diterapkan!');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function removeBackground() {
  state.settings.bgImage = null;
  $id('bg-opacity-wrap').style.display = 'none';
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

  $id('btn-save-open-shift').addEventListener('click', () => {
    state.activeShift = {
      id: 'shift_' + Date.now(),
      cashierName: $id('m-shift-cashier').value.trim() || 'Kasir',
      startTime: new Date().toISOString(),
      startCash: parseFloat($id('m-shift-start-cash').value) || 0,
      salesCount: 0,
      salesOmset: 0,
      closed: false
    };
    saveState();
    if ($id('pos-cashier-name')) $id('pos-cashier-name').textContent = state.activeShift.cashierName;
    closeModal();
    showToast(`Shift dibuka untuk kasir: ${state.activeShift.cashierName}`);
  });

  $id('btn-print-close-shift').addEventListener('click', printCloseShiftReceipt);
}

function printCloseShiftReceipt() {
  const shift = state.activeShift || {};
  const activePreset = state.presets.find(p => p.id === state.activePresetId) || DEFAULT_PRESET;
  const sDate = new Date(shift.startTime || Date.now());
  const now = new Date();

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
  printArea.innerHTML = receiptHtml;
  window.print();
}

// ===== 📄 EXPORT PDF (PRESISI UKURAN) =====
function exportPDF() {
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

// ===== 🖼️ EXPORT PREVIEW AS PNG (SIAP FOTOKOPI) =====
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

  $id('pos-today-count').textContent = todayCount;
  $id('pos-today-omset').textContent = `Rp ${formatNumber(todayOmset)}`;
  if ($id('pos-cashier-name')) {
    $id('pos-cashier-name').textContent = (state.activeShift && state.activeShift.cashierName) || 'Umum';
  }

  const pkgs = Object.values(pkgMap);
  if (pkgs.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;color:var(--text-muted);font-size:0.85rem;padding:0.75rem;">
        Belum ada paket voucher. Klik tombol <strong>"📁 Import File Ruijie"</strong> atau <strong>"＋ Tambah"</strong> untuk mulai.
      </div>
    `;
    return;
  }

  container.innerHTML = pkgs.map(p => `
    <button class="btn-pos-pkg" data-pkg="${esc(p.name)}" ${p.unprintedCount === 0 ? 'disabled' : ''}>
      <div class="pos-pkg-name">⚡ ${esc(p.name)}</div>
      <div class="pos-pkg-price">Rp ${formatNumber(p.harga)}</div>
      <div class="pos-pkg-stock-badge ${p.unprintedCount === 0 ? 'empty' : ''}">
        ${p.unprintedCount > 0 ? `📦 Sisa: ${p.unprintedCount} pcs` : '❌ Habis'}
      </div>
    </button>
  `).join('');

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
  });

  const layoutVal = state.settings.layout || 'thermal-58';
  buildPrintArea(toPrint, layoutVal);

  saveState();

  setTimeout(() => {
    window.print();
    renderQuickPOSGrid();
    renderTable();
    renderPreview();
    showToast(`⚡ Berhasil cetak 1 voucher ${pkgName}!`);
  }, 100);
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
  const resellerStats = {};
  state.resellers.forEach(r => {
    resellerStats[r.id] = { reseller: r, totalVouchers: 0, printedVouchers: 0, unprintedVouchers: 0, totalOmset: 0, piutang: 0 };
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
    const s = resellerStats[r.id];
    return `
      <div class="reseller-card">
        <div class="reseller-card-header">
          <div class="reseller-name">🏪 ${esc(r.name)}</div>
          <button class="btn btn-secondary btn-sm" onclick="printSuratJalan('${r.id}')" title="Cetak Surat Jalan Titip Voucher">📄 Surat Jalan</button>
        </div>
        <div class="reseller-meta">📞 ${esc(r.phone || '-')} • 📍 ${esc(r.address || '-')}</div>
        <div class="reseller-stat-row">
          <span>Stok Dititip: <strong>${s.totalVouchers} pcs</strong></span>
          <span style="color:var(--success);">Terjual: <strong>${s.printedVouchers} pcs</strong></span>
        </div>
        <div class="reseller-stat-row">
          <span>Nilai Titipan:</span>
          <strong style="color:var(--primary);">Rp ${formatNumber(s.totalOmset)}</strong>
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
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.85rem;">
        <p style="font-size:0.82rem;color:var(--text-secondary);">Kelola warung/agen tempat menitipkan voucher WiFi dan pantau piutang.</p>
        <button class="btn btn-primary btn-sm" id="btn-add-new-reseller">＋ Tambah Reseller</button>
      </div>

      <div class="reseller-card-grid">
        ${cardsHtml || '<div style="color:var(--text-muted);">Belum ada reseller. Klik "Tambah Reseller" untuk mulai.</div>'}
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="closeModal()">Tutup</button>
    </div>
  `;

  openModal(html, 'modal-wide');
  $id('btn-add-new-reseller').addEventListener('click', showAddResellerForm);
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

  $id('btn-save-reseller').addEventListener('click', () => {
    const name = $id('m-res-name').value.trim();
    if (!name) {
      showToast('Nama reseller wajib diisi', 'error');
      $id('m-res-name').focus();
      return;
    }

    const newRes = {
      id: 'res_' + Date.now(),
      name: name,
      phone: $id('m-res-phone').value.trim(),
      address: $id('m-res-address').value.trim(),
      note: $id('m-res-note').value.trim()
    };

    state.resellers.push(newRes);
    saveState();
    renderResellerFilterSelect();
    showToast(`Reseller "${name}" berhasil ditambahkan!`);
    showResellerModal();
  });
}

function showAssignResellerModal() {
  const selected = getSelectedVouchers();
  if (selected.length === 0) {
    showToast('Pilih voucher yang ingin dititipkan dengan mencentang kotak ceklis.', 'error');
    return;
  }

  const optionsHtml = state.resellers.map(r => `<option value="${r.id}">🏪 ${esc(r.name)} (${esc(r.phone || '-')})</option>`).join('');

  const html = `
    <div class="modal-header">
      <h3>Titipkan ${selected.length} Voucher ke Warung/Agen</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
    </div>
    <div class="modal-body">
      <p style="font-size:0.85rem;color:var(--text);margin-bottom:0.85rem;">
        Anda akan menandai <strong>${selected.length}</strong> voucher terpilih sebagai titipan ke reseller berikut:
      </p>
      <div class="form-group">
        <label for="m-assign-reseller-select">Pilih Reseller / Warung *</label>
        <select id="m-assign-reseller-select" class="form-input">
          <option value="">-- Batal Titip / Hapus Status Reseller --</option>
          ${optionsHtml}
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" id="btn-confirm-assign-reseller">Simpan Penugasan</button>
    </div>
  `;

  openModal(html);

  $id('btn-confirm-assign-reseller').addEventListener('click', () => {
    const resId = $id('m-assign-reseller-select').value;
    const targetRes = state.resellers.find(r => r.id === resId);

    selected.forEach(v => {
      v.resellerId = resId || null;
      v.resellerName = targetRes ? targetRes.name : null;
    });

    saveState();
    renderTable();
    renderPreview();
    closeModal();
    showToast(`${selected.length} voucher berhasil ditugaskan ke ${targetRes ? targetRes.name : 'Langsung (Tanpa Reseller)'}`);
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
  printArea.innerHTML = html;
  window.print();
}

// ===== PRESET STORE MANAGER =====
function renderPresetSelect() {
  const select = $id('preset-select');
  select.innerHTML = state.presets.map(p => `
    <option value="${p.id}" ${p.id === state.activePresetId ? 'selected' : ''}>${esc(p.name)}</option>
  `).join('');
}

function handlePresetChange(e) {
  const selectedId = e.target.value;
  const targetPreset = state.presets.find(p => p.id === selectedId);
  if (!targetPreset) return;

  state.activePresetId = selectedId;
  state.settings.ssid = targetPreset.ssid || '';
  state.settings.logo = targetPreset.logo || null;
  state.settings.theme = targetPreset.theme || 'theme-blue';
  state.settings.loginHint = targetPreset.loginHint || 'Buka browser utk login';

  restoreUI();
  saveState();
  renderPreview();
  showToast(`Beralih ke profil: ${targetPreset.name}`);
}

function saveCurrentPreset() {
  const active = state.presets.find(p => p.id === state.activePresetId);
  if (!active) return;

  active.ssid = state.settings.ssid;
  active.logo = state.settings.logo;
  active.theme = state.settings.theme;
  active.loginHint = state.settings.loginHint;

  saveState();
  showToast(`Pengaturan profil "${active.name}" berhasil disimpan!`);
}

function showAddPresetModal() {
  const html = `
    <div class="modal-header">
      <h3>Tambah Profil / Cabang Baru</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
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
      <button class="btn btn-secondary" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" id="btn-confirm-add-preset">Simpan Profil Baru</button>
    </div>
  `;

  openModal(html);

  const confirmAdd = () => {
    const name = $id('m-preset-name').value.trim();
    if (!name) {
      showToast('Nama profil wajib diisi', 'error');
      $id('m-preset-name').focus();
      return;
    }

    const newId = 'preset_' + Date.now();
    const newPreset = {
      id: newId,
      name: name,
      ssid: $id('m-preset-ssid').value.trim() || name,
      logo: state.settings.logo || null,
      theme: state.settings.theme || 'theme-blue',
      loginHint: state.settings.loginHint || 'Buka browser utk login'
    };

    state.presets.push(newPreset);
    state.activePresetId = newId;
    state.settings.ssid = newPreset.ssid;

    saveState();
    renderPresetSelect();
    restoreUI();
    renderPreview();
    closeModal();
    showToast(`Profil "${name}" berhasil dibuat`);
  };

  $id('btn-confirm-add-preset').addEventListener('click', confirmAdd);
  $id('modal-content').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmAdd();
  });
}

// ===== REKAP OMSET DASHBOARD & VISUAL BAR CHART =====
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

  // Calculate Bar Chart Data (Top Packages Sales)
  const chartPkgs = Object.keys(packageStats);
  const maxPrintedCount = Math.max(1, ...chartPkgs.map(k => packageStats[k].printed));
  
  const chartBarsHtml = chartPkgs.map(pkg => {
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

  const maxList = 50;
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
      <h3>📊 Laporan Penjualan & Rekap Omset</h3>
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
          <div class="rekap-label">Omset Voucher Dicetak</div>
          <div class="rekap-val" style="color:var(--success);">Rp ${formatNumber(totalOmsetPrinted)}</div>
          <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:3px;">✨ <strong>${printedList.length}</strong> voucher terjual</div>
        </div>
        <div class="rekap-card rekap-card-accent-blue">
          <div class="rekap-label">Sisa Stok (Belum Cetak)</div>
          <div class="rekap-val" style="color:var(--primary);">Rp ${formatNumber(totalOmsetUnprinted)}</div>
          <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:3px;">📦 <strong>${unprintedList.length}</strong> voucher siap cetak</div>
        </div>
        <div class="rekap-card rekap-card-accent-purple">
          <div class="rekap-label">Total Nilai Keseluruhan</div>
          <div class="rekap-val" style="color:#7c3aed;">Rp ${formatNumber(totalOmsetAll)}</div>
          <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:3px;">📋 <strong>${filtered.length}</strong> voucher terdata</div>
        </div>
      </div>

      <!-- Section: Visual Trend Bar Chart -->
      <div class="rekap-chart-card">
        <div class="rekap-chart-title">
          <span>📈 Grafik Tren Penjualan per Paket (Pcs Terjual)</span>
          <span style="font-size:0.72rem;color:var(--text-muted);">Visualisasi Real-Time</span>
        </div>
        <div class="rekap-bars-grid">
          ${chartBarsHtml || '<div style="color:var(--text-muted);font-size:0.8rem;margin:auto;">Belum ada voucher yang terjual pada filter ini</div>'}
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
        <span>📋 Log & Riwayat Voucher (${filtered.length} voucher)</span>
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

  $id('modal-content').innerHTML = html;

  $$('.rekap-period-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      rekapFilter.period = tab.dataset.p;
      renderRekapModalContent();
    });
  });

  const pkgSelect = $id('rekap-pkg-select');
  if (pkgSelect) {
    pkgSelect.addEventListener('change', (e) => {
      rekapFilter.package = e.target.value;
      renderRekapModalContent();
    });
  }

  const statusSelect = $id('rekap-status-select');
  if (statusSelect) {
    statusSelect.addEventListener('change', (e) => {
      rekapFilter.status = e.target.value;
      renderRekapModalContent();
    });
  }

  const startDateInput = $id('rekap-start-date');
  if (startDateInput) {
    startDateInput.addEventListener('change', (e) => {
      rekapFilter.startDate = e.target.value;
      renderRekapModalContent();
    });
  }

  const endDateInput = $id('rekap-end-date');
  if (endDateInput) {
    endDateInput.addEventListener('change', (e) => {
      rekapFilter.endDate = e.target.value;
      renderRekapModalContent();
    });
  }

  const btnExport = $id('btn-export-rekap-csv');
  if (btnExport) btnExport.addEventListener('click', exportRekapCSV);

  const btnPrintRec = $id('btn-print-rekap-receipt');
  if (btnPrintRec) btnPrintRec.addEventListener('click', printRekapReceipt);
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
  printArea.innerHTML = receiptHtml;
  window.print();
}

// ===== UPGRADE PRO PRICING MODAL =====
function showUpgradeProModal() {
  const html = `
    <div class="modal-header">
      <h3>💎 Upgrade ke Cetak Voucher PRO</h3>
      <button class="btn-icon" onclick="closeModal()" title="Tutup">✕</button>
    </div>
    <div class="modal-body">
      <div style="text-align:center;margin-bottom:1.15rem;">
        <p style="font-size:0.88rem;color:var(--text-secondary);">Pilih paket lisensi untuk aktivasi fitur lengkap tanpa batas.</p>
      </div>

      <div class="pricing-grid">
        <div class="pricing-card featured">
          <div class="pricing-badge">POPULER</div>
          <div>
            <div class="pricing-title">⚡ Paket PRO Unlimited</div>
            <div class="pricing-price">Rp 20.000 <span>/ bulan</span></div>
            <ul class="pricing-features">
              <li>✓ Unlimited Cetak Voucher</li>
              <li>✓ Import File CSV/Excel Ruijie Otomatis</li>
              <li>✓ 1-Click Quick POS Print & Shift Kasir</li>
              <li>✓ Direct Bluetooth Thermal Print (ESC/POS)</li>
              <li>✓ Watermark / Stempel Toko & Export PDF</li>
              <li>✓ Manajemen Reseller & Surat Jalan</li>
            </ul>
          </div>
          <button class="btn btn-pro" style="width:100%;justify-content:center;" onclick="handleOrderPlan('Paket PRO Bulanan (Rp 20.000)')">Langganan PRO</button>
        </div>

        <div class="pricing-card">
          <div>
            <div class="pricing-title">🏢 Paket Teknisi / 1 Tahun</div>
            <div class="pricing-price">Rp 150.000 <span>/ tahun</span></div>
            <ul class="pricing-features">
              <li>✓ Semua Fitur Paket PRO</li>
              <li>✓ Hemat 38% dibanding bayar bulanan</li>
              <li>✓ Unlimited Multi-Profil Toko/SSID</li>
              <li>✓ Prioritas Bantuan & Update Fitur</li>
              <li>✓ Lisensi Aktif 12 Bulan Penuh</li>
            </ul>
          </div>
          <button class="btn btn-primary" style="width:100%;justify-content:center;" onclick="handleOrderPlan('Paket Teknisi 1 Tahun (Rp 150.000)')">Pilih 1 Tahun</button>
        </div>
      </div>

      <div style="background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius-xs);padding:0.85rem;text-align:center;font-size:0.8rem;color:var(--text-secondary);">
        💳 <strong>Pembayaran Instan:</strong> Mendukung QRIS (GoPay, OVO, Dana, ShopeePay, BCA, Mandiri, BRI).
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Tutup</button>
    </div>
  `;

  openModal(html);
}

function handleOrderPlan(planName) {
  closeModal();
  const text = encodeURIComponent(`Halo Admin, saya tertarik berlangganan ${planName} untuk Aplikasi Cetak Voucher Ruijie. Mohon info pembayaran QRIS.`);
  window.open(`https://wa.me/?text=${text}`, '_blank');
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

  if ($id('btn-confirm-import-new')) {
    $id('btn-confirm-import-new').addEventListener('click', () => {
      importNewVouchersOnly(newVouchers);
      closeModal();
    });
  }

  $id('btn-confirm-replace-all').addEventListener('click', () => {
    replaceAllVouchers(uploadedVouchers);
    closeModal();
  });
}

function importNewVouchersOnly(newVouchers) {
  if (newVouchers.length === 0) {
    showToast('Tidak ada voucher baru untuk ditambahkan.', 'error');
    return;
  }
  state.vouchers.forEach(v => v.selected = false);
  newVouchers.forEach(v => {
    v.selected = true;
    v.printed = false;
  });
  state.vouchers.push(...newVouchers);
  state.filter = 'unprinted';
  $$('.filter-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === 'unprinted');
  });

  saveState();
  renderQuickPOSGrid();
  renderTable();
  renderPreview();
  showToast(`Berhasil menambahkan ${newVouchers.length} voucher baru`);
}

function replaceAllVouchers(allVouchers) {
  state.vouchers = allVouchers;
  state.filter = 'all';
  $$('.filter-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === 'all');
  });

  saveState();
  renderQuickPOSGrid();
  renderTable();
  renderPreview();
  showToast(`Seluruh daftar diganti dengan ${allVouchers.length} voucher`);
}

// ===== ADD MANUAL MODAL =====
function showAddModal() {
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
    const code = $id('m-code').value.trim();
    if (!code) {
      showToast('Kode voucher wajib diisi', 'error');
      $id('m-code').focus();
      return;
    }

    const exists = state.vouchers.some(v => v.code.toLowerCase().trim() === code.toLowerCase());
    if (exists) {
      showToast('Kode voucher ini sudah ada di daftar!', 'error');
      return;
    }

    state.vouchers.push({
      code: code,
      paket: $id('m-paket').value.trim() || 'Reguler',
      harga: $id('m-harga').value.trim(),
      periode: $id('m-periode').value.trim(),
      speed: $id('m-speed').value.trim(),
      quota: '',
      resellerId: null,
      resellerName: null,
      createdAt: new Date().toISOString(),
      printed: false,
      printedAt: null,
      selected: true
    });
    saveState();
    renderQuickPOSGrid();
    renderTable();
    renderPreview();
    closeModal();
    showToast('Voucher baru berhasil ditambahkan');
  };

  $id('btn-confirm-add').addEventListener('click', confirmAdd);
  $id('modal-content').addEventListener('keydown', (e) => {
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
      state.vouchers[index].printed = !state.vouchers[index].printed;
      state.vouchers[index].printedAt = state.vouchers[index].printed ? new Date().toISOString() : null;
      saveState();
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

  saveState();
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

  $id('voucher-count').textContent = total;
  $id('count-all').textContent = total;
  $id('count-unprinted').textContent = unprintedCount;
  $id('count-printed').textContent = printedCount;

  $id('selected-info').textContent = `${selectedCount} dari ${total} dipilih`;
  $id('btn-print-count').textContent = selectedCount;

  const filtered = getFilteredVouchersWithIndices();
  const filteredSelectedCount = filtered.filter(({ voucher }) => voucher.selected).length;

  const checkAllBox = $id('check-all');
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

  const printBtn = $id('btn-print');
  if (selectedCount === 0 && total > 0) {
    printBtn.style.opacity = '0.5';
  } else {
    printBtn.style.opacity = '1';
  }
}

// ===== DELETE & CLEAR =====
function deleteVoucher(index) {
  state.vouchers.splice(index, 1);
  saveState();
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
  $id('btn-confirm-delete-sel').addEventListener('click', () => {
    state.vouchers = state.vouchers.filter(v => v.selected === false);
    saveState();
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
  content.className = 'modal-content' + (extraClass ? ' ' + extraClass : '');
  if (html) content.innerHTML = html;
  $id('modal-overlay').classList.add('active');
  setTimeout(() => {
    const input = content.querySelector('input');
    if (input) input.focus();
  }, 100);
}

function closeModal() {
  $id('modal-overlay').classList.remove('active');
  const content = $id('modal-content');
  if (content) {
    content.className = 'modal-content';
  }
}

// ===== RENDER TABLE =====
function renderTable() {
  const tbody = $id('voucher-table');
  const empty = $id('empty-state');
  const filtered = getFilteredVouchersWithIndices();
  const total = state.vouchers.length;

  if (total === 0 || filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    if (total > 0 && filtered.length === 0) {
      empty.querySelector('p').textContent = 'Tidak ada voucher yang cocok dengan filter / pencarian ini';
      empty.querySelector('.hint').textContent = 'Coba bersihkan kolom pencarian atau ubah filter';
    } else {
      empty.querySelector('p').textContent = 'Belum Ada Data Voucher Hotspot';
      empty.querySelector('.hint').textContent = 'Import file dari Ruijie Cloud atau tambah voucher manual untuk mulai mencetak';
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

// ===== RENDER PREVIEW (WITH DUMMY SAMPLE FALLBACK) =====
function renderPreview() {
  const container = $id('preview-grid');
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

  // If no vouchers exist yet, use Sample Vouchers so user sees live design!
  if (state.vouchers.length === 0) {
    vouchersToRender = SAMPLE_DUMMY_VOUCHERS;
    isDummyMode = true;
  } else if (vouchersToRender.length === 0) {
    container.innerHTML = '<div class="preview-empty">⚠️ Tidak ada voucher yang dicentang.<br>Klik tombol <strong>"🟢 Belum Dicetak"</strong> atau centang kotak pada tabel untuk mencetak.</div>';
    return;
  }

  const startNum = parseInt(settings.startNumber, 10) || 1;
  const dummyBanner = isDummyMode
    ? '<div class="preview-dummy-banner">✨ Pratinjau Desain Aktif (Data Contoh — Silakan Import File Ruijie)</div>'
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

  let qrHtml = '';
  if (settings.showQr && typeof QRCode !== 'undefined') {
    let qrContent = v.code;
    if (settings.qrUrlTemplate && settings.qrUrlTemplate.includes('{CODE}')) {
      qrContent = settings.qrUrlTemplate.replace(/\{CODE\}/g, encodeURIComponent(v.code));
    } else if (settings.qrUrlTemplate) {
      qrContent = settings.qrUrlTemplate + encodeURIComponent(v.code);
    }
    const qrSvgDataUri = QRCode.generateSVG(qrContent, 100);
    if (qrSvgDataUri) {
      qrHtml = `
        <div class="v-qr-box" title="Scan QR Code untuk login">
          <img class="v-qr-img" src="${qrSvgDataUri}" alt="QR">
        </div>
      `;
    }
  }

  const heroRowHtml = `
    <div class="v-hero-row">
      <div class="v-code-box">
        <div class="v-code-label">KODE VOUCHER</div>
        <div class="v-code-value">${esc(v.code)}</div>
      </div>
      ${qrHtml}
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

  // Stempel / Watermark
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

// ===== PRINT BUILDER =====
function buildPrintArea(selectedVouchers, layoutVal) {
  const printArea = $id('print-area');
  printArea.innerHTML = '';

  const fragment = document.createDocumentFragment();
  const startNum = parseInt(state.settings.startNumber, 10) || 1;
  const isThermal = layoutVal.startsWith('thermal');

  if (isThermal) {
    const pageEl = document.createElement('div');
    pageEl.className = `print-page layout-${layoutVal}`;

    let html = selectedVouchers.map((v, vi) => {
      const num = startNum + vi;
      return buildCardHTML(v, num, state.settings, false);
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

      pageEl.innerHTML = pageHtml;
      fragment.appendChild(pageEl);
    }
  }

  printArea.appendChild(fragment);
}

function handlePrint() {
  const selectedVouchers = getSelectedVouchers();
  if (selectedVouchers.length === 0) {
    showToast('Pilih minimal 1 voucher dengan mencentang kotak ceklis sebelum mencetak.', 'error');
    return;
  }

  const layoutVal = state.settings.layout || '25';
  buildPrintArea(selectedVouchers, layoutVal);

  selectedVouchers.forEach(v => {
    v.printed = true;
    v.printedAt = new Date().toISOString();
    v.selected = false;
  });

  saveState();

  setTimeout(() => {
    window.print();
    renderQuickPOSGrid();
    renderTable();
    renderPreview();
    showToast(`${selectedVouchers.length} voucher telah dicetak & ditandai "Sudah Dicetak"`);
  }, 100);
}

function onSettingChange() {
  state.settings.ssid = $id('ssid-name').value;
  state.settings.loginHint = $id('login-hint').value;
  state.settings.qrUrlTemplate = $id('qr-url-template').value.trim();
  state.settings.startNumber = Math.max(1, parseInt($id('start-number').value, 10) || 1);
  state.settings.layout = $id('layout-select').value || '25';
  state.settings.logoPos = $id('logo-pos-select').value || 'center';
  state.settings.theme = $id('theme-select').value || 'theme-blue';
  state.settings.fontFamily = $id('font-select').value || 'font-inter';
  state.settings.borderStyle = $id('border-select').value || 'border-dashed';
  state.settings.showQr = $id('show-qr').checked;
  state.settings.showSpeed = $id('show-speed').checked;
  state.settings.showQuota = $id('show-quota').checked;
  state.settings.showHint = $id('show-hint').checked;

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
const STORAGE_KEY = 'ruijie_voucher_app_v8_pro';

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save state to localStorage:', e);
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('ruijie_voucher_app_v7_clean') || localStorage.getItem('ruijie_voucher_app_v6_cloud_enterprise');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.uiMode) state.uiMode = parsed.uiMode;
      if (parsed.themeMode) state.themeMode = parsed.themeMode;
      if (parsed.adminPin) state.adminPin = parsed.adminPin;
      if (parsed.activeShift) state.activeShift = parsed.activeShift;
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
  $id('ssid-name').value = state.settings.ssid || '';
  $id('login-hint').value = state.settings.loginHint || '';
  $id('qr-url-template').value = state.settings.qrUrlTemplate || '';
  $id('start-number').value = state.settings.startNumber || 1;
  $id('layout-select').value = state.settings.layout || '25';
  $id('logo-pos-select').value = state.settings.logoPos || 'center';
  $id('theme-select').value = state.settings.theme || 'theme-blue';
  $id('font-select').value = state.settings.fontFamily || 'font-inter';
  $id('border-select').value = state.settings.borderStyle || 'border-dashed';
  $id('show-qr').checked = state.settings.showQr !== false;
  $id('show-speed').checked = state.settings.showSpeed !== false;
  $id('show-quota').checked = state.settings.showQuota !== false;
  $id('show-hint').checked = state.settings.showHint !== false;
  $id('watermark-text').value = state.settings.watermarkText || '';
  $id('show-watermark').checked = !!state.settings.showWatermark;
  
  if (state.settings.bgImage) {
    $id('bg-opacity-wrap').style.display = 'block';
    $id('bg-opacity-slider').value = state.settings.bgOpacity || 20;
    $id('bg-opacity-val').textContent = `${state.settings.bgOpacity || 20}%`;
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
