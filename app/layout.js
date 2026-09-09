import "./globals.css";

export const metadata = {
  title: "AM Prem Verifier — Rebuild Mandiri",
  description:
    "Layanan verifikasi akun Alight Motion via magic link. Backend mandiri langsung ke Firebase IdentityToolkit.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
