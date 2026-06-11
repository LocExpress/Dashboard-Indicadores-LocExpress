const BASE = "https://graph.facebook.com/v19.0";

async function metaFetch(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${BASE}${path}?${qs}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message ?? `Meta API error on ${path}`);
  return json;
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
    const d = await metaFetch("/me/accounts", {
      fields: "id,name,access_token,instagram_business_account",
      access_token: userToken,
      limit: "200",
    });
    for (const p of d.data ?? []) {
      if (!seen.has(p.id)) { seen.add(p.id); pages.push({ ...p, origem_api: "me_accounts" }); }
    }
  } catch (e) { console.error("[Meta] me/accounts:", e); }

  try {
    const biz = await metaFetch("/me/businesses", { fields: "id,name", access_token: userToken });
    for (const b of biz.data ?? []) {
      for (const ep of ["owned_pages", "client_pages"] as const) {
        try {
          const d = await metaFetch(`/${b.id}/${ep}`, {
            fields: "id,name,access_token,instagram_business_account",
            access_token: userToken,
            limit: "200",
          });
          for (const p of d.data ?? []) {
            if (!seen.has(p.id)) {
              seen.add(p.id);
              pages.push({ ...p, business_id: b.id, origem_api: ep === "owned_pages" ? "owned_pages" : "client_pages" });
            }
          }
        } catch {}
      }
    }
  } catch (e) { console.error("[Meta] me/businesses:", e); }

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
