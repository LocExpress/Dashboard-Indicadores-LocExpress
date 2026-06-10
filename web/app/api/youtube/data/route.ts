import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function query(table: string, params: [string, string][] = []) {
  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  };
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, { headers, cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function GET(req: Request) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const days      = Math.min(Math.max(Number(searchParams.get("days") ?? "30"), 1), 365);
  const today     = new Date().toISOString().slice(0, 10);
  const startDate = searchParams.get("startDate") ?? (() => {
    const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10);
  })();
  const endDate = searchParams.get("endDate") ?? today;

  try {
    const [channels, analytics, videos] = await Promise.all([
      query("youtube_channels", [["order", "created_at.desc"], ["limit", "1"]]),
      query("youtube_channel_analytics", [
        ["order", "date.asc"],
        ["date",  `gte.${startDate}`],
        ["date",  `lte.${endDate}`],
        ["limit", "365"],
      ]),
      query("youtube_videos", [["order", "score.desc"], ["limit", "50"]]),
    ]);

    return NextResponse.json({
      channel:   channels[0] ?? null,
      analytics: analytics ?? [],
      videos:    videos ?? [],
    });
  } catch (err) {
    console.error("[YouTube API]", err);
    return NextResponse.json({ error: "Falha ao buscar dados" }, { status: 500 });
  }
}
