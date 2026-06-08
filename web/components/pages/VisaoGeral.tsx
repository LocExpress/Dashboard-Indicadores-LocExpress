"use client";
import { useMemo } from "react";
import { aggIndicators, type IndicadorRow } from "@/lib/indicators";
import { COLOR } from "@/lib/theme";
import { InfoBox, SummaryCard, ChartBox } from "../ui";
import PlotlyChart from "../charts/PlotlyChart";
import { chartTabelaIndicadores, chartAtingimentoPorSetor, chartRankingIndicadores } from "../charts/indicadores";

export default function VisaoGeral({ df, error }: { df: IndicadorRow[]; error: string | null }) {
  const agg = useMemo(() => aggIndicators(df), [df]);

  if (error) return <div className="lx-error">❌ {error}</div>;
  if (agg.length === 0) return <InfoBox>Nenhum dado disponível para os filtros selecionados.</InfoBox>;

  const withData = agg.filter((r) => r.Atingimento != null);
  const total = agg.length;
  const nGreen = withData.filter((r) => (r.Atingimento ?? 0) >= 100).length;
  const nYellow = withData.filter((r) => (r.Atingimento ?? 0) >= 80 && (r.Atingimento ?? 0) < 100).length;
  const nRed = withData.filter((r) => (r.Atingimento ?? 0) < 80).length;
  const nNa = total - withData.length;

  const cards: [number, string, string][] = [
    [total, COLOR.INDIGO, "Total de KPIs"],
    [nGreen, COLOR.GREEN, "✅ Meta Atingida"],
    [nYellow, COLOR.YELLOW, "⚠️ Em Atenção"],
    [nRed, COLOR.RED, "🚨 Abaixo da Meta"],
    [nNa, COLOR.GRAY_MID, "⬜ Não Informado"],
  ];

  const figTbl = chartTabelaIndicadores(agg);
  const figSetor = chartAtingimentoPorSetor(agg);
  const figRank = chartRankingIndicadores(agg, "Ranking de Indicadores — % Atingimento");

  return (
    <div>
      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: "1rem" }}>
        {cards.map(([num, color, label], i) => (
          <SummaryCard key={i} num={num} color={color} label={label}
            pct={label !== "Total de KPIs" && total > 0 ? `${Math.round((num / total) * 100)}%` : undefined} />
        ))}
      </div>

      <ChartBox>
        <PlotlyChart {...figTbl} height={figTbl.layout.height} />
      </ChartBox>

      <div className="lx-grid" style={{ gridTemplateColumns: "2fr 3fr" }}>
        {figSetor && <ChartBox><PlotlyChart {...figSetor} height={figSetor.layout.height} /></ChartBox>}
        {figRank && <ChartBox><PlotlyChart {...figRank} height={figRank.layout.height} /></ChartBox>}
      </div>
    </div>
  );
}
