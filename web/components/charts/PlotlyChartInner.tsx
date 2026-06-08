"use client";
import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";

const Plot = createPlotlyComponent(Plotly);

export interface PlotlyFigure {
  data: any[];
  layout: any;
}

export default function PlotlyChartInner({
  data,
  layout,
  height = 360,
}: PlotlyFigure & { height?: number }) {
  return (
    <Plot
      data={data}
      layout={{ autosize: true, ...layout }}
      config={{ displayModeBar: false, responsive: true }}
      style={{ width: "100%", height }}
      useResizeHandler
    />
  );
}
