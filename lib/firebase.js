// Helper Firebase IdentityToolkit — dipakai oleh semua API route.

export function getConfig() {
  return {
    apiKey: (process.env.AM_FIREBASE_API_KEY || "").trim(),
    continueUrl: (process.env.AM_CONTINUE_URL || "").trim(),
    pkg: (process.env.AM_ANDROID_PACKAGE || "com.alightcreative.motion").trim(),
    referer: (
      process.env.AM_REFERER || "https://alight-creative.firebaseapp.com/"
    ).trim(),
    returnTokens: String(process.env.AM_RETURN_TOKENS || "false").toLowerCase() === "true",
  };
}

export function isConfigured(cfg) {
  return Boolean(cfg.apiKey && cfg.continueUrl);
}

export function notConfiguredResponse() {
  return Response.json(
    {
      success: false,
      message:
        "Backend belum dikonfigurasi (AM_FIREBASE_API_KEY / AM_CONTINUE_URL kosong). Lihat README Bab 2.",
      code: "NOT_CONFIGURED",
    },
    { status: 500 }
  );
}

/** IP acak untuk header X-Forwarded-For (meniru perilaku web asli). */
export function randomIp() {
  const n = () => 1 + Math.floor(Math.random() * 254);
  return `${n()}.${n()}.${n()}.${n()}`;
}

/**
 * Header penyamaran klien resmi.
 * - User-Agent Dalvik + X-Android-Package: meniru aplikasi Android.
 * - Referer WAJIB: API key Firebase Alight Motion dibatasi HTTP referrer —
 *   tanpa referer yang diizinkan, Firebase menolak dengan
 *   API_KEY_HTTP_REFERRER_BLOCKED ("Requests from referer <empty> are blocked").
 */
export function androidHeaders(pkg, referer) {
  return {
    "Content-Type": "application/json",
    "User-Agent":
      "Dalvik/2.1.0 (Linux; U; Android 13; Pixel 7 Build/TQ3A.230805.001)",
    "X-Android-Package": pkg,
    "X-Client-Version": "Android/JCore/1.0",
    "X-Forwarded-For": randomIp(),
    Referer:
      referer || process.env.AM_REFERER || "https://alight-creative.firebaseapp.com/",
  };
}

/**
 * Ekstrak oobCode dari magic link.
 * - Menerima tautan lengkap Firebase (...?oobCode=XXX&...) ATAU kode mentah.
 * - Mengurai link berlapis page.link/?link=<encoded> secara rekursif.
 */
export function extractOobCode(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  // Coba langsung dulu (mendukung kode mentah maupun URL sederhana)
  let m = s.match(/[?&]oobCode=([^&#\s]+)/);
  if (m) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  }
  // Coba unwrap page.link/?link=... (bisa double-encoded)
  try {
    let u = s;
    for (let i = 0; i < 3; i++) {
      const url = new URL(u);
      const inner = url.searchParams.get("link");
      if (!inner || !/^https?:\/\//i.test(inner)) break;
      u = inner;
      m = u.match(/[?&]oobCode=([^&#\s]+)/);
      if (m) {
        try {
          return decodeURIComponent(m[1]);
        } catch {
          return m[1];
        }
      }
    }
  } catch {
    /* bukan URL valid → anggap kode mentah */
  }
  // Fallback ala web asli: pakai seluruh string sebagai oobCode
  return s;
}

/** Ambil pesan error Firebase yang paling informatif. */
export function firebaseErrorMessage(fb) {
  return (
    fb?.error?.message ||
    fb?.error?.errors?.[0]?.message ||
    "UNKNOWN_ERROR"
  );
}
