# 🚀 Panduan Lengkap Deploy Aplikasi Cetak Voucher Ruijie (Online & Offline)

Dokumen ini berisi panduan langkah-demi-langkah untuk mempublikasikan (deploy) aplikasi ini agar dapat diakses secara online 24/7 melalui HP/Laptop kasir di mana saja.

---

## 🌟 Daftar Pilihan Deployment

| Platform | Biaya | Kecepatan Setup | Cocok Untuk |
|---|---|---|---|
| **Vercel** (Rekomendasi ⭐) | **Gratis** | 2 Menit | Multi-cabang, Kasir Online, Custom Domain |
| **Cloudflare Pages** | **Gratis** | 3 Menit | Bandwidth tanpa batas, CDN super cepat |
| **Netlify** | **Gratis** | 2 Menit | Drag & drop folder langsung online |
| **VPS Ubuntu / Nginx** | Mulai $3/bln | 15 Menit | Self-hosted penuh, privasi total |
| **Local LAN Warkop** | **Gratis** | 1 Menit | 100% offline tanpa internet di jaringan lokal |

---

## 🔹 OPSI 1: Deploy ke Vercel (Paling Direkomendasikan & 100% Gratis)

Vercel adalah platform hosting cloud modern yang memberikan SSL/HTTPS gratis (wajib untuk fitur PWA & Service Worker) dan mendukung custom domain sendiri.

### Langkah-langkah:
1. **Buat Akun GitHub:**
   - Buka [github.com](https://github.com) dan buat akun (jika belum punya).
   - Buat repository baru, misalnya beri nama `ruijie-voucher-app`.
   - Upload seluruh file proyek ini (`index.html`, `index.css`, `print.css`, `app.js`, `manifest.json`, `sw.js`, `icon.svg`, dll) ke repository tersebut.

2. **Hubungkan ke Vercel:**
   - Buka [vercel.com](https://vercel.com) dan login menggunakan akun GitHub Anda.
   - Klik tombol **"Add New..."** -> **"Project"**.
   - Pilih repository `ruijie-voucher-app` yang baru dibuat.
   - Klik tombol **"Deploy"**.

3. **Selesai!**
   - Dalam 30 detik, Anda akan mendapatkan URL online gratis dengan HTTPS, misalnya:
     `https://ruijie-voucher-app.vercel.app`
   - Buka link tersebut di HP kasir -> langsung muncul notifikasi **"📲 Install App"** untuk memasang aplikasi di layar utama HP!

---

## 🔹 OPSI 2: Deploy ke Netlify (Drag & Drop Langsung Jadi)

Jika Anda tidak ingin menggunakan Git / GitHub dan ingin cara paling instan:
1. Buka [app.netlify.com/drop](https://app.netlify.com/drop).
2. Login / Buat akun gratis.
3. Tarik (*Drag & Drop*) seluruh folder proyek ini ke area kotak yang disediakan.
4. Dalam hitungan detik website langsung online dengan domain gratis seperti `https://namaproyek.netlify.app`.

---

## 🔹 OPSI 3: Pasang Domain Kustom Sendiri (Branding Profesional)

Jika Anda ingin memakai domain bisnis sendiri (misalnya `voucher.warkopbudi.com` atau `app.ruijievoucher.id`):
1. Beli domain di penyedia domain lokal (Niagahoster, DomaiNesia, IDCloudHost, Cloudflare, dll).
2. Di dashboard **Vercel** / **Netlify** -> Masuk ke menu **Settings** -> **Domains**.
3. Tambahkan nama domain Anda (misal `app.ruijievoucher.id`).
4. Di panel DNS penyedia domain Anda:
   - Tambahkan CNAME Record:
     - **Host / Name**: `app` (atau `@` untuk root domain)
     - **Value / Target**: `cname.vercel-dns.com`
5. Tunggu 5-15 menit -> Domain kustom Anda sudah aktif lengkap dengan sertifikat SSL (HTTPS hijau)!

---

## 🔹 OPSI 4: Deploy di VPS Linux (Ubuntu / Debian + Nginx)

Jika Anda memiliki server VPS sendiri:
1. **Install Nginx & Git:**
   ```bash
   sudo apt update && sudo apt install -y nginx git
   ```
2. **Clone / Copy File ke Direktori Web:**
   ```bash
   cd /var/www/
   sudo git clone https://github.com/USERNAME/ruijie-voucher-app.git voucher
   ```
3. **Konfigurasi Nginx Server Block:**
   ```bash
   sudo nano /etc/nginx/sites-available/voucher
   ```
   Isi konfigurasi:
   ```nginx
   server {
       listen 80;
       server_name voucher.domainanda.com;
       root /var/www/voucher;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```
4. **Aktifkan & Pasang SSL Gratis (Let's Encrypt):**
   ```bash
   sudo ln -s /etc/nginx/sites-available/voucher /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d voucher.domainanda.com
   ```

---

## 🔹 OPSI 5: Server Lokal Warkop (100% Offline via WiFi LAN)

Jika warkop berada di daerah minim sinyal dan ingin 100% offline di jaringan lokal:
1. Pastikan Node.js terinstall di laptop/komputer kasir server warkop.
2. Jalankan perintah server lokal:
   ```bash
   node server.js
   ```
3. Cek alamat IP lokal laptop server (misal: `192.168.1.100`).
4. Seluruh HP kasir/operator yang terhubung ke WiFi warkop bisa langsung membuka browser dan mengetik:
   `http://192.168.1.100:3000`

---

## 📱 Panduan Install PWA di HP Android Kasir
1. Buka URL website (misal: `https://ruijie-voucher-app.vercel.app`) di browser **Google Chrome** di HP Android.
2. Klik tombol **"📲 Install App"** di bagian atas, ATAU klik menu titik tiga (⋮) di Chrome -> pilih **"Tambahkan ke Layar Utama" / "Install Aplikasi"**.
3. Ikon **Voucher Ruijie** akan muncul di layar HP kasir dan dapat dibuka dalam tampilan fullscreen layaknya aplikasi Play Store asli!
