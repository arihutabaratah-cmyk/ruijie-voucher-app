# 🎫 Aplikasi Cetak Voucher Ruijie Cloud — Enterprise Edition

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-2563eb.svg)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Zero-Dependency](https://img.shields.io/badge/Dependencies-Zero-success.svg)](#)

Aplikasi manajemen dan cetak voucher WiFi Hotspot Ruijie Cloud yang dirancang khusus untuk **Pengusaha RT/RW Net**, **Kafe**, dan **Warkop POS**. Mendukung berbagai jenis kertas (A4 hemat kertas, thermal kasir POS, dan kertas stiker label Tom & Jerry), serta dilengkapi sistem kasir 1-Click print dan manajemen reseller.

---

## 🌟 Fitur Utama

1. **🛡️ vs 🛒 Sistem Role (Mode Kasir vs Mode Admin):**
   - **Mode Kasir:** Tampilan sederhana, cepat, khusus transaksi penjualan voucher 1-Click dan pencarian komplain pelanggan. Menu rahasia admin otomatis terkunci.
   - **Mode Admin (Kunci PIN):** Kontrol penuh atas pengaturan toko, branding logo, import CSV/Excel, manajemen agen/reseller, dan rekap omset total.

2. **⚡ Cetak Cepat Kasir (1-Click POS Print):**
   - Kasir cukup klik 1 tombol paket -> 1 voucher otomatis terambil, ditandai terjual, dan langsung dicetak ke printer struk thermal POS.

3. **🔄 Integrasi API Ruijie Cloud & ⚡ Batch Generator:**
   - Tarik voucher berstatus *Unused* langsung dari server Ruijie Cloud OpenAPI.
   - Buat ratusan voucher acak secara masal di aplikasi dan ekspor langsung dalam format standar Ruijie CSV.

4. **🏪 Manajemen Reseller & Titip Warung (RT/RW Net):**
   - Tandai voucher titipan ke warung-warung tetangga/agen.
   - Lacak sisa stok titipan dan piutang setoran uang.
   - Cetak **Surat Jalan & Tanda Terima** resmi serah terima voucher.

5. **🏷️ Pilihan Ukuran Kertas Super Lengkap:**
   - **Kertas A4:** 50/lembar (Super Hemat 5×10), 30/lembar, 25/lembar (Standar 5×5), 20/lembar, 16/lembar.
   - **Printer Thermal Kasir:** Roll 58mm (Mini) & Roll 80mm (Standar).
   - **Kertas Stiker Label:** Tom & Jerry No. 103 (12/lembar), No. 108 (40/lembar), No. 121 (10/lembar).

6. **📱 Progressive Web App (PWA) & Offline Ready:**
   - Bisa di-install langsung di HP Android / Tablet kasir layaknya aplikasi native.
   - Beroperasi 100% offline berkat *Service Worker caching*.

7. **🖼️ Export Lembar Gambar (PNG):**
   - Download lembaran voucher sebagai file gambar beresolusi tinggi siap kirim via WhatsApp atau cetak di tempat fotokopi.

---

## 🚀 Cara Menjalankan Secara Lokal

1. **Clone repository ini:**
   ```bash
   git clone https://github.com/USERNAME/ruijie-voucher-app.git
   cd ruijie-voucher-app
   ```

2. **Jalankan server lokal (Node.js):**
   ```bash
   node server.js
   ```

3. **Buka di browser:**
   ```
   http://localhost:3000
   ```

---

## ☁️ Panduan Deploy Online (Vercel / Netlify / VPS)

Untuk panduan deploy online 24/7 dan menghubungkan domain sendiri, baca [**`DEPLOY_GUIDE.md`**](DEPLOY_GUIDE.md).

---

## 📄 Lisensi
Distributed under the MIT License.
