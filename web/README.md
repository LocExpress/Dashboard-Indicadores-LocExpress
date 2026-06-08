# Dashboard LocExpress — versão Vercel (Next.js)

Migração do dashboard Streamlit (`../app.py`) para **Next.js 16 (App Router) + TypeScript**,
pronto para deploy no **Vercel**, mantendo o visual claro da LocExpress (índigo `#2D3192`
+ laranja `#F47920`).

## Abas

| Aba | Origem (Streamlit) | Fonte de dados |
|-----|--------------------|----------------|
| 📊 Visão Geral | `app.py` | Google Sheets CSV (indicadores) |
| 🏢 Por Departamento | `app.py` | Google Sheets CSV (indicadores) |
| 🔍 Diagnóstico SGE | `sge_page.py` | Google Sheets CSV (SGE) |
| 💰 Orçamento | `orcamento_page.py` | Google Sheets CSV (orçamento BI) |
| 📣 Marketing | `instagram_page.py` | HTML embutido em `public/dashboards/` |

A aba **Marketing** tem sub-abas **Instagram / YouTube / LinkedIn**, cada uma embutindo
um arquivo HTML estático via `<iframe>`. Para adicionar/atualizar um painel, basta
substituir o HTML correspondente em `public/dashboards/`:

- `instagram.html` — dashboard atual (Chart.js), re-tematizado para o visual claro.
- `youtube.html`, `linkedin.html` — placeholders "em construção" (trocar quando prontos).

## Arquitetura

- App **client-side** (`components/Dashboard.tsx`): busca os 3 CSVs no navegador
  (papaparse) e mantém o estado de filtros — espelha o modelo do Streamlit.
- Gráficos com **Plotly.js** (`react-plotly.js`), carregado só no cliente
  (`components/charts/PlotlyChart.tsx`, `dynamic` com `ssr:false`).
- Lógica de dados portada em `lib/` (`data.ts`, `indicators.ts`, `sge.ts`,
  `orcamento.ts`, `format.ts`, `theme.ts`, `meses.ts`).

## Rodar localmente

```bash
cd web
npm install
npm run dev   # http://localhost:3000
```

## Deploy no Vercel

1. Importe o repositório no Vercel.
2. Em **Settings → General → Root Directory**, defina **`web`**.
3. Framework: Next.js (detectado automaticamente).
4. Variáveis de ambiente (Settings → Environment Variables, ambiente **Production**):
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (`pk_live_…`) — **não** marcar como *Sensitive*.
   - `CLERK_SECRET_KEY` (`sk_live_…`).
   - `ALLOWED_EMAILS` — e-mails/domínios autorizados, separados por vírgula
     (ex.: `fulano@empresa.com, grupoeven.com.br`). Vazio = libera qualquer login.
5. Deploy. (Ou via CLI: `cd web && vercel` para preview, `vercel --prod` para produção.)

## Autenticação (Clerk + allowlist no app)

Login via **Google** com Clerk; o app só libera o dashboard para os e-mails em
`ALLOWED_EMAILS` (checado em `app/page.tsx`). Quem não está na lista vê "Acesso não
autorizado". Assim **não** é preciso o Modo Restrito / convites do Clerk — pode deixar
o cadastro aberto no Clerk que o controle de acesso é feito por `ALLOWED_EMAILS`.

> As URLs das planilhas estão em `lib/data.ts`, `lib/sge.ts` e `lib/orcamento.ts`.
