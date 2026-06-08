import { SignIn } from "@clerk/nextjs";
import LogoSvg from "@/components/LogoSvg";

export default function SignInPage() {
  return (
    <div
      style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 28, padding: "2rem",
        background: "linear-gradient(135deg, #0f0f5e 0%, #2d3192 55%, #f47920 140%)",
      }}
    >
      <div style={{ textAlign: "center", color: "#fff" }}>
        <div
          style={{
            width: 72, height: 72, background: "rgba(255,255,255,0.12)", borderRadius: 18,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", padding: 8,
          }}
        >
          <LogoSvg color="#FFFFFF" size={52} />
        </div>
        <div style={{ fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-0.02em" }}>
          Loc<span style={{ color: "#FFD9BF" }}>Express</span> Franchising
        </div>
        <div style={{ fontSize: "0.9rem", opacity: 0.85, marginTop: 4 }}>
          Dashboard de Indicadores — acesso restrito a usuários autorizados
        </div>
      </div>
      <SignIn fallbackRedirectUrl="/" />
    </div>
  );
}
