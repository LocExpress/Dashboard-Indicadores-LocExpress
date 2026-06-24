import { NextResponse } from "next/server";
import { getAllPages, getIGProfile, getIGInsights, getIGPosts, getPostInsights } from "@/lib/instagram/meta";
import { sbUpsert } from "@/lib/instagram/db";

export async function POST() {
  const userToken = process.env.META_USER_TOKEN;
  if (!userToken) return NextResponse.json({ error: "META_USER_TOKEN não configurado" }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  try {
    const pages = await getAllPages(userToken);
    console.log(`[Sync] ${pages.length} páginas encontradas`);

    const settled = await Promise.allSettled(pages.map(async (page) => {
      const base = {
        page_id: page.id,
        page_name: page.name,
        business_id: page.business_id ?? null,
        origem_api: page.origem_api,
        data_ultima_validacao: now,
        updated_at: now,
      };

      const igAccount = page.instagram_business_account;
      if (!igAccount?.id) {
        await sbUpsert("franquias_instagram", { ...base, status_conexao: "sem_instagram" }, "page_id");
        return "pending";
      }

      try {
        // Use user token for Instagram API calls (works for business-managed accounts)
        const igToken = userToken;
        const [profileRes, insightsRes, postsRes] = await Promise.allSettled([
          getIGProfile(igAccount.id, igToken),
          getIGInsights(igAccount.id, igToken),
          getIGPosts(igAccount.id, igToken),
        ]);

        if (profileRes.status === "rejected") throw profileRes.reason;
        const profile = profileRes.value;

        const franquia = await sbUpsert("franquias_instagram", {
          ...base,
          instagram_username: profile.username,
          ig_user_id: igAccount.id,
          status_conexao: "conectada",
          erro_api: null,
        }, "page_id");

        if (!franquia?.id) return "synced";

        const insights = insightsRes.status === "fulfilled" ? insightsRes.value : {};
        const posts = postsRes.status === "fulfilled" ? postsRes.value : [];

        // Upsert daily metrics + posts (collecting post IDs for insights)
        const postUpsertResults = await Promise.allSettled(
          posts.map((post: any) => sbUpsert("instagram_posts", {
            franquia_instagram_id: franquia.id,
            ig_media_id: post.id,
            caption: post.caption ?? null,
            media_type: post.media_type,
            media_product_type: post.media_product_type ?? null,
            permalink: post.permalink,
            timestamp: post.timestamp,
            like_count: post.like_count ?? 0,
            comments_count: post.comments_count ?? 0,
          }, "ig_media_id"))
        );

        // Fetch insights for up to 10 most recent posts
        const recentPosts = postUpsertResults
          .map((r, i) => ({ dbRow: r.status === "fulfilled" ? r.value : null, igMediaId: posts[i]?.id }))
          .filter(({ dbRow }) => dbRow?.id)
          .slice(0, 10);

        await Promise.allSettled([
          sbUpsert("instagram_daily_metrics", {
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
          }, "franquia_instagram_id,data"),
          ...recentPosts.map(({ dbRow, igMediaId }) =>
            getPostInsights(igMediaId, igToken).then(async (ins) => {
              if (!ins.reach && !ins.total_interactions) return;
              await sbUpsert("instagram_post_insights", {
                post_id: dbRow.id,
                data_coleta: today,
                reach: ins.reach ?? 0,
                likes: ins.likes ?? 0,
                comments: ins.comments ?? 0,
                shares: ins.shares ?? 0,
                saved: ins.saved ?? 0,
                total_interactions: ins.total_interactions ?? 0,
                engagement_rate: ins.reach ? ((ins.total_interactions ?? 0) / ins.reach * 100) : 0,
              }, "post_id,data_coleta");
            }).catch(() => {})
          ),
        ]);

        return "synced";
      } catch (e: any) {
        await sbUpsert("franquias_instagram", {
          ...base,
          status_conexao: "sem_permissao",
          erro_api: e.message,
        }, "page_id");
        return `error:${page.name}: ${e.message}`;
      }
    }));

    const synced = settled.filter(r => r.status === "fulfilled" && r.value === "synced").length;
    const pending = settled.filter(r => r.status === "fulfilled" && r.value === "pending").length;
    const errors = settled
      .filter(r => r.status === "rejected" || (r.status === "fulfilled" && String(r.value).startsWith("error:")))
      .map(r => r.status === "rejected" ? String(r.reason) : String((r as any).value).replace("error:", ""));

    console.log(`[Sync] done: ${synced} sync, ${pending} pending, ${errors.length} errors`);
    return NextResponse.json({ success: true, total: pages.length, synced, pending, errors });
  } catch (err: any) {
    console.error("[Instagram Sync]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
