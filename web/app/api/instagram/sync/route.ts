import { NextResponse } from "next/server";
import { getAllPages, getIGProfile, getIGInsights, getIGPosts, getPostInsights } from "@/lib/instagram/meta";
import { sbUpsert } from "@/lib/instagram/db";

export async function POST() {
  const userToken = process.env.META_USER_TOKEN;
  if (!userToken) return NextResponse.json({ error: "META_USER_TOKEN não configurado" }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const results = { synced: 0, pending: 0, errors: [] as string[] };

  try {
    const pages = await getAllPages(userToken);

    for (const page of pages) {
      const igAccount = page.instagram_business_account;
      const base = {
        page_id: page.id,
        page_name: page.name,
        business_id: page.business_id ?? null,
        origem_api: page.origem_api,
        data_ultima_validacao: now,
        updated_at: now,
      };

      if (!igAccount?.id) {
        await sbUpsert("franquias_instagram", { ...base, status_conexao: "sem_instagram" }, "page_id");
        results.pending++;
        continue;
      }

      try {
        const profile = await getIGProfile(igAccount.id, page.access_token);
        const franquia = await sbUpsert("franquias_instagram", {
          ...base,
          instagram_username: profile.username,
          ig_user_id: igAccount.id,
          status_conexao: "conectada",
          erro_api: null,
        }, "page_id");

        if (!franquia?.id) continue;

        const insights = await getIGInsights(igAccount.id, page.access_token);
        await sbUpsert("instagram_daily_metrics", {
          franquia_instagram_id: franquia.id,
          data: today,
          followers_count: profile.followers_count ?? 0,
          follows_count: profile.follows_count ?? 0,
          media_count: profile.media_count ?? 0,
          reach: insights.reach ?? 0,
          profile_views: insights.profile_views ?? 0,
          website_clicks: insights.website_clicks ?? 0,
          accounts_engaged: insights.accounts_engaged ?? 0,
          total_interactions: insights.total_interactions ?? 0,
        }, "franquia_instagram_id,data");

        const posts = await getIGPosts(igAccount.id, page.access_token);
        for (const post of posts) {
          const saved = await sbUpsert("instagram_posts", {
            franquia_instagram_id: franquia.id,
            ig_media_id: post.id,
            caption: post.caption ?? null,
            media_type: post.media_type,
            media_product_type: post.media_product_type ?? null,
            permalink: post.permalink,
            timestamp: post.timestamp,
            like_count: post.like_count ?? 0,
            comments_count: post.comments_count ?? 0,
          }, "ig_media_id");

          if (saved?.id) {
            const ins = await getPostInsights(post.id, page.access_token);
            if (Object.keys(ins).length > 0) {
              const followers = profile.followers_count || 1;
              await sbUpsert("instagram_post_insights", {
                post_id: saved.id,
                data_coleta: today,
                reach: ins.reach ?? 0,
                likes: ins.likes ?? 0,
                comments: ins.comments ?? 0,
                shares: ins.shares ?? 0,
                saved: ins.saved ?? 0,
                total_interactions: ins.total_interactions ?? 0,
                engagement_rate: (ins.total_interactions ?? 0) / followers,
              }, "post_id,data_coleta");
            }
          }
        }

        results.synced++;
      } catch (e: any) {
        await sbUpsert("franquias_instagram", {
          ...base,
          status_conexao: "sem_permissao",
          erro_api: e.message,
        }, "page_id");
        results.errors.push(`${page.name}: ${e.message}`);
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (err: any) {
    console.error("[Instagram Sync]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
