// Paleta de cores LocExpress + helpers de status — porta de utils.py

export const COLOR = {
  ORANGE: "#F47920",
  ORANGE_LIGHT: "#FFA040",
  INDIGO_DARK: "#1A1A6E",
  INDIGO: "#2D3192",
  INDIGO_LIGHT: "#3F3FBF",
  BLUE_DARK: "#003087",
  WHITE: "#FFFFFF",
  GRAY_DARK: "#374151",
  GRAY_MID: "#6B7280",
  GRAY_LIGHT: "#F3F4F6",
  GREEN: "#00C853",
  YELLOW: "#FFB300",
  RED: "#F44336",
} as const;

export interface UnidadeConfig {
  agg: "sum" | "mean";
  color: string;
  icon: string;
}

const UNIDADE_CONFIG: Record<string, UnidadeConfig> = {
  "R$": { agg: "sum", color: COLOR.BLUE_DARK, icon: "💰" },
  "%": { agg: "mean", color: COLOR.ORANGE, icon: "📊" },
  "Dias": { agg: "mean", color: "#6366F1", icon: "📅" },
  "Quantidade": { agg: "sum", color: "#10B981", icon: "📦" },
  "Número": { agg: "mean", color: "#8B5CF6", icon: "🔢" },
};

export function getUnidadeConfig(unidade: string): UnidadeConfig {
  return UNIDADE_CONFIG[String(unidade).trim()] ?? { agg: "sum", color: COLOR.BLUE_DARK, icon: "📈" };
}

export function getAggType(unidade: string): "sum" | "mean" {
  return getUnidadeConfig(unidade).agg;
}

// ─── Status ─────────────────────────────────────────────────────────────

export function getStatusColor(pct: number | null): string {
  if (pct == null || Number.isNaN(pct)) return COLOR.GRAY_MID;
  if (pct >= 100) return COLOR.GREEN;
  if (pct >= 80) return COLOR.YELLOW;
  return COLOR.RED;
}

export function getStatusIcon(pct: number | null): string {
  if (pct == null || Number.isNaN(pct)) return "⬜";
  if (pct >= 100) return "✅";
  if (pct >= 80) return "⚠️";
  return "🚨";
}

export function getStatusLabel(pct: number | null): string {
  if (pct == null || Number.isNaN(pct)) return "Não Informado";
  if (pct >= 100) return "Meta Atingida";
  if (pct >= 80) return "Atenção";
  return "Abaixo da Meta";
}
