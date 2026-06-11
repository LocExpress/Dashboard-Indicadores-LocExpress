import { NextResponse } from "next/server";
import { sbQuery } from "@/lib/instagram/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") ?? "30");
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDate = since.toISOString().slice(0, 10);
  const sinceISO = since.toISOString();

  try {
    const [franquias, metrics, posts] = await Promise.all([
      sbQuery("franquias_instagram", "order=page_name.asc"),
      sbQuery("instagram_daily_metrics", `data=gte.${sinceDate}&order=data.desc&limit=5000`),
      sbQuery("instagram_posts", `timestamp=gte.${sinceISO}&select=id,franquia_instagram_id,timestamp&order=timestamp.desc&limit=5000`),
    ]);

    // Latest and oldest metric per franchise (metrics are ordered desc, so first = latest, last = oldest)
    const latestMetric = new Map<string, any>();
    const oldestMetric = new Map<string, any>();
    for (const m of metrics ?? []) {
      if (!latestMetric.has(m.franquia_instagram_id)) latestMetric.set(m.franquia_instagram_id, m);
      oldestMetric.set(m.franquia_instagram_id, m);
    }

    // Posts per franchise
    const postsByFranquia = new Map<string, any[]>();
    for (const p of posts ?? []) {
      const arr = postsByFranquia.get(p.franquia_instagram_id) ?? [];
      arr.push(p);
      postsByFranquia.set(p.franquia_instagram_id, arr);
    }

    const connected = (franquias ?? []).filter((f: any) => f.status_conexao === "conectada");
    const pending = (franquias ?? []).filter((f: any) => f.status_conexao !== "conectada");

    const ranking = connected.map((f: any) => {
      const latest = latestMetric.get(f.id);
      const oldest = oldestMetric.get(f.id);
      const fPosts = postsByFranquia.get(f.id) ?? [];
      const lastPostTs = fPosts[0]?.timestamp ?? null;
      const daysSince = lastPostTs
        ? Math.floor((Date.now() - new Date(lastPostTs).getTime()) / 86400000)
        : null;
      const followers = latest?.followers_count ?? 0;
      const growth = oldest && latest && oldest.franquia_instagram_id === f.id
        ? followers - (oldest.followers_count ?? 0)
        : 0;

      return {
        id: f.id,
        nome: f.nome_franquia || f.page_name,
        instagram_username: f.instagram_username ?? "",
        followers,
        followers_growth: growth,
        reach: latest?.reach ?? 0,
        total_interactions: latest?.total_interactions ?? 0,
        posts_count: fPosts.length,
        last_post: lastPostTs,
        days_since_post: daysSince,
        status: f.status_conexao,
      };
    }).sort((a: any, b: any) => b.followers - a.followers);

    const summary = {
      total_followers: ranking.reduce((s: number, r: any) => s + r.followers, 0),
      total_reach: ranking.reduce((s: number, r: any) => s + r.reach, 0),
      total_interactions: ranking.reduce((s: number, r: any) => s + r.total_interactions, 0),
      total_posts: ranking.reduce((s: number, r: any) => s + r.posts_count, 0),
      connected_count: connected.length,
      pending_count: pending.length,
      followers_growth: ranking.reduce((s: number, r: any) => s + r.followers_growth, 0),
    };

    return NextResponse.json({ summary, ranking, pending, all: franquias });
  } catch (err: any) {
    console.error("[Instagram Dashboard]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
