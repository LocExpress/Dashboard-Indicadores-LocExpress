import { Icon } from "./Icon";

// Slicer de seleção única (estilo Power BI). value "" = Todos.
export function Slicer({ label, value, options, onChange, allLabel = "Todos", wide }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void; allLabel?: string; wide?: boolean;
}) {
  return (
    <div className="filt-item" style={wide ? { flex: "2 1 240px" } : undefined}>
      <div className="filt-label"><Icon name="filter" size={12} /> {label}</div>
      <select className="viab-select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// Painel de gráfico com título + subtítulo.
export function Panel({ title, sub, span, height = 320, children }: {
  title: string; sub?: string; span?: boolean; height?: number; children: React.ReactNode;
}) {
  return (
    <div className={`viab-panel${span ? " span-2" : ""}`}>
      <div className="viab-panel-head">
        <div className="viab-panel-title">{title}</div>
        {sub && <div className="viab-panel-sub">{sub}</div>}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}
