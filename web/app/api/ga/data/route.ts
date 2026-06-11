import { NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

const PROPERTY_ID = "533745165";

function getClient() {
  const raw = process.env.GA_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GA_SERVICE_ACCOUNT_JSON não configurado");
  const credentials = JSON.parse(raw);
  return new BetaAnalyticsDataClient({ credentials });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days      = Number(searchParams.get("days") ?? "30");
    const startDate = searchParams.get("startDate") ?? `${days}daysAgo`;
    const endDate   = searchParams.get("endDate")   ?? "today";

    const client = getClient();
    const property = `properties/${PROPERTY_ID}`;

    const [overview, pages, cities, devices, daily] = await Promise.all([
      // KPIs gerais
      client.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "averageSessionDuration" },
          { name: "bounceRate" },
          { name: "newUsers" },
        ],
      }),

      // Top páginas
      client.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      }),

      // Top cidades
      client.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "city" }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 10,
      }),

      // Dispositivos
      client.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      }),

      // Usuários por dia
      client.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
    ]);

    // Processa KPIs
    const row = overview[0]?.rows?.[0];
    const kpis = {
      activeUsers:             Number(row?.metricValues?.[0]?.value ?? 0),
      sessions:                Number(row?.metricValues?.[1]?.value ?? 0),
      pageViews:               Number(row?.metricValues?.[2]?.value ?? 0),
      avgSessionDuration:      Number(row?.metricValues?.[3]?.value ?? 0),
      bounceRate:              Number(row?.metricValues?.[4]?.value ?? 0),
      newUsers:                Number(row?.metricValues?.[5]?.value ?? 0),
    };

    // Processa páginas
    const topPages = (pages[0]?.rows ?? []).map((r) => ({
      path:   r.dimensionValues?.[0]?.value ?? "",
      title:  r.dimensionValues?.[1]?.value ?? "",
      views:  Number(r.metricValues?.[0]?.value ?? 0),
      users:  Number(r.metricValues?.[1]?.value ?? 0),
    }));

    // Processa cidades
    const topCities = (cities[0]?.rows ?? []).map((r) => ({
      city:     r.dimensionValues?.[0]?.value ?? "",
      users:    Number(r.metricValues?.[0]?.value ?? 0),
      sessions: Number(r.metricValues?.[1]?.value ?? 0),
    }));

    // Processa dispositivos
    const deviceData = (devices[0]?.rows ?? []).map((r) => ({
      device:   r.dimensionValues?.[0]?.value ?? "",
      users:    Number(r.metricValues?.[0]?.value ?? 0),
      sessions: Number(r.metricValues?.[1]?.value ?? 0),
    }));

    // Processa série diária
    const dailySeries = (daily[0]?.rows ?? []).map((r) => {
      const d = r.dimensionValues?.[0]?.value ?? "";
      return {
        date:      `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
        users:     Number(r.metricValues?.[0]?.value ?? 0),
        sessions:  Number(r.metricValues?.[1]?.value ?? 0),
        pageViews: Number(r.metricValues?.[2]?.value ?? 0),
      };
    });

    return NextResponse.json({ kpis, topPages, topCities, deviceData, dailySeries });
  } catch (err: any) {
    console.error("[GA API]", err);
    return NextResponse.json({ error: err.message ?? "Falha ao buscar dados do GA" }, { status: 500 });
  }
}
