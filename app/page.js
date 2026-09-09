"use client";

import { useEffect, useState } from "react";
import AppIcon from "./components/AppIcon";

const HISTORY_KEY = "am_verified_history";

const BOOT_LOG = [
  { id: "init-1", timestamp: "SYSTEM", type: "info", text: "Quiet Surface engine siap digunakan." },
  { id: "init-2", timestamp: "READY", type: "cmd", text: 'Masukkan email lalu klik "Kirim Link".' },
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function Page() {
  const [email, setEmail] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [magicLink, setMagicLink] = useState("");
  const [step, setStep] = useState(1);
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [notice, setNotice] = useState({ type: null, text: "" });
  const [result, setResult] = useState(null);
  const [log, setLog] = useState(BOOT_LOG);
  const [history, setHistory] = useState([]);
  const [showSession, setShowSession] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(null);

  const pushLog = (text, type = "info") =>
    setLog((l) => [...l, { id: uid(), timestamp: new Date().toLocaleTimeString(), type, text }]);

  const refreshStats = async () => {
    try {
      const r = await fetch("/api/stats");
      if (r.ok) {
        const j = await r.json();
        setStats({ total: Number(j.total) || 0, today: Number(j.today) || 0 });
      }
    } catch {}
  };

  useEffect(() => {
    refreshStats();
    try {
      const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if (Array.isArray(h)) setHistory(h);
    } catch {}
  }, []);

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  async function post(path, payload) {
    const r = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const txt = await r.text();
    let j = {};
    try {
      j = JSON.parse(txt);
    } catch {
      throw new Error(`Respons server tidak valid (HTTP ${r.status}).`);
    }
    if (!r.ok || !j.success) throw new Error(j.message || `Request gagal (${r.status})`);
    return j;
  }

  async function handleSend(e) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!em) {
      setNotice({ type: "error", text: "Silakan masukkan alamat email!" });
      pushLog("Error: Email tidak boleh kosong", "error");
      return;
    }
    if (!em.includes("@") || !em.includes(".")) {
      setNotice({ type: "error", text: "Format alamat email tidak valid!" });
      pushLog("Error: Format email tidak valid", "error");
      return;
    }
    setSending(true);
    setNotice({ type: "info", text: "Mengirimkan magic link verifikasi ke email..." });
    pushLog(`Menghubungi IdentityToolkit untuk ${em}...`, "cmd");
    try {
      const j = await post("/api/send-link", { email: em });
      pushLog(`Link verifikasi terkirim ke: ${em}`, "success");
      pushLog("Buka email masuk lalu tempelkan link di Langkah 2", "warn");
      setNotice({ type: "success", text: j.message });
      setStep(2);
    } catch (err) {
      pushLog(`ERROR: ${err.message}`, "error");
      setNotice({ type: "error", text: err.message });
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    const link = magicLink.trim();
    if (!em) return setNotice({ type: "error", text: "Email wajib diisi!" });
    if (!link) {
      setNotice({ type: "error", text: "Silakan tempelkan Magic Link dari email Anda!" });
      pushLog("Error: Link verifikasi kosong", "error");
      return;
    }
    setVerifying(true);
    setNotice({ type: "info", text: "Memverifikasi link & mengaktifkan akun..." });
    pushLog("Ekstraksi oobCode & autentikasi Android client...", "cmd");
    try {
      const j = await post("/api/verify-link", { email: em, magicLink: link });
      const user = j.data || j.userData;
      pushLog(`VERIFIKASI BERHASIL! UID: ${user.uid}`, "success");
      if (user.orderId) pushLog(`Lisensi aktif: Order ${user.orderId}`, "success");
      pushLog(`Masa berlaku: ${user.validUntil || "1 Tahun"}`, "info");
      const cookieVal = sessionId.trim() || user.orderId || "verified_token";
      setResult({ userData: user, raw: j, email: em, cookie: cookieVal });
      if (j.data?.stats) setStats(j.data.stats);
      else refreshStats();
      setNotice({ type: "success", text: j.message || "Akun berhasil diverifikasi!" });
      const rec = {
        id: `rec-${Date.now()}`,
        email: em,
        cookie: cookieVal,
        timestamp: new Date().toLocaleString("id-ID"),
        userData: user,
        raw: j,
      };
      const next = [rec, ...history].slice(0, 20);
      setHistory(next);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {}
      setStep(3);
    } catch (err) {
      pushLog(`ERROR: ${err.message}`, "error");
      setNotice({ type: "error", text: err.message });
    } finally {
      setVerifying(false);
    }
  }

  async function pasteFromClipboard() {
    try {
      const t = await navigator.clipboard.readText();
      if (t) {
        setMagicLink(t.trim());
        pushLog(`Link ditempel dari clipboard (${t.slice(0, 30)}...)`, "info");
      }
    } catch {
      setNotice({ type: "error", text: "Tidak dapat mengakses clipboard. Tempel manual." });
    }
  }

  function downloadJson(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const u = result?.userData || {};
  const premium =
    u.status === "ACTIVE" || u.membershipStatus === "PREMIUM_ACTIVE" || result?.raw?.raw?.premium?.ok;

  const STEPS = [
    { n: 1, icon: "mail", label: "Email" },
    { n: 2, icon: "link", label: "Link" },
    { n: 3, icon: "shield", label: "Hasil" },
  ];

  return (
    <div className="page">
      <header className="qs-top">
        <a className="qs-brand" href="/">
          <AppIcon name="logo" size={30} />
          <span>AM Prem Verifier <em>rebuild</em></span>
        </a>
        <div className="qs-top-right">
          <span className="qs-net">Firebase Direct</span>
          <a className="qs-btn qs-btn-ghost qs-btn-sm" href="/icons">Icon Library</a>
        </div>
      </header>

      <main className="qs-wrap">
        <section className="qs-card qs-hero">
          <div className="qs-hero-main">
            <div className="qs-logo-ring"><AppIcon name="logo" size={52} /></div>
            <div>
              <span className="qs-eyebrow">VERIFIKASI AKUN BERBASIS WEB</span>
              <h1>AM Prem Magic Link Tool</h1>
              <p>Otomasi pengiriman magic link ke email dan verifikasi akun Alight Motion — cepat, tenang, dan aman.</p>
            </div>
          </div>
          <div className="qs-badges">
            <span className="qs-badge"><AppIcon name="sparkles" size={20} /> Auto 1-Year License</span>
            <span className="qs-badge tint"><AppIcon name="shield" size={20} /> Quiet Surface Engine</span>
          </div>
        </section>

        <section className="qs-stats">
          <div className="qs-card qs-stat">
            <div><span className="qs-stat-label">TOTAL AKTIVASI</span>
              <span className="qs-stat-num green">{stats.total.toLocaleString("id-ID")}</span></div>
            <div className="qs-stat-ico"><AppIcon name="chart" size={34} /></div>
          </div>
          <div className="qs-card qs-stat">
            <div><span className="qs-stat-label">AKTIVASI HARI INI</span>
              <span className="qs-stat-num">{stats.today.toLocaleString("id-ID")}</span></div>
            <div className="qs-stat-ico"><AppIcon name="sparkles" size={34} /></div>
          </div>
        </section>

        <nav className="qs-steps">
          {STEPS.map((s) => (
            <button key={s.n} onClick={() => (s.n === 3 && !result ? null : setStep(s.n))}
              disabled={s.n === 3 && !result} className={`qs-step ${step === s.n ? "active" : ""}`}>
              <AppIcon name={s.icon} size={20} /><span className="qs-step-num">0{s.n}</span> {s.label}
            </button>
          ))}
        </nav>

        {notice.text && (
          <div className={`qs-notice ${notice.type}`}>
            <span>{notice.text}</span>
            <button onClick={() => setNotice({ type: null, text: "" })}>Tutup</button>
          </div>
        )}

        {step === 1 && (
          <section className="qs-card">
            <h2>Masukkan Email Akun</h2>
            <p className="qs-muted qs-small">Link verifikasi instan dikirim langsung ke email Anda tanpa perlu kata sandi.</p>
            <form onSubmit={handleSend} className="qs-form">
              <label>Alamat Email Target</label>
              <input className="qs-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="contoh: user@gmail.com" />
              <p className="qs-hint">Pastikan email aktif dan dapat menerima email dari Alight Motion.</p>
              <div>
                <button type="button" className="qs-link" onClick={() => setShowSession(!showSession)}>
                  {showSession ? "− Sembunyikan Opsi Sesi Lanjutan" : "+ Opsi Sesi Lanjutan"}
                </button>
              </div>
              {showSession && (
                <div className="qs-session">
                  <label>Session Identifier (Opsional)</label>
                  <input className="qs-input" value={sessionId} onChange={(e) => setSessionId(e.target.value)}
                    placeholder="Otomatis digenerate oleh sistem..." />
                  <p className="qs-hint">Hanya label lokal di browser — tidak dikirim ke server.</p>
                </div>
              )}
              <div className="qs-btnrow">
                <button type="submit" disabled={sending} className="qs-btn qs-btn-primary">
                  <AppIcon name="mail" size={20} /> {sending ? "Mengirim..." : "Kirim Magic Link ke Email"}
                </button>
              </div>
            </form>
          </section>
        )}

        {step === 2 && (
          <section className="qs-card">
            <h2>Tempel Magic Link dari Email</h2>
            <p className="qs-muted qs-small">Target: <b>{email || "(kembali ke langkah 1)"}</b>{" "}
              <button className="qs-link" onClick={() => setStep(1)}>Ganti Email</button></p>
            <form onSubmit={handleVerify} className="qs-form">
              <label>Tautan Magic Link / Kode oobCode</label>
              <textarea className="qs-textarea" rows={3} required value={magicLink} onChange={(e) => setMagicLink(e.target.value)}
                placeholder="Tempel tautan lengkap dari email atau oobCode..." />
              <p className="qs-hint">Sistem otomatis mengekstrak parameter <code>oobCode</code> lalu sign-in ke Firebase.</p>
              <div className="qs-btnrow">
                <button type="button" onClick={pasteFromClipboard} className="qs-btn qs-btn-ghost">Tempel dari Clipboard</button>
                <button type="submit" disabled={verifying || !magicLink.trim()} className="qs-btn qs-btn-primary">
                  <AppIcon name="shield" size={20} /> {verifying ? "Memverifikasi..." : "Verifikasi & Aktivasi"}
                </button>
              </div>
            </form>
          </section>
        )}

        {step === 3 && result && (
          <section className="qs-card">
            <div className="qs-success">
              <div>
                <div className="qs-pills">
                  <span className="qs-eyebrow">SUCCESS VERIFIED</span>
                  {premium && <span className="qs-eyebrow">PREMIUM AKTIF</span>}
                </div>
                <h2>Akun Berhasil Diverifikasi</h2>
              </div>
              <div className="qs-btnrow">
                <button className="qs-btn qs-btn-ghost qs-btn-sm" onClick={() => downloadJson(`am-account-${result.email.replace(/[^a-zA-Z0-9]/g, "_")}.json`,
                  { verifiedAt: new Date().toISOString(), email: result.email, cookie: result.cookie, userData: result.userData, raw: result.raw })}>
                  <AppIcon name="download" size={18} /> Download JSON</button>
                <button className="qs-btn qs-btn-ghost qs-btn-sm" onClick={() => setShowRaw(!showRaw)}>
                  <AppIcon name="terminal" size={18} /> {showRaw ? "Tutup JSON" : "Raw JSON"}</button>
              </div>
            </div>
            <div className="qs-info">
              <Field title="Email Target" value={result.email} k="email" copied={copied} onCopy={copy} />
              <Field title="UID Firebase" value={u.uid || u.id || "Verified User"} k="uid" copied={copied} onCopy={copy} />
              <Field title="Status & Paket" value={`${u.status || "ACTIVE"} — ${u.tier || u.planName || "Alight Motion Pro / Member"}`} />
              <Field title="Order ID Aktivasi" value={u.orderId || "neo-verified"} k="order" copied={copied} onCopy={copy} mono />
              <Field title="Masa Berlaku" value={u.validUntil || "1 Tahun"} />
              <Field title="Token / Cookie" value={result.cookie} k="cookie" copied={copied} onCopy={copy} mono />
            </div>
            {showRaw && <pre className="qs-raw">{JSON.stringify(result.raw, null, 2)}</pre>}
            <div className="qs-btnrow">
              <button className="qs-btn qs-btn-ghost qs-btn-sm" onClick={() => { setStep(1); setMagicLink(""); setResult(null); setNotice({ type: null, text: "" }); }}>
                Verifikasi email lain
              </button>
            </div>
          </section>
        )}

        <section className="qs-term">
          <div className="qs-term-head">
            <span className="left"><AppIcon name="terminal" size={18} /> am_terminal.log</span>
            <button onClick={() => copy(log.map((l) => `[${l.timestamp}] ${l.text}`).join("\n"), "log")}>
              {copied === "log" ? "Tersalin" : "Salin"}</button>
          </div>
          <div className="qs-term-body">
            {log.map((l) => (<div key={l.id} className={`qs-term-line ${l.type}`}><span className="qs-term-ts">[{l.timestamp}]</span> {l.text}</div>))}
          </div>
        </section>

        {history.length > 0 && (
          <section className="qs-card">
            <h2>Riwayat Verifikasi</h2>
            <p className="qs-muted qs-small">Tersimpan lokal di perangkat ini.</p>
            <div className="qs-hist">
              {history.map((h) => (
                <div key={h.id} className="qs-hist-item">
                  <div><b>{h.email}</b> <span className="qs-muted qs-small">· {h.timestamp}</span>
                    <div className="qs-muted qs-small">UID: {h.userData?.uid || "-"} · Order: {h.userData?.orderId || h.cookie}</div></div>
                  <div className="qs-btnrow">
                    <button className="qs-btn qs-btn-ghost qs-btn-sm" onClick={() => downloadJson(`am-account-${h.email.replace(/[^a-zA-Z0-9]/g, "_")}.json`,
                      { exportDate: new Date().toISOString(), source: "AM Prem Verifier Rebuild", ...h })}>
                      <AppIcon name="download" size={16} /> JSON</button>
                    <button className="qs-btn qs-btn-ghost qs-btn-sm" onClick={() => copy(h.email, h.id)}>{copied === h.id ? "Tersalin" : "Salin"}</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="qs-how">
          {[
            ["mail", "1. Masukkan Email", "Ketik email Alight Motion. Sistem memicu pengiriman magic link resmi via IdentityToolkit."],
            ["link", "2. Salin dari Email", "Buka inbox/spam dari Alight Motion. Salin tautan tombol Sign In / Verify."],
            ["shield", "3. Aktivasi Otomatis", "Tempel link dan verifikasi. Sistem login otomatis dan mencatat lisensi."],
          ].map(([icon, t, d]) => (
            <div key={t} className="qs-card qs-how-card">
              <span className="qs-how-ico"><AppIcon name={icon} size={26} /></span>
              <div className="qs-how-t">{t}</div><p>{d}</p>
            </div>
          ))}
        </section>

        <footer className="qs-foot">AM Prem Verifier Rebuild · Quiet Surface UI · Backend langsung ke Firebase · <a href="/icons">Icon Library</a></footer>
      </main>
    </div>
  );
}

function Field({ title, value, k, copied, onCopy, mono }) {
  return (
    <div className="qs-field">
      <div className="qs-field-head"><span>{title}</span>
        {k && <button className="qs-link" onClick={() => onCopy(String(value), k)}>{copied === k ? "Tersalin" : "Salin"}</button>}</div>
      <p className={mono ? "mono" : ""}>{value}</p>
    </div>
  );
}
