// =============================================
// AGENT E-WALLET & SELF-SERVICE PORTAL ENGINE
// Portal Mitra Agen Hotspot Mandiri (GoPay / DANA Style)
// =============================================

const STORAGE_KEY = 'ruijie_voucher_state';
const CURRENT_AGENT_KEY = 'current_active_agent_id';

let appState = null;
let currentAgent = null;
let isBalanceHidden = false;
let selectedPackageForCheckout = null;
let currentCheckoutQty = 1;
let lastPurchasedVouchers = [];

// Helper functions
function $id(id) { return document.getElementById(id); }
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function formatNumber(num) {
  const n = parseFloat(String(num).replace(/[^\d.-]/g, '')) || 0;
  return n.toLocaleString('id-ID');
}

function showToast(msg, type = 'info') {
  const container = $id('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.style.borderLeft = type === 'error' ? '4px solid #ef4444' : type === 'success' ? '4px solid #10b981' : '4px solid #3b82f6';
  t.innerHTML = `<span>${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}</span> <span>${esc(msg)}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(-10px)';
    setTimeout(() => t.remove(), 250);
  }, 2800);
}

// Open & Close Modal Sheets
function openSheet(id) {
  const el = $id(id);
  if (el) el.classList.add('active');
}
function closeSheet(id) {
  const el = $id(id);
  if (el) el.classList.remove('active');
}

// Load State from LocalStorage
function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      appState = JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading app state:', e);
  }

  if (!appState) {
    appState = {
      vouchers: [],
      resellers: [],
      presets: [],
      activePresetId: null,
      settings: {
        storeName: 'WiFi Hotspot',
        ssid: 'WiFi-Hotspot',
        pricePrefix: 'Rp '
      }
    };
  }

  // Ensure resellers have proper properties
  if (!appState.resellers || appState.resellers.length === 0) {
    // Create demo agent if none exist
    appState.resellers = [{
      id: 'res_default',
      name: 'Agent StarNet',
      phone: '08123456789',
      address: 'Pusat Distribusi',
      pin: '1234',
      balance: 100000,
      discountPercent: 10,
      transactions: []
    }];
    saveAppState();
  } else {
    appState.resellers.forEach(r => {
      if (typeof r.balance !== 'number') r.balance = 50000;
      if (!r.pin) r.pin = '1234';
      if (typeof r.discountPercent !== 'number') r.discountPercent = 10;
      if (!Array.isArray(r.transactions)) r.transactions = [];
    });
  }
}

function saveAppState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

// Authentication / Agent Selector
function initAuth() {
  const params = new URLSearchParams(window.location.search);
  const paramId = params.get('id');
  const paramPin = params.get('pin');

  if (paramId) {
    const found = appState.resellers.find(r => r.id === paramId);
    if (found) {
      if (!paramPin || found.pin === paramPin) {
        setSessionAgent(found);
        return;
      }
    }
  }

  const savedAgentId = localStorage.getItem(CURRENT_AGENT_KEY);
  if (savedAgentId) {
    const found = appState.resellers.find(r => r.id === savedAgentId);
    if (found) {
      setSessionAgent(found);
      return;
    }
  }

  // If only 1 agent exists, select it by default
  if (appState.resellers.length === 1) {
    setSessionAgent(appState.resellers[0]);
  } else {
    showLoginModal();
  }
}

function setSessionAgent(agent) {
  currentAgent = agent;
  localStorage.setItem(CURRENT_AGENT_KEY, agent.id);
  renderAgentDashboard();
}

function showLoginModal() {
  const select = $id('login-agent-select');
  if (select) {
    select.innerHTML = appState.resellers.map(r => `
      <option value="${r.id}">🤝 ${esc(r.name)} (${esc(r.phone || '-')})</option>
    `).join('');
  }
  openSheet('modal-login');
}

// Render Dashboard
function renderAgentDashboard() {
  if (!currentAgent) return;

  const activePreset = (appState.presets && appState.presets.find(p => p.id === appState.activePresetId)) || null;
  const storeName = (activePreset && activePreset.name) || appState.settings.storeName || 'Hotspot Provider';

  $id('top-store-name').textContent = storeName;
  $id('card-agent-name').textContent = `🤝 ${currentAgent.name}`;

  updateBalanceDisplay();
  calculateTodayStats();
  renderPackageCatalogue();
}

function updateBalanceDisplay() {
  const valEl = $id('card-balance-val');
  if (isBalanceHidden) {
    valEl.textContent = '••••••';
  } else {
    valEl.textContent = formatNumber(currentAgent.balance || 0);
  }
}

function calculateTodayStats() {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  let todayCount = 0;
  let todayProfit = 0;

  if (Array.isArray(currentAgent.transactions)) {
    currentAgent.transactions.forEach(t => {
      const tDate = new Date(t.timestamp);
      if (tDate >= startToday && t.type === 'BUY') {
        todayCount += t.qty || 1;
        todayProfit += t.profit || 0;
      }
    });
  }

  $id('card-today-buy').textContent = `${todayCount} Voucher`;
  $id('card-today-profit').textContent = `+Rp ${formatNumber(todayProfit)}`;
}

// Package Catalogue Rendering
function renderPackageCatalogue() {
  const container = $id('package-list-container');
  if (!container) return;

  // Group unprinted vouchers by package
  const packageMap = {};
  let totalStock = 0;

  appState.vouchers.forEach(v => {
    if (!v.printed) {
      totalStock++;
      const pkg = v.paket || 'Reguler';
      if (!packageMap[pkg]) {
        const rawPrice = parseFloat(String(v.harga).replace(/[^\d.]/g, '')) || 0;
        packageMap[pkg] = {
          name: pkg,
          normalPrice: rawPrice,
          periode: v.periode || 'Aktif',
          speed: v.speed || 'High Speed',
          quota: v.quota || 'Unlimited',
          availableCount: 0
        };
      }
      packageMap[pkg].availableCount++;
    }
  });

  $id('badge-total-stock').textContent = `Stok Siap: ${totalStock} pcs`;

  const packages = Object.values(packageMap);
  if (packages.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:2rem 1rem;background:#f8fafc;border-radius:14px;border:1px dashed #cbd5e1;">
        <div style="font-size:2rem;margin-bottom:0.5rem;">📦</div>
        <div style="font-weight:800;color:var(--text);margin-bottom:0.2rem;">Stok Voucher Belum Tersedia</div>
        <div style="font-size:0.78rem;color:var(--text-muted);">Admin pengelola belum mengimpor voucher ke sistem. Hubungi admin untuk isi stok.</div>
      </div>
    `;
    return;
  }

  const discountRate = (currentAgent.discountPercent || 10) / 100;

  container.innerHTML = packages.map(p => {
    const agentPrice = Math.round(p.normalPrice * (1 - discountRate));
    const profitPerPcs = p.normalPrice - agentPrice;
    const isOut = p.availableCount <= 0;

    return `
      <div class="package-card">
        <div class="package-info">
          <div class="package-badge-row">
            <span class="badge-speed">⚡ ${esc(p.speed)}</span>
            <span class="badge-stock ${isOut ? 'empty' : ''}">${isOut ? '❌ Habis' : `📦 Sisa ${p.availableCount} pcs`}</span>
          </div>
          <div class="package-name">${esc(p.name)}</div>
          <div class="package-price-row">
            <div class="package-price">Rp ${formatNumber(agentPrice)}</div>
            <div class="package-profit-badge">+Laba Rp ${formatNumber(profitPerPcs)}</div>
          </div>
          <div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px;">
            Harga Jual: Rp ${formatNumber(p.normalPrice)} • ${esc(p.periode)}
          </div>
        </div>
        <button class="btn-buy-package" onclick="openCheckoutModal('${esc(p.name)}', ${p.normalPrice}, ${agentPrice}, '${esc(p.periode)}', '${esc(p.speed)}', '${esc(p.quota)}', ${p.availableCount})" ${isOut ? 'disabled' : ''}>
          ⚡ Beli
        </button>
      </div>
    `;
  }).join('');
}

// Checkout Modal Logic
window.openCheckoutModal = function(pkgName, normalPrice, agentPrice, periode, speed, quota, availStock) {
  selectedPackageForCheckout = {
    pkgName,
    normalPrice,
    agentPrice,
    periode,
    speed,
    quota,
    availStock
  };

  currentCheckoutQty = 1;
  updateCheckoutSheetValues();
  openSheet('modal-checkout');
};

function updateCheckoutSheetValues() {
  if (!selectedPackageForCheckout) return;

  const { pkgName, normalPrice, agentPrice, periode, speed, availStock } = selectedPackageForCheckout;
  const totalDeduct = agentPrice * currentCheckoutQty;
  const balanceAfter = (currentAgent.balance || 0) - totalDeduct;

  $id('checkout-pkg-name').textContent = pkgName;
  $id('checkout-pkg-spec').textContent = `🚀 ${speed} • ⏳ ${periode}`;
  $id('checkout-qty-val').textContent = currentCheckoutQty;
  $id('checkout-price-normal').textContent = `Rp ${formatNumber(normalPrice * currentCheckoutQty)}`;
  $id('checkout-price-agent').textContent = `Rp ${formatNumber(agentPrice)} / pcs`;
  $id('checkout-total-deduct').textContent = `Rp ${formatNumber(totalDeduct)}`;

  const balAfterEl = $id('checkout-balance-after');
  balAfterEl.textContent = `Rp ${formatNumber(balanceAfter)}`;
  balAfterEl.style.color = balanceAfter < 0 ? '#ef4444' : '#059669';

  const confirmBtn = $id('btn-confirm-purchase');
  if (balanceAfter < 0) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = '❌ Saldo Deposit Tidak Cukup (Top Up Dulu)';
    confirmBtn.style.background = '#94a3b8';
  } else if (currentCheckoutQty > availStock) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = `❌ Stok Hanya Tersedia ${availStock} pcs`;
    confirmBtn.style.background = '#94a3b8';
  } else {
    confirmBtn.disabled = false;
    confirmBtn.textContent = `⚡ Beli ${currentCheckoutQty} Voucher (Rp ${formatNumber(totalDeduct)})`;
    confirmBtn.style.background = 'var(--primary)';
  }
}

// Execute Purchase
function executePurchase() {
  if (!selectedPackageForCheckout) return;

  const { pkgName, normalPrice, agentPrice, periode, speed, quota } = selectedPackageForCheckout;
  const qty = currentCheckoutQty;
  const totalDeduct = agentPrice * qty;
  const profitTotal = (normalPrice - agentPrice) * qty;

  if ((currentAgent.balance || 0) < totalDeduct) {
    showToast('Saldo deposit Anda tidak mencukupi. Silakan top up terlebih dahulu.', 'error');
    return;
  }

  // Find unprinted vouchers matching package
  const matches = appState.vouchers.filter(v => !v.printed && (v.paket || 'Reguler') === pkgName);
  if (matches.length < qty) {
    showToast(`Stok voucher ${pkgName} tidak mencukupi!`, 'error');
    return;
  }

  const purchased = matches.slice(0, qty);
  const nowIso = new Date().toISOString();

  purchased.forEach(v => {
    v.printed = true;
    v.printedAt = nowIso;
    v.resellerId = currentAgent.id;
    v.resellerName = currentAgent.name;
    v.soldByAgent = true;
  });

  // Deduct agent balance
  currentAgent.balance -= totalDeduct;

  // Record transaction
  if (!Array.isArray(currentAgent.transactions)) {
    currentAgent.transactions = [];
  }

  const trxRecord = {
    id: 'trx_' + Date.now(),
    timestamp: nowIso,
    type: 'BUY',
    pkgName: pkgName,
    qty: qty,
    unitPrice: agentPrice,
    totalAmount: totalDeduct,
    profit: profitTotal,
    codes: purchased.map(v => v.code)
  };

  currentAgent.transactions.unshift(trxRecord);

  // Synchronize back to resellers list
  const resIdx = appState.resellers.findIndex(r => r.id === currentAgent.id);
  if (resIdx !== -1) {
    appState.resellers[resIdx] = currentAgent;
  }

  saveAppState();

  lastPurchasedVouchers = purchased;

  closeSheet('modal-checkout');
  showReceiptModal(purchased[0], pkgName, normalPrice, periode, speed, quota);
  renderAgentDashboard();

  showToast(`🎉 Berhasil membeli ${qty} voucher ${pkgName}!`, 'success');
}

// Receipt Modal & Actions
function showReceiptModal(v, pkgName, price, periode, speed, quota) {
  const activePreset = (appState.presets && appState.presets.find(p => p.id === appState.activePresetId)) || null;
  const storeName = (activePreset && activePreset.name) || appState.settings.storeName || 'WIFI HOTSPOT';
  const ssid = appState.settings.ssid || 'WiFi-Hotspot';

  $id('rcpt-store-name').textContent = storeName;
  $id('rcpt-ssid').textContent = ssid;
  $id('rcpt-pkg-name').textContent = pkgName;
  $id('rcpt-pkg-price').textContent = `Rp ${formatNumber(price)} • ${periode}`;
  $id('rcpt-voucher-code').textContent = v.code;
  $id('rcpt-periode').textContent = periode;
  $id('rcpt-speed').textContent = speed;
  $id('rcpt-quota').textContent = quota;
  $id('rcpt-agent-name').textContent = currentAgent.name;

  openSheet('modal-receipt');
}

// Thermal Popout Print from Agent Portal
function printAgentThermalReceipt() {
  if (lastPurchasedVouchers.length === 0) return;

  const v = lastPurchasedVouchers[0];
  const activePreset = (appState.presets && appState.presets.find(p => p.id === appState.activePresetId)) || null;
  const storeName = (activePreset && activePreset.name) || appState.settings.storeName || 'WIFI HOTSPOT';
  const ssid = appState.settings.ssid || 'WiFi-Hotspot';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Struk Voucher ${esc(v.code)}</title>
      <meta charset="utf-8">
      <style>
        @page { size: 58mm 210mm !important; margin: 0mm !important; }
        body {
          font-family: monospace, 'Courier New', Courier, sans-serif;
          margin: 0;
          padding: 2mm;
          width: 58mm;
          color: #000;
          background: #fff;
          text-align: center;
          box-sizing: border-box;
        }
        .store { font-size: 14px; font-weight: bold; }
        .ssid { font-size: 10px; margin-bottom: 4px; }
        .line { border-top: 1px dashed #000; margin: 4px 0; }
        .code {
          font-size: 18px;
          font-weight: bold;
          border: 2px dashed #000;
          padding: 4px;
          margin: 6px 0;
          letter-spacing: 2px;
        }
        .meta { font-size: 9px; text-align: left; line-height: 1.4; }
      </style>
    </head>
    <body>
      <div class="store">${esc(storeName)}</div>
      <div class="ssid">SSID: ${esc(ssid)}</div>
      <div class="line"></div>
      <div style="font-size:11px;font-weight:bold;">${esc(v.paket || 'Voucher Hotspot')}</div>
      <div>Rp ${formatNumber(v.harga)}</div>
      <div class="code">${esc(v.code)}</div>
      <div class="meta">
        <div>⏳ Masa Aktif : ${esc(v.periode || '24 Jam')}</div>
        <div>🚀 Kecepatan  : ${esc(v.speed || '10 Mbps')}</div>
        <div>🏪 Mitra Agen : ${esc(currentAgent.name)}</div>
      </div>
      <div class="line"></div>
      <div style="font-size:8px;">Hubungkan ke WiFi lalu masukkan kode voucher di atas. Terima kasih!</div>
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
  `;

  const win = window.open('', '_blank', 'width=380,height=600');
  if (win) {
    win.document.write(html);
    win.document.close();
    showToast('🖨️ Membuka jendela cetak struk thermal 58mm...');
  } else {
    window.print();
  }
}

// Share via WhatsApp
function shareVoucherWhatsApp() {
  if (lastPurchasedVouchers.length === 0) return;

  const v = lastPurchasedVouchers[0];
  const activePreset = (appState.presets && appState.presets.find(p => p.id === appState.activePresetId)) || null;
  const storeName = (activePreset && activePreset.name) || appState.settings.storeName || 'WIFI HOTSPOT';
  const ssid = appState.settings.ssid || 'WiFi-Hotspot';

  const text = `*STUK VOUCHER WIFI HOTSPOT* 📶\n` +
    `🏪 *${storeName}*\n` +
    `📡 SSID WiFi: *${ssid}*\n` +
    `--------------------------------\n` +
    `📦 Paket: *${v.paket || 'Reguler'}*\n` +
    `💰 Harga: *Rp ${formatNumber(v.harga)}*\n` +
    `⏳ Masa Aktif: *${v.periode || 'Aktif'}*\n` +
    `🚀 Kecepatan: *${v.speed || 'High Speed'}*\n` +
    `--------------------------------\n` +
    `🔑 *KODE VOUCHER:* \n` +
    `👉 \`${v.code}\` 👈\n` +
    `--------------------------------\n` +
    `*Cara Login:*\n` +
    `1. Sambungkan HP ke WiFi *${ssid}*\n` +
    `2. Buka browser, masukkan Kode Voucher di atas.\n` +
    `3. Selamat berinternet! 🚀\n\n` +
    `_Dilayani oleh Mitra Resmi: ${currentAgent.name}_`;

  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

// Copy Voucher Code
function copyVoucherCode() {
  if (lastPurchasedVouchers.length === 0) return;
  const code = lastPurchasedVouchers[0].code;
  navigator.clipboard.writeText(code).then(() => {
    showToast(`📋 Kode voucher "${code}" berhasil disalin ke clipboard!`, 'success');
  }).catch(() => {
    showToast(`Kode voucher: ${code}`);
  });
}

// History Modal Rendering
function renderHistoryModal() {
  const container = $id('history-items-container');
  if (!container) return;

  const list = currentAgent.transactions || [];
  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:2rem;color:var(--text-muted);font-size:0.85rem;">
        Belum ada riwayat transaksi.
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(t => {
    const isBuy = t.type === 'BUY';
    const dateStr = new Date(t.timestamp).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    return `
      <div class="history-item">
        <div style="display:flex;align-items:center;">
          <div class="history-icon-box" style="background:${isBuy ? '#fee2e2' : '#dcfce7'};color:${isBuy ? '#ef4444' : '#16a34a'};">
            ${isBuy ? '🛍️' : '➕'}
          </div>
          <div>
            <div style="font-size:0.85rem;font-weight:800;color:var(--text);">
              ${isBuy ? `Beli ${t.qty || 1}x ${esc(t.pkgName)}` : 'Top Up Saldo'}
            </div>
            <div style="font-size:0.72rem;color:var(--text-muted);">${dateStr}</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:0.9rem;font-weight:900;color:${isBuy ? '#ef4444' : '#16a34a'};">
            ${isBuy ? '-' : '+'}Rp ${formatNumber(t.totalAmount || t.amount || 0)}
          </div>
          ${isBuy && t.profit ? `<div style="font-size:0.7rem;color:#059669;font-weight:750;">Laba: +Rp ${formatNumber(t.profit)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  openSheet('modal-history');
}

// Event Listeners Initialization
function initEventListeners() {
  // Balance eye toggle
  $id('btn-toggle-balance-vis')?.addEventListener('click', () => {
    isBalanceHidden = !isBalanceHidden;
    updateBalanceDisplay();
  });

  // Switch agent
  $id('btn-switch-agent')?.addEventListener('click', showLoginModal);

  // Stepper Qty in Checkout
  $id('btn-qty-minus')?.addEventListener('click', () => {
    if (currentCheckoutQty > 1) {
      currentCheckoutQty--;
      updateCheckoutSheetValues();
    }
  });

  $id('btn-qty-plus')?.addEventListener('click', () => {
    if (selectedPackageForCheckout && currentCheckoutQty < selectedPackageForCheckout.availStock) {
      currentCheckoutQty++;
      updateCheckoutSheetValues();
    }
  });

  // Confirm Purchase
  $id('btn-confirm-purchase')?.addEventListener('click', executePurchase);

  // Receipt Actions
  $id('btn-rcpt-print')?.addEventListener('click', printAgentThermalReceipt);
  $id('btn-rcpt-wa')?.addEventListener('click', shareVoucherWhatsApp);
  $id('btn-rcpt-copy')?.addEventListener('click', copyVoucherCode);

  // Quick Action Buttons
  $id('btn-action-topup')?.addEventListener('click', () => openSheet('modal-topup'));
  $id('btn-action-history')?.addEventListener('click', renderHistoryModal);
  $id('btn-action-printer')?.addEventListener('click', () => {
    showToast('🖨️ Struk dicetak otomatis dengan format 58mm thermal roll saat pembelian voucher.');
  });
  $id('btn-action-cs')?.addEventListener('click', () => {
    const adminPhone = (appState.presets && appState.presets[0] && appState.presets[0].phone) || '';
    const text = `Halo Admin Hotspot, saya mitra agen *${currentAgent.name}* ingin menanyakan informasi hotspot.`;
    window.open(`https://api.whatsapp.com/send?phone=${adminPhone}&text=${encodeURIComponent(text)}`, '_blank');
  });

  $id('btn-topup-chat-admin')?.addEventListener('click', () => {
    const text = `Halo Admin, saya mitra agen *${currentAgent.name}* ingin melakukan *Top Up Saldo Deposit Hotspot*. Mohon info no. rekening / QRIS pembayaran. Terima kasih!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  });

  // Login Submit
  $id('btn-submit-login')?.addEventListener('click', () => {
    const agentId = $id('login-agent-select')?.value;
    const pin = ($id('login-agent-pin')?.value || '').trim();
    const found = appState.resellers.find(r => r.id === agentId);

    if (found) {
      if (found.pin && pin !== found.pin) {
        showToast('PIN keamanan agen salah! (Coba PIN: 1234)', 'error');
        $id('login-agent-pin')?.focus();
        return;
      }
      setSessionAgent(found);
      closeSheet('modal-login');
      showToast(`Selamat datang, ${found.name}! 🚀`, 'success');
    }
  });

  // Listen for storage events across tabs (if admin imports or tops up)
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      loadAppState();
      if (currentAgent) {
        const updated = appState.resellers.find(r => r.id === currentAgent.id);
        if (updated) currentAgent = updated;
      }
      renderAgentDashboard();
    }
  });
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  loadAppState();
  initAuth();
  initEventListeners();
});
