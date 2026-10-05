# NecDL
Downloader video, foto, dan audio (index.html + server.js Node.js, memakai https://github.com/coflyn/scrapr).

## Jalankan lokal
    npm install
    npm start        # buka http://localhost:3000

## Deploy agar bisa dipakai orang lain
Gunakan hosting Node yang berjalan terus (Railway, Render, Fly.io, atau VPS), bukan hosting statis.
Build: `npm install` — Start: `npm start`. Node >= 18.

## Catatan
- scrapr bergantung pada situs pihak ketiga, jadi sewaktu-waktu bisa error. Cek issue di repo scrapr.
- Scraper yang butuh Chrome/Playwright (savetik, fdown, snapinsta) tidak dipakai agar server ringan.
- Gunakan hanya untuk konten milik sendiri / yang diizinkan.

## Deploy ke Vercel
    npm i -g vercel
    vercel login
    vercel --prod
Di domain vercel.app, tombol download membuka link CDN langsung (batas 4,5 MB Vercel). Tambah ?direct=1 di URL untuk memaksa mode ini di tempat lain.
