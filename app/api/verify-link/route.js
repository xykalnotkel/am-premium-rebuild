import {
  getConfig,
  isConfigured,
  notConfiguredResponse,
  androidHeaders,
  extractOobCode,
  firebaseErrorMessage,
} from "@/lib/firebase";
import { bumpStats } from "@/lib/stats";

function makeOrderId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `AM-${ts}-${rnd}`;
}

function validUntilDates() {
  const d = new Date(Date.now() + 365 * 24 * 3600 * 1000);
  return {
    validUntil: new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d),
    validUntilIso: d.toISOString(),
  };
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const magicLink = String(body.magicLink || "").trim();

  // Urutan validasi sama persis dengan web asli
  if (!email) {
    return Response.json(
      { success: false, message: "Email wajib diisi." },
      { status: 400 }
    );
  }
  if (!magicLink) {
    return Response.json(
      { success: false, message: "Link dari email wajib diisi." },
      { status: 400 }
    );
  }

  const cfg = getConfig();
  if (!isConfigured(cfg)) return notConfiguredResponse();

  const oobCode = extractOobCode(magicLink);
  if (!oobCode) {
    return Response.json(
      {
        success: false,
        message: "Kode magic link tidak valid atau sudah pernah digunakan.",
      },
      { status: 400 }
    );
  }

  try {
    // 1) Tukar oobCode → token Firebase (AKAR verifikasi)
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithEmailLink?key=${cfg.apiKey}`,
      {
        method: "POST",
        headers: androidHeaders(cfg.pkg, cfg.referer),
        body: JSON.stringify({ email, oobCode, returnSecureToken: true }),
      }
    );
    const fb = await r.json().catch(() => ({}));
    if (!r.ok || fb.error || !fb.localId) {
      return Response.json(
        {
          success: false,
          message: "Kode magic link tidak valid atau sudah pernah digunakan.",
          code: JSON.stringify(fb),
        },
        { status: 400 }
      );
    }

    // 2) Ambil profil lengkap (non-fatal kalau gagal)
    let profile = null;
    try {
      const lr = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${cfg.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Referer: cfg.referer },
          body: JSON.stringify({ idToken: fb.idToken }),
        }
      );
      const lj = await lr.json().catch(() => ({}));
      profile = lj?.users?.[0] || null;
    } catch {
      /* abaikan */
    }

    // 3) Catat lisensi lokal + naikkan statistik
    const stats = await bumpStats();
    const { validUntil, validUntilIso } = validUntilDates();
    const data = {
      uid: fb.localId,
      email: fb.email || email,
      emailVerified: Boolean(profile?.emailVerified),
      orderId: makeOrderId(),
      validUntil,
      validUntilIso,
      issuedAt: new Date().toISOString(),
      status: "ACTIVE",
      membershipStatus: "PREMIUM_ACTIVE",
      tier: "Alight Motion Pro / Member",
      stats,
    };
    if (cfg.returnTokens) {
      data.tokens = {
        idToken: fb.idToken,
        refreshToken: fb.refreshToken,
        expiresIn: fb.expiresIn,
      };
    }

    return Response.json({
      success: true,
      message: "Akun Alight Motion berhasil diverifikasi dan Premium aktif!",
      data,
      raw: { premium: { ok: true } },
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
