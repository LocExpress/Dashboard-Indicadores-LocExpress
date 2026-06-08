"use client";
import dynamic from "next/dynamic";
import type { PlotlyFigure } from "./PlotlyChartInner";

// Plotly só pode rodar no cliente (acessa `self`/`window` no carregamento).
const Inner = dynamic(() => import("./PlotlyChartInner"), {
  ssr: false,
  loading: () => <div className="lx-spinner">Carregando gráfico…</div>,
});

export default function PlotlyChart(props: PlotlyFigure & { height?: number }) {
  return <Inner {...props} />;
}
