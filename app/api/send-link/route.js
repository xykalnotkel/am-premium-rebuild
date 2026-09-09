import {
  getConfig,
  isConfigured,
  notConfiguredResponse,
  androidHeaders,
  firebaseErrorMessage,
} from "@/lib/firebase";

// Terjemahan error Firebase → pesan Indonesia yang ramah
function friendlySendError(fbMsg) {
  const m = String(fbMsg || "");
  if (m.includes("INVALID_EMAIL") || m.includes("MISSING_EMAIL"))
    return "Email tidak valid.";
  if (m.includes("TOO_MANY_ATTEMPTS_TRY_LATER"))
    return "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.";
  if (m.includes("QUOTA_EXCEEDED") || m.includes("PROJECT_QUOTA_EXCEEDED"))
    return "Kuota pengiriman email Firebase habis. Coba lagi besok.";
  if (m.includes("API key not valid") || m.includes("API_KEY_INVALID"))
    return "Konfigurasi API key salah. Hubungi admin.";
  return "Gagal mengirim link verifikasi.";
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();

  if (!email.includes("@") || !email.includes(".") || email.length > 254) {
    return Response.json(
      { success: false, message: "Email tidak valid." },
      { status: 400 }
    );
  }

  const cfg = getConfig();
  if (!isConfigured(cfg)) return notConfiguredResponse();

  try {
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${cfg.apiKey}`,
      {
        method: "POST",
        headers: androidHeaders(cfg.pkg, cfg.referer),
        body: JSON.stringify({
          requestType: "EMAIL_SIGNIN",
          email,
          continueUrl: cfg.continueUrl,
          canHandleCodeInApp: true,
          androidPackageName: cfg.pkg,
          androidInstallApp: true,
        }),
      }
    );
    const fb = await r.json().catch(() => ({}));
    if (!r.ok || fb.error) {
      const fbMsg = firebaseErrorMessage(fb);
      return Response.json(
        {
          success: false,
          message: friendlySendError(fbMsg),
          code: JSON.stringify(fb),
        },
        { status: 400 }
      );
    }
    return Response.json({
      success: true,
      message: `Link verifikasi dikirim ke ${email}. Cek inbox atau spam email Anda.`,
    });
  } catch (e) {
    return Response.json(
      {
        success: false,
        message: "Gagal menghubungi server verifikasi. Periksa koneksi lalu coba lagi.",
        code: String(e?.message || e),
      },
      { status: 502 }
    );
  }
}
