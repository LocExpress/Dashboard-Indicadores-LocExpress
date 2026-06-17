import { Icon } from "./Icon";

// Slicer de seleção única (estilo Power BI). value "" = Todos.
export function Slicer({ label, value, options, onChange, allLabel = "Todos", wide, format }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
  allLabel?: string; wide?: boolean; format?: (v: string) => string;
}) {
  return (
    <div className="filt-item" style={wide ? { flex: "2 1 240px" } : undefined}>
      <div className="filt-label"><Icon name="filter" size={12} /> {label}</div>
      <select className="viab-select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((o) => <option key={o} value={o}>{format ? format(o) : o}</option>)}
      </select>
    </div>
  );
}

// Alternância segmentada (ex.: Mensal | Anual).
export function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { id: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="viab-seg" style={{ marginBottom: 0 }}>
      {options.map((o) => (
        <button key={o.id} className={`viab-seg-btn${o.id === value ? " active" : ""}`} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Painel de gráfico com título + subtítulo (e ação opcional à direita).
export function Panel({ title, sub, span, height = 320, action, children }: {
  title: string; sub?: string; span?: boolean; height?: number; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className={`viab-panel${span ? " span-2" : ""}`}>
      <div className="viab-panel-head" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.8rem" }}>
        <div>
          <div className="viab-panel-title">{title}</div>
          {sub && <div className="viab-panel-sub">{sub}</div>}
        </div>
        {action}
      </div>
      <div style={{ height }}>{children}</div>
    </div>
  );
}
