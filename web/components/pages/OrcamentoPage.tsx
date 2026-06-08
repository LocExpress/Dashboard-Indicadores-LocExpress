"use client";
import { useEffect, useMemo, useState } from "react";
import { type OrcRow, buildMonthly, buildArea, ORC_COLORS } from "@/lib/orcamento";
import { MESES_PT } from "@/lib/meses";
import { fmtBrl, fmtPct } from "@/lib/format";
import { MultiSelect, KpiCard, ChartBox, InfoBox, SecHeader, DataTable, Collapsible, type Column } from "../ui";
import PlotlyChart from "../charts/PlotlyChart";
import { chartOrcRealMensal, chartOrcRealArea, chartDesvioArea, chartEvolucaoMensalOrc } from "../charts/orcamento";

export default function OrcamentoPage({ data, error }: { data: OrcRow[] | null; error: string | null }) {
  const opts = useMemo(() => {
    if (!data) return { anos: [] as number[], meses: [] as number[], areas: [] as string[], cats: [] as string[], emps: [] as string[], tipos: [] as string[] };
    return {
      anos: [...new Set(data.map((r) => r.Ano).filter((v): v is number => v != null))].sort((a, b) => a - b),
      meses: [...new Set(data.map((r) => r.Mes).filter((v): v is number => v != null))].sort((a, b) => a - b),
      areas: [...new Set(data.map((r) => r.Area).filter(Boolean))].sort(),
      cats: [...new Set(data.map((r) => r.Categoria).filter(Boolean))].sort(),
      emps: [...new Set(data.map((r) => r.Empresa).filter(Boolean))].sort(),
      tipos: [...new Set(data.map((r) => r.Tipo_Valor).filter(Boolean))].sort(),
    };
  }, [data]);

  const [selAno, setSelAno] = useState<Set<number>>(new Set());
  const [selMes, setSelMes] = useState<Set<number>>(new Set());
  const [selArea, setSelArea] = useState<Set<string>>(new Set());
  const [selCat, setSelCat] = useState<Set<string>>(new Set());
  const [selEmp, setSelEmp] = useState<Set<string>>(new Set());
  const [selTipo, setSelTipo] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelAno(new Set(opts.anos)); setSelMes(new Set(opts.meses)); setSelArea(new Set(opts.areas));
    setSelCat(new Set(opts.cats)); setSelEmp(new Set(opts.emps)); setSelTipo(new Set(opts.tipos));
  }, [opts]);

  if (error) {
    return (
      <div>
        <SecHeader>💰 Orçamento Setorial BI</SecHeader>
        <div className="lx-error">❌ Erro ao carregar orçamento{"\n\n"}{error}</div>
      </div>
    );
  }
  if (!data) return null;

  const allSet = selAno.size && selMes.size && selArea.size && selCat.size && selEmp.size && selTipo.size;
  const dfF = data.filter(
    (r) => r.Ano != null && selAno.has(r.Ano) && r.Mes != null && selMes.has(r.Mes) &&
      selArea.has(r.Area) && selCat.has(r.Categoria) && selEmp.has(r.Empresa) && selTipo.has(r.Tipo_Valor),
  );

  const orc = dfF.filter((r) => r.Tipo_Valor === "Orçado").reduce((a, r) => a + (r.Valor ?? 0), 0);
  const real = dfF.filter((r) => r.Tipo_Valor === "Realizado").reduce((a, r) => a + (r.Valor ?? 0), 0);
  const hasRealizado = dfF.some((r) => r.Tipo_Valor === "Realizado");
  const desvioBrl = real - orc;
  const desvioPct = orc !== 0 ? (desvioBrl / orc) * 100 : null;
  const execucao = orc !== 0 ? (real / orc) * 100 : null;

  const dfMonthly = buildMonthly(dfF);
  const dfArea = buildArea(dfF);

  const tableCols: Column[] = [
    { key: "Data", label: "Data" }, { key: "Ano", label: "Ano" }, { key: "Mes", label: "Mês" },
    { key: "Area", label: "Área" }, { key: "Categoria", label: "Categoria" }, { key: "Empresa", label: "Empresa" },
    { key: "Tipo_Valor", label: "Tipo" }, { key: "Valor", label: "Valor (R$)", align: "right" }, { key: "Just", label: "Justificativa" },
  ];
  const tableRows = dfF.map((r) => ({
    Data: r.Data, Ano: r.Ano ?? "", Mes: r.MesNome, Area: r.Area, Categoria: r.Categoria,
    Empresa: r.Empresa, Tipo_Valor: r.Tipo_Valor, Valor: fmtBrl(r.Valor), Just: r.Justificativa_ROI,
  }));

  return (
    <div>
      <SecHeader>💰 Orçamento Setorial BI</SecHeader>

      <div className="chart-box" style={{ padding: "0.8rem 1.2rem", marginBottom: "1rem" }}>
        <Collapsible title="🔍 Filtros do Orçamento" variant="body" defaultOpen={false}>
          <div className="lx-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <MultiSelect variant="body" label="Ano" options={opts.anos} selected={selAno} onChange={setSelAno} />
            <MultiSelect variant="body" label="Mês" options={opts.meses} selected={selMes} onChange={setSelMes} formatLabel={(m) => MESES_PT[m] ?? String(m)} />
            <MultiSelect variant="body" label="Área" options={opts.areas} selected={selArea} onChange={setSelArea} />
            <MultiSelect variant="body" label="Categoria" options={opts.cats} selected={selCat} onChange={setSelCat} />
            <MultiSelect variant="body" label="Empresa" options={opts.emps} selected={selEmp} onChange={setSelEmp} />
            <MultiSelect variant="body" label="Tipo de Valor" options={opts.tipos} selected={selTipo} onChange={setSelTipo} />
          </div>
        </Collapsible>
      </div>

      {!allSet && <InfoBox>⚠️ Selecione ao menos uma opção em cada filtro.</InfoBox>}
      {allSet && dfF.length === 0 && <InfoBox>⚠️ Nenhum registro encontrado para os filtros selecionados.</InfoBox>}

      {allSet && dfF.length > 0 && (
        <>
          {!hasRealizado && (
            <InfoBox style={{ marginBottom: "0.6rem" }}>
              ℹ️ <strong>Realizado ainda não lançado.</strong> O dashboard está operando apenas com dados de Orçado.
            </InfoBox>
          )}

          <div className="lx-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: "1rem" }}>
            <KpiCard label="💰 Orçado Total" value={fmtBrl(orc)} color={ORC_COLORS.BLUE} />
            <KpiCard label="✅ Realizado Total" value={fmtBrl(real)} color={real === 0 ? ORC_COLORS.GRAY : real <= orc ? ORC_COLORS.GREEN : ORC_COLORS.RED} sub={real === 0 ? "Sem lançamento" : undefined} />
            <KpiCard label="📉 Desvio R$" value={fmtBrl(desvioBrl)} color={real === 0 ? "#6b7280" : desvioBrl <= 0 ? ORC_COLORS.GREEN : ORC_COLORS.RED} sub="Realizado − Meta" />
            <KpiCard label="📊 Desvio %" value={fmtPct(desvioPct)} color={desvioPct == null ? "#6b7280" : desvioPct <= 0 ? ORC_COLORS.GREEN : ORC_COLORS.RED} sub="Desvio / Orçado" />
            <KpiCard label="🎯 % Execução" value={fmtPct(execucao)} color={execucao == null ? "#6b7280" : execucao <= 100 ? ORC_COLORS.GREEN : ORC_COLORS.RED} sub="Realizado / Orçado" />
          </div>

          <div className="lx-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <ChartBox><PlotlyChart {...chartOrcRealMensal(dfMonthly)} height={400} /></ChartBox>
            <ChartBox><PlotlyChart {...chartOrcRealArea(dfArea)} height={400} /></ChartBox>
          </div>
          <div className="lx-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <ChartBox><PlotlyChart {...chartDesvioArea(dfArea)} height={chartDesvioArea(dfArea).layout.height} /></ChartBox>
            <ChartBox><PlotlyChart {...chartEvolucaoMensalOrc(dfMonthly)} height={400} /></ChartBox>
          </div>

          <SecHeader>📋 Registros Detalhados</SecHeader>
          <DataTable columns={tableCols} rows={tableRows} maxHeight={460} />
        </>
      )}
    </div>
  );
}
