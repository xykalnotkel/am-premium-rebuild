// Penyimpanan statistik sederhana berbasis file JSON.
// Cocok untuk VPS/lokal. Di Vercel serverless, file bersifat ephemeral
// (reset saat redeploy/pindah instance) — untuk produksi gunakan Upstash
// Redis / Vercel KV dengan interface yang sama (getStats/bumpStats).

import { promises as fs } from "fs";
import path from "path";

// Vercel serverless: filesystem read-only kecuali /tmp → simpan di sana.
// Lokal/VPS: pakai data/stats.json yang persisten.
const FILE = process.env.VERCEL
  ? path.join("/tmp", "am-stats.json")
  : path.join(process.cwd(), "data", "stats.json");

function todayStr() {
  // Zona Asia/Jakarta agar "hari ini" sesuai WIB
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function read() {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const j = JSON.parse(raw);
    return {
      total: Number(j.total) || 0,
      today: Number(j.today) || 0,
      date: String(j.date || ""),
    };
  } catch {
    return { total: 0, today: 0, date: todayStr() };
  }
}

async function write(s) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(s, null, 2));
}

function rolled(s) {
  const t = todayStr();
  if (s.date !== t) {
    s.today = 0;
    s.date = t;
  }
  return s;
}

export async function getStats() {
  const s = rolled(await read());
  return { total: s.total, today: s.today };
}

export async function bumpStats() {
  const s = rolled(await read());
  s.total += 1;
  s.today += 1;
  await write(s);
  return { total: s.total, today: s.today };
}
