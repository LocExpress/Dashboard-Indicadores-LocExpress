"use client";
import { useState } from "react";

const REDES = [
  { id: "instagram", label: "📸 Instagram", src: "/dashboards/instagram.html", height: 2600 },
  { id: "youtube", label: "▶️ YouTube", src: "/dashboards/youtube.html", height: 520 },
  { id: "linkedin", label: "💼 LinkedIn", src: "/dashboards/linkedin.html", height: 520 },
] as const;

export default function Marketing() {
  const [active, setActive] = useState<(typeof REDES)[number]["id"]>("instagram");
  const rede = REDES.find((r) => r.id === active)!;

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#2D3192 0%,#F47920 100%)", borderRadius: 12, padding: "1.2rem 1.8rem", marginBottom: "1.2rem", color: "#fff" }}>
        <div style={{ fontSize: "1.3rem", fontWeight: 900 }}>📣 Resultados de Marketing</div>
        <div style={{ fontSize: "0.85rem", opacity: 0.88, marginTop: 4 }}>
          Desempenho das redes sociais da LocExpress — Instagram, YouTube e LinkedIn
        </div>
      </div>

      <div className="mkt-subtabs">
        {REDES.map((r) => (
          <button key={r.id} className={`mkt-subtab${r.id === active ? " active" : ""}`} onClick={() => setActive(r.id)}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="mkt-frame-wrap">
        <iframe
          key={rede.id}
          className="mkt-frame"
          src={rede.src}
          style={{ height: rede.height }}
          title={rede.label}
          loading="lazy"
        />
      </div>
    </div>
  );
}
