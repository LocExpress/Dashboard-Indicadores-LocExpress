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
3. Framework: Next.js (detectado automaticamente). Sem variáveis de ambiente
   necessárias — as planilhas são públicas (CSV).
4. Deploy. (Ou via CLI: `cd web && vercel` para preview, `vercel --prod` para produção.)

> As URLs das planilhas estão em `lib/data.ts`, `lib/sge.ts` e `lib/orcamento.ts`.
