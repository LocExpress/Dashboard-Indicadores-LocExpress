import Marketing from "@/components/pages/Marketing";

// Visão de EMBED: apenas o painel "Resultados de Marketing" (Instagram/YouTube/
// LinkedIn/Franquias), sem a navegação de áreas do dashboard. Usado dentro do
// LocHub (Marketing → Redes Sociais) via iframe. Rota pública (ver middleware) —
// o controle de acesso é feito pelo próprio LocHub.
export const metadata = {
  title: "Resultados de Marketing — LocExpress",
};

export default function EmbedMarketingPage() {
  return (
    <div className="lx-container">
      <Marketing />
    </div>
  );
}
