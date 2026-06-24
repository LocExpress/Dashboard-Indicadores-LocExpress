import { NextResponse } from "next/server";

const BASE = "https://graph.facebook.com/v19.0";

async function metaGet(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${BASE}${path}?${qs}`, { cache: "no-store" });
  return res.json();
}

async function metaGetAll(path: string, params: Record<string, string>): Promise<any[]> {
  const items: any[] = [];
  let after: string | null = null;
  do {
    const p = after ? { ...params, after } : params;
    const d = await metaGet(path, p);
    items.push(...(d.data ?? []));
    after = d.paging?.cursors?.after ?? null;
    if (!d.paging?.next) break;
  } while (after);
  return items;
}

export async function GET() {
  const userToken = process.env.META_USER_TOKEN;
  if (!userToken) return NextResponse.json({ error: "META_USER_TOKEN não configurado" }, { status: 500 });

  // 1. All pages with Instagram info
  const allPages = await metaGetAll("/me/accounts", {
    fields: "id,name,access_token,instagram_business_account,connected_instagram_account",
    access_token: userToken,
    limit: "200",
  });

  // 2. All businesses and their Instagram accounts
  const bizData = await metaGet("/me/businesses", { fields: "id,name", access_token: userToken, limit: "50" });
  const businesses: any[] = bizData.data ?? [];

  const bizIgMap: Record<string, string> = {};
  await Promise.allSettled(businesses.map(async (b: any) => {
    const igs = await metaGetAll(`/${b.id}/instagram_accounts`, { fields: "id,username", access_token: userToken, limit: "10" });
    if (igs.length > 0) bizIgMap[b.id] = igs[0].id;
  }));

  // 3. For pages WITHOUT instagram: check what business they belong to
  const pagesWithoutIg = allPages.filter((p: any) => !p.instagram_business_account && !p.connected_instagram_account);

  const pageBusinessCheck = await Promise.all(pagesWithoutIg.map(async (p: any) => {
    try {
      const details = await metaGet(`/${p.id}`, {
        fields: "business",
        access_token: p.access_token,
      });
      const bizId = details.business?.id;
      return {
        page_id: p.id,
        page_name: p.name,
        business_id: bizId ?? null,
        business_found_in_biz_list: bizId ? businesses.some((b: any) => b.id === bizId) : false,
        instagram_via_business: bizId ? (bizIgMap[bizId] ?? null) : null,
      };
    } catch (e: any) {
      return { page_id: p.id, page_name: p.name, business_id: null, error: e.message };
    }
  }));

  return NextResponse.json({
    total_pages: allPages.length,
    pages_with_ig: allPages.filter((p: any) => p.instagram_business_account || p.connected_instagram_account).length,
    pages_without_ig: pagesWithoutIg.length,
    biz_ig_map_size: Object.keys(bizIgMap).length,
    page_business_check: pageBusinessCheck,
  });
}
