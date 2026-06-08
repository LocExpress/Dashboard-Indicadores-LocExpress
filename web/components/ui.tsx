"use client";
import React from "react";
import { getUnidadeConfig } from "@/lib/theme";

export function ChartBox({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="chart-box" style={style}>{children}</div>;
}

export function InfoBox({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="info-box" style={style}>{children}</div>;
}

export function SecHeader({ children }: { children: React.ReactNode }) {
  return <div className="sec-header">{children}</div>;
}

export function KpiCard({
  label, value, color, sub, subColor, unit,
}: {
  label: React.ReactNode; value: string; color: string; sub?: string; subColor?: string; unit?: string;
}) {
  return (
    <div className="kpi-card" style={{ borderLeftColor: color }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      {sub && <div className="kpi-status" style={{ color: subColor ?? color }}>{sub}</div>}
      {unit && <div className="kpi-unit">{unit}</div>}
    </div>
  );
}

export function SummaryCard({ num, color, label, pct }: { num: number; color: string; label: string; pct?: string }) {
  return (
    <div className="summary-card" style={{ borderTopColor: color }}>
      <div className="s-num" style={{ color }}>{num}</div>
      <div className="s-label">{label}</div>
      {pct && <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: 3 }}>{pct}</div>}
    </div>
  );
}

export function UnitPill({ unidade }: { unidade: string }) {
  const color = getUnidadeConfig(unidade).color;
  return (
    <span className="unit-pill" style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}>
      {unidade}
    </span>
  );
}

// ─── Multiselect de chips (sidebar) ─────────────────────────────────────
export function MultiSelect<T extends string | number>({
  label, options, selected, onChange, formatLabel, variant = "sidebar",
}: {
  label: string;
  options: T[];
  selected: Set<T>;
  onChange: (next: Set<T>) => void;
  formatLabel?: (v: T) => string;
  variant?: "sidebar" | "body";
}) {
  const toggle = (v: T) => {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v); else next.add(v);
    onChange(next);
  };
  const body = variant === "body";
  return (
    <div>
      <div className={body ? "lx-select-label" : "lx-filter-label"}>{label}</div>
      <div className={body ? "lx-chips lx-chips-b" : "lx-chips"}>
        {options.map((o) => (
          <span key={String(o)} className={`${body ? "lx-chip-b" : "lx-chip"}${selected.has(o) ? "" : " off"}`} onClick={() => toggle(o)}>
            {formatLabel ? formatLabel(o) : String(o)}
          </span>
        ))}
      </div>
      <div className="lx-chip-actions">
        <span className={body ? "lx-chip-action-b" : "lx-chip-action"} onClick={() => onChange(new Set(options))}>todos</span>
        <span className={body ? "lx-chip-action-b" : "lx-chip-action"} onClick={() => onChange(new Set())}>nenhum</span>
      </div>
    </div>
  );
}

// ─── Select simples (corpo) ─────────────────────────────────────────────
export function BodySelect({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="lx-select-label">{label}</label>
      <select className="lx-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Tabela genérica ────────────────────────────────────────────────────
export interface Column {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render?: (row: Record<string, any>) => React.ReactNode;
  style?: (row: Record<string, any>) => React.CSSProperties;
}

export function DataTable({ columns, rows, maxHeight }: { columns: Column[]; rows: Record<string, any>[]; maxHeight?: number }) {
  return (
    <div style={{ overflow: "auto", maxHeight, borderRadius: 10 }}>
      <table className="lx-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: c.align ?? "left" }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align ?? "left", ...(c.style?.(r) ?? {}) }}>
                  {c.render ? c.render(r) : (r[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
