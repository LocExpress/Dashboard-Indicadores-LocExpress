"use client";
import { SignOutButton } from "@clerk/nextjs";
import LogoSvg from "./LogoSvg";

export default function NotAuthorized({ email }: { email: string }) {
  return (
    <div
      style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 18, padding: "2rem",
        background: "linear-gradient(135deg, #0f0f5e 0%, #2d3192 55%, #f47920 140%)",
        textAlign: "center", color: "#fff",
      }}
    >
      <div
        style={{
          width: 72, height: 72, background: "rgba(255,255,255,0.12)", borderRadius: 18,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 8,
        }}
      >
        <LogoSvg color="#FFFFFF" size={52} />
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>🔒 Acesso não autorizado</div>
      <p style={{ maxWidth: 460, fontSize: "0.95rem", opacity: 0.92, lineHeight: 1.6 }}>
        {email ? (
          <>O e-mail <strong>{email}</strong> não está liberado para este dashboard.</>
        ) : (
          <>Sua conta não está liberada para este dashboard.</>
        )}{" "}
        Fale com o administrador para solicitar acesso.
      </p>
      <SignOutButton>
        <button
          style={{
            background: "#fff", color: "#2d3192", border: "none", borderRadius: 8,
            fontWeight: 700, padding: "0.6rem 1.4rem", cursor: "pointer", fontSize: "0.9rem",
          }}
        >
          Sair e entrar com outra conta
        </button>
      </SignOutButton>
    </div>
  );
}
