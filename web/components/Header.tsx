import LogoSvg from "./LogoSvg";

export default function Header({ nFiltered, nTotal }: { nFiltered: number; nTotal: number }) {
  return (
    <div className="lx-header">
      <div className="lx-header-top">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 52, height: 52, background: "rgba(255,255,255,0.15)", borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center", padding: 4,
            }}
          >
            <LogoSvg color="#FFFFFF" size={44} />
          </div>
          <div>
            <div className="lx-logo-text">
              Loc<span>Express</span>
              <em style={{ fontStyle: "italic", fontSize: "0.95rem", fontWeight: 700, color: "rgba(255,255,255,0.9)", marginLeft: 3 }}>
                Franchising
              </em>
            </div>
            <div className="lx-tagline">NOSSO DNA É LOCAÇÃO!</div>
          </div>
        </div>
      </div>
      <div className="lx-header-body">
        <h1>📊 Dashboard de Indicadores</h1>
        <p>
          Acompanhamento de KPIs por Setor, Indicador e Período &nbsp;|&nbsp;{" "}
          {nFiltered.toLocaleString("pt-BR")} registros · {nTotal.toLocaleString("pt-BR")} total
        </p>
      </div>
    </div>
  );
}
