import type { CSSProperties } from "react";
import { Icon } from "./Icon";

// KPI card executivo (acento superior colorido + ícone discreto). Estilo Power BI.
export function Kpi({ label, value, sub, accent, icon }: {
  label: string; value: string; sub?: string; accent: string; icon: string;
}) {
  return (
    <div className="viab-kpi" style={{ "--accent": accent } as CSSProperties}>
      <div className="viab-kpi-top">
        <div className="viab-kpi-label">{label}</div>
        <div className="viab-kpi-icon" style={{ background: `${accent}1F`, color: accent }}><Icon name={icon} /></div>
      </div>
      <div className="viab-kpi-value" style={{ color: accent }}>{value}</div>
      {sub && <div className="viab-kpi-sub">{sub}</div>}
    </div>
  );
}
