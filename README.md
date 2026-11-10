# GENIUS NET Pelanggan (Capacitor)

APK dibuat otomatis oleh GitHub Actions setiap push ke `main`.
Hasilnya ada di tab **Releases** (file `genius-net-pelanggan.apk`) dan di
Actions > run terbaru > Artifacts.

## Cara pakai di GitHub
1. Buat repo baru, upload semua isi folder ini (termasuk folder `.github`).
2. Settings > Actions > General > Workflow permissions > pilih **Read and write permissions**.
3. Push ke `main`, tunggu build selesai (±5 menit), unduh APK dari Releases.

## Konfigurasi
- Server API: `www/app.js` baris pertama (`BASE`).
- Ikon: taruh `resources/icon.png` (1024x1024), build berikutnya otomatis memakainya.
- `appId` di `capacitor.config.json` ubah hanya sebelum build pertama dipasang di HP.

## Agar APK bisa di-update tanpa uninstall (opsional, disarankan)
Tanpa langkah ini, tiap build memakai kunci tanda tangan acak sehingga HP menolak
update di atas versi lama. Buat keystore sekali saja:

    keytool -genkeypair -v -keystore debug.keystore -storepass android -keypass android \
      -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
    base64 -w0 debug.keystore

Salin hasil base64 ke GitHub: Settings > Secrets and variables > Actions >
New repository secret, nama `DEBUG_KEYSTORE_BASE64`. Simpan file `debug.keystore` dengan aman.

## Build lokal (opsional)
    npm install && npx cap add android && npx cap sync android && npx cap open android
