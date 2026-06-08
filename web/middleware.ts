import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Rotas públicas (sem login): apenas a tela de entrada.
const isPublicRoute = createRouteMatcher(["/sign-in(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Protege tudo, exceto _next e arquivos estáticos
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|gif|png|svg|ico|webp|woff2?|ttf|csv)).*)",
    "/(api|trpc)(.*)",
  ],
};
