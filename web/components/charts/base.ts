// Layout base do Plotly — porta de app.py:_L / _TITLE / _CFG
import { COLOR } from "@/lib/theme";

export function baseLayout(): Record<string, any> {
  return {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Inter, Segoe UI, sans-serif", color: "#374151", size: 12 },
    margin: { l: 10, r: 10, t: 44, b: 10 },
    hoverlabel: { bgcolor: "#FFFFFF", bordercolor: "#E5E7EB", font_size: 12 },
    legend: { orientation: "h", yanchor: "bottom", y: 1.02, xanchor: "right", x: 1, bgcolor: "rgba(0,0,0,0)" },
  };
}

export function title(t: string): Record<string, any> {
  return { text: t, font: { size: 13, color: COLOR.INDIGO, weight: "bold" }, x: 0.01 };
}
