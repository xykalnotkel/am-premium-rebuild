import AppIcon, { ICON_NAMES } from "../components/AppIcon";

export const metadata = { title: "Icon Library — AM Prem Verifier" };

const LABELS = {
  logo: "Logo / Brand",
  mail: "Email (Langkah 1)",
  link: "Magic Link (Langkah 2)",
  shield: "Verifikasi",
  chart: "Statistik",
  terminal: "Terminal Log",
  download: "Unduh JSON",
  sparkles: "Premium / Sukses",
};

export default function IconsPage() {
  return (
    <div className="page">
      <header className="qs-top">
        <a className="qs-brand" href="/">
          <AppIcon name="logo" size={30} />
          <span>AM Prem Verifier <em>icon library</em></span>
        </a>
        <a className="qs-btn qs-btn-ghost qs-btn-sm" href="/">← Kembali ke aplikasi</a>
      </header>
      <main className="qs-wrap">
        <section className="qs-card">
          <h1>Icon Library</h1>
          <p className="qs-muted">
            8 ikon AI gaya violet, transparan (rembg AI), format <b>WebP q90</b> —
            tajam di retina, ±8–13 KB per ikon. Master 512px otomatis dipakai di layar retina via <code>srcSet</code>.
          </p>
          <div className="gal-grid">
            {ICON_NAMES.map((n) => (
              <div key={n} className="gal-item">
                <div className="gal-preview">
                  <AppIcon name={n} size={72} />
                </div>
                <b>{n}.webp</b>
                <span className="qs-muted qs-small">{LABELS[n]}</span>
                <div className="gal-sizes">
                  <AppIcon name={n} size={16} />
                  <AppIcon name={n} size={24} />
                  <AppIcon name={n} size={32} />
                  <AppIcon name={n} size={48} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="qs-card">
          <h2>Pemakaian</h2>
          <pre className="qs-code">{`import AppIcon from "@/app/components/AppIcon";

// di JSX:
<AppIcon name="mail" size={24} />
<AppIcon name="shield" size={48} />`}</pre>
          <p className="qs-muted qs-small">
            Nama valid: {ICON_NAMES.join(", ")}. File publik: <code>/icons/*.webp</code> dan <code>/icons/*-512.webp</code>.
          </p>
        </section>
      </main>
    </div>
  );
}
