function getGuestName() {
  const params = new URLSearchParams(window.location.search);
  const to = params.get("to");
  return to ? decodeURIComponent(to) : "Tamu Undangan";
}

// ===== Animations init =====
AOS.init({
  duration: 850,
  easing: "ease-out",
  once: false
});

const $ = (s) => document.querySelector(s);

const elCover = $("#cover");
const elInvite = $("#invite");
const elGuestName = $("#guestName");
const btnOpen = $("#openInvite");
const bgm = $("#bgm");
const btnMusic = $("#btnMusic");
const btnTop = $("#btnTop");
const progressBar = $("#progressBar");

// Smooth scroll helpers
function jumpTo(sel){
  const el = document.querySelector(sel);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Lock scroll on cover
function lockScroll(lock) {
  document.documentElement.style.overflow = lock ? "hidden" : "";
  document.body.style.overflow = lock ? "hidden" : "";
}

// Music control (autoplay requires user gesture)
let musicEnabled = false;

async function playMusic() {
  try {
    bgm.volume = 1.00;
    await bgm.play();
    musicEnabled = true;
    btnMusic.textContent = "❚❚";
  } catch {
    musicEnabled = false;
    btnMusic.textContent = "♪";
  }
}
function stopMusic() {
  bgm.pause();
  musicEnabled = false;
  btnMusic.textContent = "♪";
}

btnMusic.addEventListener("click", async () => {
  if (!musicEnabled) await playMusic();
  else stopMusic();
});

btnTop.addEventListener("click", () => jumpTo("#home"));

// Mini nav buttons
document.querySelectorAll("[data-jump]").forEach((b) => {
  b.addEventListener("click", () => jumpTo(b.getAttribute("data-jump")));
});

// Cover open
lockScroll(true);
const params = new URLSearchParams(window.location.search);
const to = params.get("to");

elGuestName.textContent = to
  ? decodeURIComponent(to)
  : "Tamu Undangan";

btnOpen.addEventListener("click", async () => {
  elInvite.classList.remove("hidden");
  elInvite.setAttribute("aria-hidden", "false");
  elCover.classList.add("hidden");
  lockScroll(false);

  await playMusic();
  jumpTo("#home");
});

// Progress bar
window.addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = max <= 0 ? 0 : (window.scrollY / max) * 100;
  progressBar.style.width = `${pct}%`;

  // "music follows scroll" subtle effect
  if (musicEnabled) {
    const vol = 0.35 + Math.min(0.65, pct / 100);
    bgm.volume = Math.min(1, Math.max(0.15, vol));
  }
}, { passive: true });

// ===== Countdown =====
// Ganti tanggal acara kamu di sini
const targetDate = new Date("2026-05-09T11:00:00+07:00").getTime();
function pad2(n){ return String(n).padStart(2,"0"); }
function tickCountdown(){
  const now = Date.now();
  const diff = Math.max(0, targetDate - now);

  const days = Math.floor(diff / (1000*60*60*24));
  const hrs  = Math.floor((diff / (1000*60*60)) % 24);
  const mins = Math.floor((diff / (1000*60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  $("#d").textContent = pad2(days);
  $("#h").textContent = pad2(hrs);
  $("#m").textContent = pad2(mins);
  $("#s").textContent = pad2(secs);
}
setInterval(tickCountdown, 1000);
tickCountdown();

// ===== Save The Date (Google Calendar) =====
const calTitle = encodeURIComponent("Pernikahan Damar & Winni");
const calDetails = encodeURIComponent("Save the date! (Sesuaikan detail acara di sini)");
const calLocation = encodeURIComponent("Ged Andre Prevot");
// format dates in UTC: YYYYMMDDTHHMMSSZ
const start = "20260103T040000Z";
const end   = "20260103T070000Z";
$("#addToCalendar").href =
  `https://www.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&details=${calDetails}&location=${calLocation}&dates=${start}/${end}`;

// ===== RSVP =====
const rsvpStatus = $("#rsvpStatus");
document.querySelectorAll("[data-att]").forEach(btn => {
  btn.addEventListener("click", async () => {
    const attendance = btn.getAttribute("data-att") === "hadir" ? "hadir" : "tidak";
    rsvpStatus.textContent = "Mengirim...";
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendance })
      });
      if (!res.ok) throw new Error("RSVP gagal");
      rsvpStatus.textContent = `Tersimpan: ${attendance === "hadir" ? "Hadir" : "Tidak Hadir"}`;
    } catch {
      rsvpStatus.textContent = "Gagal mengirim RSVP. Coba lagi.";
    }
  });
});

// ===== Wishes =====
const wishForm = $("#wishForm");
const wishMessage = $("#wishMessage");
const wishAttendance = $("#wishAttendance");
const wishInfo = $("#wishInfo");
const wishList = $("#wishList");
const refreshBtn = $("#refreshWishes");

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function renderWishes(items){
  wishList.innerHTML = "";
  if (!items.length) {
    wishList.innerHTML = `<div class="wish-item"><div class="meta">Belum ada ucapan.</div></div>`;
    return;
  }
  for (const w of items) {
    const dt = new Date(w.createdAt);
    const badge = w.attendance === "hadir" ? "Hadir" : "Tidak hadir";
    const el = document.createElement("div");
    el.className = "wish-item";
    el.innerHTML = `
      <div class="meta">
        <b>${escapeHtml(w.name)}</b>
        <span class="badge">${badge}</span>
        <span>${dt.toLocaleString("id-ID")}</span>
      </div>
      <div>${escapeHtml(w.message)}</div>
    `;
    wishList.appendChild(el);
  }
}
async function loadWishes(){
  try {
    const res = await fetch("/api/wishes");
    if (!res.ok) throw new Error("load failed");
    const data = await res.json();
    renderWishes(data);
  } catch {
    wishList.innerHTML = `<div class="wish-item"><div class="meta">Gagal memuat ucapan.</div></div>`;
  }
}

wishForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  wishInfo.textContent = "Mengirim...";
  try {
    const res = await fetch("/api/wishes", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        message: wishMessage.value,
        attendance: wishAttendance.value
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Gagal");
    wishMessage.value = "";
    wishInfo.textContent = "Terkirim. Terima kasih!";
    await loadWishes();
  } catch (err) {
    wishInfo.textContent = String(err?.message || "Gagal mengirim.");
  }
});
refreshBtn.addEventListener("click", loadWishes);
loadWishes();

// ===== Copy rekening =====
$("#copyAcc").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("#acc").textContent.trim());
    $("#copyAcc").textContent = "Tersalin!";
    setTimeout(()=> $("#copyAcc").textContent = "Salin", 1200);
  } catch {
    $("#copyAcc").textContent = "Gagal";
    setTimeout(()=> $("#copyAcc").textContent = "Salin", 1200);
  }
});

// ===== Gallery lightbox =====
const lb = $("#lightbox");
const lbImg = $("#lbImg");
const lbClose = $("#lbClose");

document.querySelectorAll(".gitem").forEach(btn => {
  btn.addEventListener("click", () => {
    const src = btn.getAttribute("data-img");
    lbImg.src = src;
    lb.classList.remove("hidden");
    lb.setAttribute("aria-hidden", "false");
  });
});
function closeLb(){
  lb.classList.add("hidden");
  lb.setAttribute("aria-hidden", "true");
  lbImg.src = "";
}
lbClose.addEventListener("click", closeLb);
lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const to = params.get("to");

  const guestName = to ? decodeURIComponent(to) : "Tamu Undangan";

  const el = document.getElementById("guestName");
  if (el) {
    el.textContent = guestName;
  }
});
