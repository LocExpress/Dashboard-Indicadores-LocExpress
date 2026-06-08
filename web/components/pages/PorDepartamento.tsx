"use client";
import { useMemo, useState } from "react";
import {
  kpisForIndicator, monthlyEvolutionIndicator, fillAllMonths, avgAcrossYears, type IndicadorRow,
} from "@/lib/indicators";
import { getUnidadeConfig, getStatusColor, getStatusIcon, getStatusLabel, COLOR } from "@/lib/theme";
import { fmtValue, fmtPct, fmtDiferenca, calcAtingimento, isSentidoMenor } from "@/lib/format";
import { BodySelect, KpiCard, ChartBox, InfoBox, SecHeader, UnitPill, DataTable, type Column } from "../ui";
import PlotlyChart from "../charts/PlotlyChart";
import { chartEvolucaoMensalKpi, chartRankingUnidades } from "../charts/indicadores";

export default function PorDepartamento({
  df, dfFull, selAno, error,
}: { df: IndicadorRow[]; dfFull: IndicadorRow[]; selAno: number[]; error: string | null }) {
  const setores = useMemo(() => [...new Set(df.map((r) => r.Departamento))].sort(), [df]);
  const [rawSetor, setRawSetor] = useState("");
  const selSetor = setores.includes(rawSetor) ? rawSetor : setores[0] ?? "";

  const indicadoresDoSetor = useMemo(
    () => [...new Set(df.filter((r) => r.Departamento === selSetor).map((r) => r.Indicador))].sort(),
    [df, selSetor],
  );
  const [rawInd, setRawInd] = useState("");
  const selIndicador = indicadoresDoSetor.includes(rawInd) ? rawInd : indicadoresDoSetor[0] ?? "";

  if (error) return <div className="lx-error">❌ {error}</div>;
  if (setores.length === 0) return <InfoBox>Nenhum setor disponível com os filtros atuais.</InfoBox>;

  const dfInd = df.filter((r) => r.Departamento === selSetor && r.Indicador === selIndicador);
  if (dfInd.length === 0) return <InfoBox>Sem dados para essa combinação de Setor e Indicador.</InfoBox>;

  const unidade = dfInd[0].Unidade_Medida;
  const sentido = dfInd[0].Sentido_Meta;
  const anosInt = selAno.map(Number);

  const dfIndChart = dfFull.filter(
    (r) => r.Departamento === selSetor && r.Indicador === selIndicador && r.Ano != null && anosInt.includes(r.Ano),
  );

  const todosAnos = new Set(dfFull.map((r) => r.Ano).filter((y): y is number => y != null));
  const anosAnteriores = new Set([...todosAnos].filter((y) => !anosInt.includes(y)));
  const dfIndHist = dfFull.filter((r) => r.Departamento === selSetor && r.Indicador === selIndicador && r.Ano != null && anosAnteriores.has(r.Ano));
  const histAvg = avgAcrossYears(dfIndHist);

  const kpis = kpisForIndicator(dfInd);
  const cfg = getUnidadeConfig(unidade);
  const sentidoLabel = isSentidoMenor(sentido) ? "⬇ Menor é Melhor" : "⬆ Maior é Melhor";
  const sentidoDesc = isSentidoMenor(sentido)
    ? "⬇ Menor é Melhor — quanto menos, melhor"
    : "⬆ Maior é Melhor — quanto mais, melhor";
  const [difTxt, difColor] = fmtDiferenca(kpis.valor, kpis.meta, sentido, unidade);

  const anoChart = anosInt.length ? Math.max(...anosInt) : 0;
  const dfMesAno = dfFull.filter((r) => r.Departamento === selSetor && r.Indicador === selIndicador && r.Ano === anoChart);
  const monthly = fillAllMonths(monthlyEvolutionIndicator(dfMesAno), [anoChart]);

  const figEvo = chartEvolucaoMensalKpi(dfFull, selSetor, selIndicador, unidade, anosInt, monthly, `Evolução Mensal — ${selIndicador}`);
  const figRankU = chartRankingUnidades(dfIndChart, unidade, sentido, `Ranking de Unidades — ${selIndicador}`);

  // tabela
  const tableRows = dfInd.map((r) => {
    const a = calcAtingimento(r.Valor, r.Meta, sentido);
    return {
      Data: r.Data, Mes: r.MesNome,
      Valor: fmtValue(r.Valor, unidade), Meta: fmtValue(r.Meta, unidade),
      Atingimento: fmtPct(a), Status: `${getStatusIcon(a)} ${getStatusLabel(a)}`,
    };
  });
  const cols: Column[] = [
    { key: "Data", label: "Data" }, { key: "Mes", label: "Mês" },
    { key: "Valor", label: "Valor", align: "right" }, { key: "Meta", label: "Meta", align: "right" },
    { key: "Atingimento", label: "Atingimento", align: "right" }, { key: "Status", label: "Status" },
  ];

  return (
    <div>
      <div className="lx-grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: "0.8rem" }}>
        <BodySelect label="🏢 Selecionar Setor" value={selSetor} onChange={setRawSetor}
          options={setores.map((s) => ({ value: s, label: s }))} />
        <BodySelect label="📊 Selecionar Indicador" value={selIndicador} onChange={setRawInd}
          options={indicadoresDoSetor.map((s) => ({ value: s, label: s }))} />
      </div>

      <InfoBox style={{ marginBottom: "0.8rem" }}>
        <strong>{selSetor} › {selIndicador}</strong> &nbsp; <UnitPill unidade={unidade} /> &nbsp;
        <span style={{ fontSize: "0.78rem", color: "#6B7280" }}>{sentidoDesc}</span>
        {histAvg != null && (
          <span style={{ fontSize: "0.75rem", color: "#2D3192" }}>
            &nbsp;|&nbsp; Média anos ant.: <strong>{fmtValue(histAvg, unidade)}</strong>
          </span>
        )}
      </InfoBox>

      <div className="lx-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "1rem" }}>
        <KpiCard label={`${cfg.icon} Valor Realizado`} value={fmtValue(kpis.valor, unidade)} color={cfg.color} unit={sentidoLabel} />
        <KpiCard label="🎯 Meta" value={fmtValue(kpis.meta, unidade)} color={COLOR.ORANGE} unit={`Unidade: ${unidade}`} />
        <KpiCard label="📈 % Atingimento" value={fmtPct(kpis.atingimento)} color={getStatusColor(kpis.atingimento)}
          sub={`${getStatusIcon(kpis.atingimento)} ${getStatusLabel(kpis.atingimento)}`} />
        <KpiCard label="📉 Diferença" value={difTxt} color={difColor} unit="Realizado − Meta" />
      </div>

      <ChartBox><PlotlyChart {...figEvo} height={figEvo.layout.height} /></ChartBox>
      {figRankU && <ChartBox><PlotlyChart {...figRankU} height={figRankU.layout.height} /></ChartBox>}

      <SecHeader>📋 Registros — {selSetor} › {selIndicador}</SecHeader>
      <DataTable columns={cols} rows={tableRows} maxHeight={420} />
    </div>
  );
}
