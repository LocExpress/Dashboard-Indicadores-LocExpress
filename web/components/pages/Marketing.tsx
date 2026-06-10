"use client";
import { useState } from "react";
import YoutubeAnalytics from "./YoutubeAnalytics";

const REDES = [
  { id: "instagram", label: "📸 Instagram" },
  { id: "youtube",   label: "▶️ YouTube"   },
  { id: "linkedin",  label: "💼 LinkedIn"  },
] as const;

type RedeId = (typeof REDES)[number]["id"];

export default function Marketing() {
  const [active, setActive] = useState<RedeId>("instagram");

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#2D3192 0%,#F47920 100%)", borderRadius: 12,
                    padding: "1.2rem 1.8rem", marginBottom: "1.2rem", color: "#fff" }}>
        <div style={{ fontSize: "1.3rem", fontWeight: 900 }}>📣 Resultados de Marketing</div>
        <div style={{ fontSize: "0.85rem", opacity: 0.88, marginTop: 4 }}>
          Desempenho das redes sociais da LocExpress — Instagram, YouTube e LinkedIn
        </div>
      </div>

      <div className="mkt-subtabs">
        {REDES.map((r) => (
          <button key={r.id} className={`mkt-subtab${r.id === active ? " active" : ""}`}
                  onClick={() => setActive(r.id)}>
            {r.label}
          </button>
        ))}
      </div>

      {active === "youtube" ? (
        <div style={{ marginTop: "1rem" }}>
          <YoutubeAnalytics />
        </div>
      ) : (
        <div className="mkt-frame-wrap">
          <iframe
            key={active}
            className="mkt-frame"
            src={`/dashboards/${active}.html`}
            style={{ height: active === "instagram" ? 2600 : 520 }}
            title={active}
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
}
