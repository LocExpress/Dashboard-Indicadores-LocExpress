const BASE = "https://graph.facebook.com/v19.0";

async function metaFetch(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${BASE}${path}?${qs}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message ?? `Meta API error on ${path}`);
  return json;
}

// Fetches all items following cursor-based pagination
async function metaFetchAll(path: string, params: Record<string, string>): Promise<any[]> {
  const items: any[] = [];
  let after: string | null = null;
  do {
    const p = after ? { ...params, after } : params;
    const d = await metaFetch(path, p);
    items.push(...(d.data ?? []));
    after = d.paging?.cursors?.after ?? null;
    // stop if no next page
    if (!d.paging?.next) break;
  } while (after);
  return items;
}

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
  business_id?: string;
  origem_api: "me_accounts" | "owned_pages" | "client_pages";
}

export async function getAllPages(userToken: string): Promise<MetaPage[]> {
  const pages: MetaPage[] = [];
  const seen = new Set<string>();

  try {
    const items = await metaFetchAll("/me/accounts", {
      fields: "id,name,access_token,instagram_business_account",
      access_token: userToken,
      limit: "200",
    });
    console.log(`[Meta] /me/accounts: ${items.length} páginas`);
    for (const p of items) {
      if (!seen.has(p.id)) { seen.add(p.id); pages.push({ ...p, origem_api: "me_accounts" }); }
    }
  } catch (e) { console.error("[Meta] me/accounts:", e); }

  try {
    const bizItems = await metaFetchAll("/me/businesses", { fields: "id,name", access_token: userToken, limit: "50" });
    console.log(`[Meta] /me/businesses: ${bizItems.length} businesses`);
    for (const b of bizItems) {
      for (const ep of ["owned_pages", "client_pages"] as const) {
        try {
          const items = await metaFetchAll(`/${b.id}/${ep}`, {
            fields: "id,name,access_token,instagram_business_account",
            access_token: userToken,
            limit: "200",
          });
          console.log(`[Meta] ${b.name} / ${ep}: ${items.length} páginas`);
          for (const p of items) {
            if (!seen.has(p.id)) {
              seen.add(p.id);
              pages.push({ ...p, business_id: b.id, origem_api: ep === "owned_pages" ? "owned_pages" : "client_pages" });
            }
          }
        } catch (e) { console.error(`[Meta] ${b.id}/${ep}:`, e); }
      }
    }
  } catch (e) { console.error("[Meta] me/businesses:", e); }

  console.log(`[Meta] Total páginas únicas encontradas: ${pages.length}`);
  return pages;
}

export async function getIGProfile(igId: string, pageToken: string) {
  return metaFetch(`/${igId}`, {
    fields: "username,followers_count,follows_count,media_count",
    access_token: pageToken,
  });
}

export async function getIGInsights(igId: string, pageToken: string): Promise<Record<string, number>> {
  const now = Math.floor(Date.now() / 1000);
  const since = now - 86400 * 2;
  try {
    const d = await metaFetch(`/${igId}/insights`, {
      metric: "reach,profile_views,website_clicks,accounts_engaged,total_interactions",
      period: "day",
      since: String(since),
      until: String(now),
      access_token: pageToken,
    });
    const result: Record<string, number> = {};
    for (const m of d.data ?? []) {
      const v = m.values?.[m.values.length - 1]?.value ?? 0;
      result[m.name] = typeof v === "number" ? v : 0;
    }
    return result;
  } catch { return {}; }
}

export async function getIGPosts(igId: string, pageToken: string) {
  try {
    const d = await metaFetch(`/${igId}/media`, {
      fields: "id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count",
      limit: "50",
      access_token: pageToken,
    });
    return d.data ?? [];
  } catch { return []; }
}

export async function getPostInsights(mediaId: string, pageToken: string): Promise<Record<string, number>> {
  try {
    const d = await metaFetch(`/${mediaId}/insights`, {
      metric: "reach,likes,comments,shares,saved,total_interactions",
      access_token: pageToken,
    });
    const result: Record<string, number> = {};
    for (const m of d.data ?? []) {
      result[m.name] = m.values?.[0]?.value ?? m.value ?? 0;
    }
    return result;
  } catch { return {}; }
}
