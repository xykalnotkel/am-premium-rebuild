import { getStats } from "@/lib/stats";

export async function GET() {
  const s = await getStats();
  return Response.json({ success: true, total: s.total, today: s.today });
}
