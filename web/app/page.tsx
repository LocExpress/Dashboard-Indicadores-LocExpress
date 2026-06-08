import { currentUser } from "@clerk/nextjs/server";
import Dashboard from "@/components/Dashboard";
import NotAuthorized from "@/components/NotAuthorized";

// Lista de e-mails/domínios autorizados (variável de ambiente ALLOWED_EMAILS,
// separada por vírgula). Aceita e-mails completos ("fulano@empresa.com") ou
// domínios inteiros ("empresa.com" ou "@empresa.com").
function getAllowed(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

function isAllowed(email: string, allowed: string[]): boolean {
  if (allowed.length === 0) return true; // não configurado → não trava (evita lockout)
  const e = email.toLowerCase();
  const domain = e.split("@")[1] ?? "";
  return allowed.includes(e) || (domain !== "" && allowed.includes(domain));
}

export default async function Home() {
  const user = await currentUser();
  const emails = (user?.emailAddresses ?? []).map((x) => x.emailAddress);
  const allowed = getAllowed();

  if (!emails.some((e) => isAllowed(e, allowed))) {
    return <NotAuthorized email={emails[0] ?? ""} />;
  }
  return <Dashboard />;
}
