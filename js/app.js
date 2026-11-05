import { onAuth, login, register, logout, authError } from "./auth.js";
import { listRange, addTx, updateTx, deleteTx } from "./db.js";
import { renderMonthChart, renderPieChart, destroyChart } from "./chart.js";
import { h, clear, icon, hydrateIcons, rupiah, formatAmount, parseAmount, startOfWeek, addDays, ymd, fromYmd,
  shortDate, DAYS, MONTHS, CATEGORIES, getTheme, setTheme, toast } from "./ui.js";

const $ = (id) => document.getElementById(id);
const now = new Date();
const S = { user: null, weekStart: startOfWeek(now), sel: null, tab: "income", week: [], wLoad: false, wErr: null,
  month: new Date(now.getFullYear(), now.getMonth(), 1), mtx: [], mLoad: false, mErr: null };
let wTok = 0, mTok = 0, authMode = "login", lastFocus = null;

const netMsg = (e) => e?.code === "permission-denied" ? "Akses ditolak. Periksa firestore.rules."
  : (!navigator.onLine || e?.code === "unavailable") ? "Tidak ada koneksi internet. Coba lagi." : "Terjadi kesalahan. Coba lagi.";
const errBox = (msg, retry) => h("div", { class: "err", role: "alert" }, h("p", {}, msg), h("button", { class: "btn", type: "button", onclick: retry }, "Coba lagi"));

/* ---------- Auth ---------- */
function setMode(m) {
  authMode = m;
  $("tab-login").setAttribute("aria-selected", String(m === "login"));
  $("tab-register").setAttribute("aria-selected", String(m === "register"));
  $("auth-submit").textContent = m === "login" ? "Masuk" : "Daftar";
  $("auth-pass").autocomplete = m === "login" ? "current-password" : "new-password";
  $("auth-error").textContent = "";
}
$("tab-login").onclick = () => setMode("login");
$("tab-register").onclick = () => setMode("register");
$("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("auth-email").value.trim(), pw = $("auth-pass").value;
  if (!email || !pw) { $("auth-error").textContent = "Email dan kata sandi wajib diisi."; return; }
  const btn = $("auth-submit"); btn.disabled = true; $("auth-error").textContent = "";
  try { await (authMode === "login" ? login(email, pw) : register(email, pw)); }
  catch (x) { $("auth-error").textContent = authError(x); }
  finally { btn.disabled = false; }
});
$("btn-logout").onclick = async () => { try { await logout(); } catch (e) { toast("Gagal keluar. Coba lagi."); } };

onAuth((user) => {
  $("loading").hidden = true;
  S.user = user;
  $("auth-screen").hidden = !!user;
  $("app-screen").hidden = !user;
  if (user) {
    S.weekStart = startOfWeek(new Date()); S.sel = null; S.tab = "income";
    S.month = new Date(now.getFullYear(), now.getMonth(), 1);
    loadWeek(); loadMonth();
  } else {
    S.week = []; S.mtx = []; destroyChart(); closeSheet(); $("auth-pass").value = "";
  }
});

/* ---------- Mingguan ---------- */
async function loadWeek() {
  const t = ++wTok; S.wLoad = true; S.wErr = null; renderWeek();
  try {
    const r = await listRange(S.user.uid, S.weekStart, addDays(S.weekStart, 7));
    if (t !== wTok) return; S.week = r;
  } catch (x) { if (t !== wTok) return; S.wErr = netMsg(x); }
  S.wLoad = false; renderWeek();
}
function renderWeek() {
  const end = addDays(S.weekStart, 6);
  $("week-label").textContent = `${shortDate(S.weekStart)} – ${shortDate(end)} ${end.getFullYear()}`;
  renderStrip(); renderSummary(); renderDetail();
}
function renderStrip() {
  const st = clear($("strip")), today = ymd(new Date());
  for (let i = 0; i < 7; i++) {
    const d = addDays(S.weekStart, i), k = ymd(d);
    st.append(h("button", { type: "button", class: "day" + (k === S.sel ? " is-sel" : "") + (k === today ? " is-today" : ""),
      "aria-pressed": String(k === S.sel), "aria-label": `${DAYS[i]} ${d.getDate()}${k === today ? ", hari ini" : ""}`,
      onclick: () => { S.sel = S.sel === k ? null : k; renderStrip(); renderDetail(); } },
      h("span", { class: "dn" }, DAYS[i]), h("span", { class: "dd" }, d.getDate())));
  }
  $("all-days").hidden = !S.sel;
}
$("all-days").onclick = () => { S.sel = null; renderStrip(); renderDetail(); };
$("prev-week").onclick = () => { S.weekStart = addDays(S.weekStart, -7); S.sel = null; loadWeek(); };
$("next-week").onclick = () => { S.weekStart = addDays(S.weekStart, 7); S.sel = null; loadWeek(); };

const sum = (list, type) => list.filter((t) => t.type === type).reduce((a, t) => a + t.amount, 0);
function renderSummary() {
  const box = clear($("summary"));
  const ok = !S.wLoad && !S.wErr;
  const inc = ok ? sum(S.week, "income") : 0, out = ok ? sum(S.week, "expense") : 0;
  const v = (n) => ok ? rupiah(n) : "…";
  box.append(
    h("div", { class: "stat in" }, h("span", {}, "Total Pemasukan"), h("b", {}, v(inc))),
    h("div", { class: "stat out" }, h("span", {}, "Total Pengeluaran"), h("b", {}, v(out))),
    h("div", { class: "stat bal" }, h("span", {}, "Saldo"), h("b", {}, v(inc - out))));
}
function renderDetail() {
  const box = clear($("detail"));
  if (S.wLoad) return box.append(h("p", { class: "note" }, "Memuat catatan…"));
  if (S.wErr) return box.append(errBox(S.wErr, loadWeek));
  if (!S.sel) return box.append(S.week.length ? h("p", { class: "note" }, "Pilih hari untuk melihat catatan.") : h("p", { class: "empty" }, "Belum ada catatan minggu ini"));
  const tabBtn = (type, label) => h("button", { type: "button", role: "tab", "aria-selected": String(S.tab === type),
    onclick: () => { S.tab = type; renderDetail(); } }, label);
  box.append(h("div", { class: "tabs", role: "tablist" }, tabBtn("income", "Pemasukan"), tabBtn("expense", "Pengeluaran")));
  const items = S.week.filter((t) => t.type === S.tab && ymd(t.date) === S.sel);
  if (!items.length) return box.append(h("p", { class: "empty" }, `Belum ada catatan ${S.tab === "income" ? "pemasukan" : "pengeluaran"} hari ini`));
  for (const t of items) {
    box.append(h("button", { type: "button", class: "tx " + t.type, "aria-label": `Ubah catatan ${t.note || "pemasukan"} ${rupiah(t.amount)}`, onclick: () => openForm(t.type, t) },
      h("span", {}, t.note || "Pemasukan", t.category ? h("small", {}, t.category) : null),
      h("span", { class: "amt" }, (t.type === "income" ? "+" : "−") + rupiah(t.amount))));
  }
}

/* ---------- Bulanan ---------- */
async function loadMonth() {
  const t = ++mTok; S.mLoad = true; S.mErr = null; renderMonth();
  try {
    const s = S.month, r = await listRange(S.user.uid, s, new Date(s.getFullYear(), s.getMonth() + 1, 1));
    if (t !== mTok) return; S.mtx = r;
  } catch (x) { if (t !== mTok) return; S.mErr = netMsg(x); }
  S.mLoad = false; renderMonth();
}
function renderMonth() {
  $("month-label").textContent = `${MONTHS[S.month.getMonth()]} ${S.month.getFullYear()}`;
  const st = clear($("chart-state")), wrap = $("chart-wrap");
  wrap.hidden = true;
  const pst = clear($("pie-state")), pwrap = $("pie-wrap");
  pwrap.hidden = true;
  if (S.mLoad) {
    st.append(h("p", { class: "note" }, "Memuat grafik…"));
    return;
  }
  if (S.mErr) {
    st.append(errBox(S.mErr, loadMonth));
    return;
  }
  if (!S.mtx.length) {
    st.append(h("p", { class: "empty" }, "Belum ada catatan bulan ini"));
    return;
  }
  const y = S.month.getFullYear(), m = S.month.getMonth(), first = startOfWeek(S.month), WK = 7 * 864e5;
  const n = Math.round((startOfWeek(new Date(y, m + 1, 0)) - first) / WK) + 1;
  const inc = Array(n).fill(0), out = Array(n).fill(0);
  for (const t of S.mtx) { const i = Math.round((startOfWeek(t.date) - first) / WK); (t.type === "income" ? inc : out)[i] += t.amount; }
  wrap.hidden = false;
  renderMonthChart($("month-chart"), inc.map((_, i) => `Mgg ${i + 1}`), inc, out);

  /* Pie chart: komposisi pengeluaran per kategori */
  const byCat = new Map();
  for (const t of S.mtx) {
    if (t.type !== "expense") continue;
    const key = t.category || "Lainnya";
    byCat.set(key, (byCat.get(key) || 0) + t.amount);
  }
  const totalExp = [...byCat.values()].reduce((a, v) => a + v, 0);
  if (!totalExp) {
    pst.append(h("p", { class: "empty" }, "Belum ada pengeluaran bulan ini"));
    return;
  }
  const entries = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const labels = entries.map((e) => e[0]);
  const values = entries.map((e) => e[1]);
  pwrap.hidden = false;
  renderPieChart($("pie-chart"), labels, values);
}
$("prev-month").onclick = () => { S.month = new Date(S.month.getFullYear(), S.month.getMonth() - 1, 1); loadMonth(); };
$("next-month").onclick = () => { S.month = new Date(S.month.getFullYear(), S.month.getMonth() + 1, 1); loadMonth(); };
document.addEventListener("themechange", () => { if (S.user && !S.mLoad && !S.mErr) renderMonth(); });

/* ---------- Sheet ---------- */
function openSheet(title, node, modal) {
  lastFocus = document.activeElement;
  $("sheet-title").textContent = title;
  $("sheet").classList.toggle("modal", !!modal);
  clear($("sheet-body")).append(node);
  $("overlay").hidden = false;
  (node.querySelector("input,select,button") || $("sheet-close")).focus();
}
function closeSheet() { $("overlay").hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
$("sheet-close").onclick = closeSheet;
$("overlay").addEventListener("click", (e) => { if (e.target === $("overlay")) closeSheet(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("overlay").hidden) closeSheet(); });

$("fab").onclick = () => openSheet("Catatan baru", h("div", {},
  h("button", { type: "button", class: "choice income", onclick: () => openForm("income") }, icon("up"), "Pemasukan"),
  h("button", { type: "button", class: "choice expense", onclick: () => openForm("expense") }, icon("down"), "Pengeluaran")));

$("btn-profile").onclick = () => {
  const dark = () => getTheme() === "dark";
  const sw = h("button", { type: "button", class: "switch", role: "switch", "aria-checked": String(dark()),
    onclick: () => { setTheme(dark() ? "light" : "dark"); sw.setAttribute("aria-checked", String(dark())); } },
    "Tema gelap", h("i"));
  openSheet("Profil", h("div", {}, h("p", { class: "muted" }, "Email akun"), h("p", { style: "font-weight:800;word-break:break-all;margin-top:0" }, S.user.email), sw), true);
};

function openForm(type, tx) {
  const isIn = type === "income";
  const amt = h("input", { class: "inp", inputmode: "numeric", autocomplete: "off", placeholder: "0", "aria-label": "Nominal", value: tx ? formatAmount(String(tx.amount)) : "" });
  amt.addEventListener("input", () => { amt.value = formatAmount(amt.value); });
  const date = h("input", { class: "inp", type: "date", value: ymd(tx ? tx.date : new Date()) });
  const note = h("input", { class: "inp", type: "text", maxlength: "100", placeholder: "Contoh: makan siang", value: tx ? tx.note : "" });
  const cat = h("select", { class: "inp" }, CATEGORIES.map((c) => h("option", { value: c, selected: tx && tx.category === c ? true : null }, c)));
  const err = h("p", { class: "form-error", role: "alert" });
  const save = h("button", { type: "submit", class: "btn primary" }, "Simpan");
  const fld = (l, i) => h("label", { class: "fld" }, h("span", {}, l), i);
  const form = h("form", { novalidate: true },
    fld("Nominal (Rp)", amt), fld("Tanggal", date),
    isIn ? null : fld("Keterangan", note), isIn ? null : fld("Kategori", cat), err,
    h("div", { class: "row" },
      tx ? h("button", { type: "button", class: "btn danger", onclick: async () => {
        if (!confirm("Hapus catatan ini?")) return;
        try { await deleteTx(S.user.uid, tx.id); closeSheet(); toast("Terhapus"); loadWeek(); loadMonth(); }
        catch (x) { err.textContent = netMsg(x); } } }, "Hapus") : null, save));
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); err.textContent = "";
    const amount = parseAmount(amt.value);
    if (!(amount > 0)) { err.textContent = "Nominal harus lebih dari 0."; return; }
    if (!date.value) { err.textContent = "Tanggal wajib diisi."; return; }
    if (!isIn && !note.value.trim()) { err.textContent = "Keterangan wajib diisi."; return; }
    const t = { type, amount, date: fromYmd(date.value), note: isIn ? "" : note.value.trim(), category: isIn ? "" : cat.value };
    save.disabled = true;
    try {
      await (tx ? updateTx(S.user.uid, tx.id, t) : addTx(S.user.uid, t));
      S.weekStart = startOfWeek(t.date); S.sel = ymd(t.date); S.tab = type;
      S.month = new Date(t.date.getFullYear(), t.date.getMonth(), 1);
      closeSheet(); toast("Tersimpan"); loadWeek(); loadMonth();
    } catch (x) { err.textContent = netMsg(x); }
    finally { save.disabled = false; }
  });
  openSheet(`${tx ? "Ubah" : "Catat"} ${isIn ? "pemasukan" : "pengeluaran"}`, form);
}

hydrateIcons();
setMode("login");