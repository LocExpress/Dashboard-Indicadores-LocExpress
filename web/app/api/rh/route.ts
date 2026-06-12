import { NextResponse } from "next/server";
import { fetchCsvRows } from "@/lib/data";
import { parseRh } from "@/lib/rh";

// URL fica SÓ no servidor (este arquivo não vai pro bundle do navegador).
const RH_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTonMIf4fLspZOS7PCBY9Alx1VH3cOi2XkzHBq_eJqIzc8vcMFjPtnqmZHXCbM0Ow/pub?output=csv";

export async function POST(req: Request) {
  const expected = process.env.RH_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "Acesso de RH não configurado. Defina a variável RH_PASSWORD." },
      { status: 503 },
    );
  }

  let password = "";
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
  } catch {
    /* corpo inválido → senha vazia → 401 abaixo */
  }

  if (password !== expected) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  try {
    const raw = await fetchCsvRows(RH_SHEET_URL);
    const data = parseRh(raw);
    if (data.length === 0) {
      return NextResponse.json({ error: "Nenhum dado de RH encontrado na planilha." }, { status: 502 });
    }
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: `Falha ao carregar dados de RH: ${e}` }, { status: 500 });
  }
}
