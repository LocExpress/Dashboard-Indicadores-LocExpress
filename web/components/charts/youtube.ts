import { baseLayout, title } from "./base";
import { COLOR } from "@/lib/theme";

export interface AnalyticsRow {
  date: string;
  views: number;
  likes: number;
  comments: number;
  subscribers_gained: number;
  subscribers_lost: number;
  estimated_minutes_watched: number;
}

function fmtDate(d: string): string {
  try {
    const [, m, day] = d.slice(0, 10).split("-");
    return `${day}/${m}`;
  } catch {
    return d.slice(5);
  }
}

export function chartYtViews(analytics: AnalyticsRow[]) {
  const x = analytics.map((r) => fmtDate(r.date));
  const y = analytics.map((r) => Number(r.views));
  return {
    data: [{
      type: "scatter", mode: "lines+markers", name: "Views",
      x, y,
      line: { color: COLOR.INDIGO, width: 2.5 },
      marker: { size: 5, color: COLOR.ORANGE },
      fill: "tozeroy", fillcolor: "rgba(45,49,146,0.08)",
      hovertemplate: "%{x}<br>Views: %{y:,}<extra></extra>",
    }],
    layout: {
      ...baseLayout(), title: title("Visualizações — Últimos 30 dias"),
      xaxis: { gridcolor: "#F0F0F0" }, yaxis: { gridcolor: "#F0F0F0" },
      height: 280, showlegend: false,
    },
  };
}

export function chartYtEngagement(analytics: AnalyticsRow[]) {
  const x = analytics.map((r) => fmtDate(r.date));
  return {
    data: [
      {
        type: "bar", name: "Curtidas", x, y: analytics.map((r) => Number(r.likes)),
        marker: { color: COLOR.INDIGO, opacity: 0.85 },
        hovertemplate: "%{x}<br>Curtidas: %{y:,}<extra></extra>",
      },
      {
        type: "bar", name: "Comentários", x, y: analytics.map((r) => Number(r.comments)),
        marker: { color: COLOR.ORANGE, opacity: 0.85 },
        hovertemplate: "%{x}<br>Comentários: %{y:,}<extra></extra>",
      },
    ],
    layout: {
      ...baseLayout(), title: title("Engajamento — Curtidas e Comentários"),
      barmode: "group", bargap: 0.2,
      xaxis: { gridcolor: "#F0F0F0" }, yaxis: { gridcolor: "#F0F0F0" },
      height: 280,
      legend: { orientation: "h", y: 1.12, x: 0, bgcolor: "rgba(0,0,0,0)" },
    },
  };
}

export function chartYtSubscribers(analytics: AnalyticsRow[]) {
  const x = analytics.map((r) => fmtDate(r.date));
  const lost = analytics.map((r) => -Number(r.subscribers_lost));
  return {
    data: [
      {
        type: "bar", name: "Ganhos", x, y: analytics.map((r) => Number(r.subscribers_gained)),
        marker: { color: COLOR.GREEN },
        hovertemplate: "%{x}<br>Ganhos: %{y:,}<extra></extra>",
      },
      {
        type: "bar", name: "Perdidos", x, y: lost,
        marker: { color: COLOR.RED },
        hovertemplate: "%{x}<br>Perdidos: %{customdata:,}<extra></extra>",
        customdata: lost.map((v) => -v),
      },
    ],
    layout: {
      ...baseLayout(), title: title("Inscritos — Ganhos e Perdidos"),
      barmode: "relative", bargap: 0.2,
      xaxis: { gridcolor: "#F0F0F0" }, yaxis: { gridcolor: "#F0F0F0" },
      height: 280,
      legend: { orientation: "h", y: 1.12, x: 0, bgcolor: "rgba(0,0,0,0)" },
    },
  };
}

export function chartYtWatchtime(analytics: AnalyticsRow[]) {
  const x = analytics.map((r) => fmtDate(r.date));
  const y = analytics.map((r) => Number(r.estimated_minutes_watched));
  return {
    data: [{
      type: "scatter", mode: "lines", name: "Minutos", x, y,
      line: { color: COLOR.YELLOW, width: 2.5 },
      fill: "tozeroy", fillcolor: "rgba(245,158,11,0.10)",
      hovertemplate: "%{x}<br>Minutos: %{y:,}<extra></extra>",
    }],
    layout: {
      ...baseLayout(), title: title("Tempo Assistido — Minutos (30 dias)"),
      xaxis: { gridcolor: "#F0F0F0" }, yaxis: { gridcolor: "#F0F0F0" },
      height: 280, showlegend: false,
    },
  };
}

export function chartYtTopVideos(videos: { title: string; view_count: number }[]) {
  const top = videos.slice(0, 10);
  const labels = top.map((v) => {
    const t = v.title ?? "";
    return t.length > 42 ? t.slice(0, 42) + "…" : t;
  });
  const vals = top.map((v) => Number(v.view_count));
  return {
    data: [{
      type: "bar", orientation: "h",
      x: vals, y: labels,
      marker: { color: COLOR.INDIGO },
      text: vals.map((v) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(v)),
      textposition: "outside",
      textfont: { size: 10, color: "#374151" },
      hovertemplate: "%{y}<br>Views: %{x:,}<extra></extra>",
    }],
    layout: {
      ...baseLayout(), title: title("Top 10 Vídeos por Visualizações"),
      xaxis: { gridcolor: "#F0F0F0" },
      yaxis: { automargin: true, tickfont: { size: 10 } },
      height: Math.max(300, top.length * 40 + 80),
      margin: { l: 10, r: 60, t: 44, b: 10 },
      showlegend: false,
    },
  };
}
