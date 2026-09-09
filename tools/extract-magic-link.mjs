// Mengekstrak parameter Firebase dari 1 magic link asli Alight Motion.
// Cara pakai:
//   node tools/extract-magic-link.mjs "<tempel magic link lengkap dari email>"
//
// Output: apiKey, oobCode, mode, continueUrl + blok .env siap salin.

const input = (process.argv[2] || "").trim();
if (!input) {
  console.error('Pakai: node tools/extract-magic-link.mjs "<magic-link>"');
  process.exit(1);
}

function unwrap(u) {
  // page.link/?link=<encoded> bisa berlapis & double-encoded — urai rekursif
  let cur = u;
  for (let i = 0; i < 4; i++) {
    try {
      const url = new URL(cur);
      const inner = url.searchParams.get("link");
      if (inner && /^https?:\/\//i.test(inner)) {
        cur = inner;
        continue;
      }
    } catch { /* bukan URL */ }
    break;
  }
  return cur;
}

const finalUrl = unwrap(input);
let params = {};
try {
  const url = new URL(finalUrl);
  params = Object.fromEntries(url.searchParams.entries());
} catch {
  console.error("Input bukan URL valid. Tempel tautan lengkap dari email (bukan kode mentah).");
  process.exit(1);
}

const { apiKey = "", oobCode = "", mode = "", continueUrl = "" } = params;

console.log("========== HASIL EKSTRAKSI ==========");
console.log("apiKey     :", apiKey || "(TIDAK KETEMU)");
console.log("oobCode    :", oobCode ? oobCode.slice(0, 24) + "..." : "(TIDAK KETEMU)");
console.log("mode       :", mode || "(kosong)");
console.log("continueUrl:", continueUrl || "(TIDAK KETEMU)");
console.log("");
if (!apiKey || !continueUrl) {
  console.log("⚠️  apiKey/continueUrl tidak ketemu — pastikan link yang ditempel adalah");
  console.log("    tautan TOMBOL 'Sign In / Verify' dari email Alight Motion (copy link address).");
  process.exit(2);
}
console.log("========== SALIN KE .env ==========");
console.log(`AM_FIREBASE_API_KEY=${apiKey}`);
console.log(`AM_CONTINUE_URL=${continueUrl}`);
console.log(`AM_ANDROID_PACKAGE=com.alightcreative.motion`);
