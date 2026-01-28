# Wedding Invite (Exclusive)

## Cara jalanin
1) Install
   npm install

2) Set secret
   edit `.env` lalu ganti `JWT_SECRET`

3) Run
   npm run dev

## Generate link tamu
Buka:
  http://localhost:3000/gen?to=Mas%20Wiwis

Kirim link yang dihasilkan ke tamu.

## Ganti konten
- Foto: `public/assets/hero.jpg` + `gallery-*.jpg`
- Musik: `public/assets/bgm.wav` (ganti dengan lagu kamu)
- Tanggal: `public/app.js` -> `targetDate`
- Maps: `public/index.html` -> link & iframe src
