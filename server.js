import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== In-memory store (swap with DB if needed) ======
const wishes = []; // { name, message, attendance, createdAt }
const rsvps  = []; // { name, attendance, createdAt }

function verifyToken(token) {
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

function authGate(req, res, next) {
  const token = req.query.token || req.cookies.invite_token;
  const payload = token ? verifyToken(token) : null;

  if (!payload || payload.scope !== "invite") {
    return res.status(401).send(`
      <html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
      <body style="font-family:system-ui;padding:24px;max-width:720px;margin:auto;background:#0b0b10;color:#fff">
        <h2 style="margin:0 0 8px;">Akses Ditolak</h2>
        <p style="opacity:.85;line-height:1.6;margin:0 0 12px;">
          Undangan ini bersifat eksklusif. Link kamu tidak valid / sudah kedaluwarsa.
        </p>
        <p style="opacity:.7;margin:0;">Jika kamu merasa ini kesalahan, minta link baru dari pengantin.</p>
      </body></html>
    `);
  }

  // remember token so the guest doesn't need query token after first open
  res.cookie("invite_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false // set true behind HTTPS
  });

  // pass guest name to frontend via header
  res.setHeader("X-Guest-Name", payload.to || "Tamu Undangan");
  next();
}

// static assets
app.use("/public", express.static(path.join(__dirname, "public"), {
  maxAge: "7d",
  etag: true
}));

app.get("/", authGate, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===== API =====
app.get("/api/me", authGate, (req, res) => {
  res.json({ ok: true });
});

app.get("/api/wishes", authGate, (req, res) => {
  res.json(wishes.slice().reverse());
});

app.post("/api/wishes", authGate, (req, res) => {
  const guestName = req.get("X-Guest-Name") || "Tamu";
  const { message, attendance } = req.body || {};
  const msg = String(message || "").trim();
  if (msg.length < 2) return res.status(400).json({ error: "Ucapan minimal 2 karakter." });

  const entry = {
    name: guestName,
    message: msg,
    attendance: attendance === "hadir" ? "hadir" : "tidak",
    createdAt: new Date().toISOString()
  };
  wishes.push(entry);
  res.json({ ok: true, entry });
});

app.post("/api/rsvp", authGate, (req, res) => {
  const guestName = req.get("X-Guest-Name") || "Tamu";
  const { attendance } = req.body || {};
  const entry = {
    name: guestName,
    attendance: attendance === "hadir" ? "hadir" : "tidak",
    createdAt: new Date().toISOString()
  };
  rsvps.push(entry);
  res.json({ ok: true, entry });
});

// ===== Helper: generate token for a specific guest =====
// Example: http://localhost:3000/gen?to=Mas%20Wiwis
app.get("/gen", (req, res) => {
  const to = req.query.to;
  if (!to) return res.status(400).send("Tambahkan ?to=NamaTamu");

  const token = jwt.sign(
    { to: String(to), scope: "invite" },
    process.env.JWT_SECRET,
    { expiresIn: "180d" }
  );

  const port = process.env.PORT || 3000;
  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
  const link = `${baseUrl}/?token=${token}`;


  res.send(`
    <html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
    <body style="font-family:system-ui;padding:24px;max-width:900px;margin:auto;">
      <h3 style="margin:0 0 10px;">Link Undangan</h3>
      <p style="margin:0 0 12px;">Untuk: <b>${String(to)}</b></p>
      <p style="margin:0 0 12px;"><a href="${url}">Buka Undangan</a></p>
      <p style="margin:0 0 8px;">Copy link:</p>
      <code style="display:block;padding:12px;border:1px solid #ddd;border-radius:10px;word-break:break-all">${url}</code>
      <p style="margin:14px 0 0;color:#555">Tips: setelah dibuka sekali, token akan tersimpan via cookie.</p>
    </body></html>
  `);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server: http://localhost:${port}`);
  console.log(`Generate link: http://localhost:${port}/gen?to=Mas%20Wiwis`);
});
