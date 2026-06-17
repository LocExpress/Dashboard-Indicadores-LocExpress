import { NextResponse } from "next/server";
import { sbQuery } from "@/lib/instagram/db";

const BASE = "https://graph.facebook.com/v19.0";

async function metaFetch(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${BASE}${path}?${qs}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message ?? `Meta API error on ${path}`);
  return json;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = (searchParams.get("username") ?? "locexpressfranchising").toLowerCase();

  // 1. Try Supabase first (fastest — already synced)
  try {
    const franquias = await sbQuery("franquias_instagram",
      `instagram_username=eq.${username}&select=id&limit=1`);

    if (franquias?.length) {
      const fid = franquias[0].id;
      const posts = await sbQuery("instagram_posts",
        `franquia_instagram_id=eq.${fid}&select=timestamp,permalink,media_type,media_product_type&order=timestamp.desc&limit=100`);
      if (posts?.length) {
        return NextResponse.json({ posts, source: "supabase" });
      }
    }
  } catch (e) {
    console.warn("[main-posts] Supabase lookup failed:", e);
  }

  // 2. Fallback: Meta Graph API
  const userToken = process.env.META_USER_TOKEN;
  if (!userToken) return NextResponse.json({ error: "META_USER_TOKEN não configurado" }, { status: 500 });

  try {
    const pages = await metaFetch("/me/accounts", {
      fields: "id,name,access_token,instagram_business_account",
      access_token: userToken,
      limit: "200",
    });

    let igId: string | null = null;
    let pageToken: string = userToken;

    for (const page of pages.data ?? []) {
      const igAcc = page.instagram_business_account;
      if (!igAcc?.id) continue;
      try {
        const profile = await metaFetch(`/${igAcc.id}`, {
          fields: "username",
          access_token: page.access_token,
        });
        if (profile.username?.toLowerCase() === username) {
          igId = igAcc.id;
          pageToken = page.access_token;
          break;
        }
      } catch {}
    }

    if (!igId) {
      return NextResponse.json({ error: `@${username} não encontrada nas páginas conectadas` }, { status: 404 });
    }

    const media = await metaFetch(`/${igId}/media`, {
      fields: "id,permalink,timestamp,media_type,media_product_type",
      limit: "100",
      access_token: pageToken,
    });

    return NextResponse.json({ posts: media.data ?? [], source: "meta" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
