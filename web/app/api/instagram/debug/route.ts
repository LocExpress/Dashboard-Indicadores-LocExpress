import { NextResponse } from "next/server";

const BASE = "https://graph.facebook.com/v19.0";

async function metaGet(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${BASE}${path}?${qs}`, { cache: "no-store" });
  return res.json();
}

export async function GET() {
  const userToken = process.env.META_USER_TOKEN;
  if (!userToken) return NextResponse.json({ error: "META_USER_TOKEN não configurado" }, { status: 500 });

  const result: Record<string, any> = {};

  // 1. Quem sou eu?
  result.me = await metaGet("/me", { fields: "id,name", access_token: userToken });

  // 2. Minhas páginas (primeiras 5)
  const accounts = await metaGet("/me/accounts", {
    fields: "id,name,instagram_business_account,connected_instagram_account",
    access_token: userToken,
    limit: "5",
  });
  result.me_accounts_sample = {
    total_returned: accounts.data?.length ?? 0,
    items: (accounts.data ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      has_instagram_business_account: !!p.instagram_business_account,
      instagram_business_account_id: p.instagram_business_account?.id ?? null,
      has_connected_instagram_account: !!p.connected_instagram_account,
      connected_instagram_account_id: p.connected_instagram_account?.id ?? null,
    })),
  };

  // 3. Meus negócios
  const businesses = await metaGet("/me/businesses", {
    fields: "id,name",
    access_token: userToken,
    limit: "20",
  });
  result.me_businesses = {
    total: businesses.data?.length ?? 0,
    items: (businesses.data ?? []).map((b: any) => ({ id: b.id, name: b.name })),
    error: businesses.error ?? null,
  };

  // 4. Instagram accounts de cada negócio
  result.business_instagram_accounts = [];
  for (const b of businesses.data ?? []) {
    const igAccounts = await metaGet(`/${b.id}/instagram_accounts`, {
      fields: "id,username,name",
      access_token: userToken,
      limit: "10",
    });
    result.business_instagram_accounts.push({
      business_id: b.id,
      business_name: b.name,
      total: igAccounts.data?.length ?? 0,
      error: igAccounts.error ?? null,
      items: (igAccounts.data ?? []).map((ig: any) => ({ id: ig.id, username: ig.username })),
    });
  }

  return NextResponse.json(result, { status: 200 });
}
