import { NextResponse } from "next/server";
import { sbQuery } from "@/lib/instagram/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") ?? "30");
  const franquiaId = searchParams.get("franquia_id") ?? "";
  const mediaType = searchParams.get("media_type") ?? "";
  const sortBy = searchParams.get("sort_by") ?? "reach";

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();
  const sinceDate = since.toISOString().slice(0, 10);

  try {
    const postsQsParts = [
      `timestamp=gte.${sinceISO}`,
      `order=timestamp.desc`,
      `limit=200`,
      franquiaId ? `franquia_instagram_id=eq.${franquiaId}` : "",
      mediaType ? `media_type=eq.${mediaType}` : "",
    ].filter(Boolean);

    const [posts, insights, franquias] = await Promise.all([
      sbQuery("instagram_posts", postsQsParts.join("&")),
      sbQuery("instagram_post_insights", `data_coleta=gte.${sinceDate}&order=data_coleta.desc&limit=2000`),
      sbQuery("franquias_instagram", "status_conexao=eq.conectada&select=id,instagram_username,page_name,nome_franquia"),
    ]);

    const franquiaMap = new Map<string, any>();
    for (const f of franquias ?? []) franquiaMap.set(f.id, f);

    const insightMap = new Map<string, any>();
    for (const i of insights ?? []) {
      if (!insightMap.has(i.post_id)) insightMap.set(i.post_id, i);
    }

    const enriched = (posts ?? []).map((p: any) => {
      const ins = insightMap.get(p.id) ?? {};
      const f = franquiaMap.get(p.franquia_instagram_id) ?? {};
      return {
        id: p.id,
        ig_media_id: p.ig_media_id,
        caption: p.caption,
        media_type: p.media_type,
        media_product_type: p.media_product_type,
        permalink: p.permalink,
        timestamp: p.timestamp,
        like_count: p.like_count,
        comments_count: p.comments_count,
        franquia_name: f.nome_franquia || f.page_name || "",
        instagram_username: f.instagram_username || "",
        reach: ins.reach ?? 0,
        likes: ins.likes ?? p.like_count ?? 0,
        comments: ins.comments ?? p.comments_count ?? 0,
        shares: ins.shares ?? 0,
        saved: ins.saved ?? 0,
        total_interactions: ins.total_interactions ?? 0,
        engagement_rate: ins.engagement_rate ?? 0,
      };
    });

    const sorted = [...enriched].sort((a: any, b: any) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));

    return NextResponse.json({ posts: sorted });
  } catch (err: any) {
    console.error("[Instagram Posts]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
