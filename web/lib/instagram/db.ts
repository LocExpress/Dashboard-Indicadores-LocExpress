const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const H = () => ({
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
});

export async function sbQuery(table: string, qs: string) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${qs}`, { headers: H(), cache: "no-store" });
  if (!res.ok) { console.error(`[DB] ${table} ${res.status}:`, await res.text().catch(() => "")); return []; }
  return res.json();
}

export async function sbUpsert(table: string, data: object, onConflict: string) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: "POST",
    headers: { ...H(), "Prefer": "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (!res.ok) { console.error(`[DB] upsert ${table}:`, await res.text().catch(() => "")); return null; }
  const result = await res.json();
  return Array.isArray(result) ? result[0] : result;
}
