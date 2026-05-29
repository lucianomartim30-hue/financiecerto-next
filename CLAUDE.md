# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # dev server (localhost:3000)
npm run build        # production build
npm run lint         # ESLint
npx tsc --noEmit     # TypeScript check (use before committing)
node scripts/update-tr.js --dry-run   # test TR update without writing
node scripts/update-tr.js             # fetch & write TR data from BCB
```

> `next.config.ts` sets `ignoreBuildErrors: true` — TypeScript errors do NOT block the Vercel build. The pre-existing error in `lib/orulo-kv.ts` (TS2347) can be ignored.

## Architecture

**Stack:** Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · Vercel (hosting + KV + cron) · MapLibre GL (maps) · no database.

**Production domain:** `www.financiecerto.com.br` — `middleware.ts` redirects all `.vercel.app` production traffic and bare `financiecerto.com.br` to the canonical www domain.

---

### `lib/calculos.ts` — single source of truth for all financial logic

All financial constants, formulas and data live here. **Never hardcode financial values in page files** — always import from this module.

Key exports:
| Export | Value | Source |
|--------|-------|--------|
| `FAIXAS_MCMV` | Array of 4 MCMV tiers | Portaria MCID nº 333/2026 (SP) |
| `TETO_SFH` | `2_250_000` | CMN — teto SFH vigente |
| `TAXA_SBPE_ANUAL` | `11.19` | Caixa — correntista 2026 |
| `BANCOS_SBPE` | Array with 7 banks | Market reference mai/2026 |
| `TR_HISTORICO_36M` | 36-month TR array | BCB Série 226 |
| `simularHistoricoTR()` | SAC+TR simulation | — |
| `formatBRL()` | Currency formatter | — |

**MCMV Faixas (São Paulo):**
- F1: renda ≤ R$ 3.200 · taxa 4–5% · subsídio até R$ 55k · teto R$ 275k
- F2: renda ≤ R$ 5.000 · taxa 5–7% · subsídio até R$ 55k · teto R$ 275k
- F3: renda ≤ R$ 9.600 · taxa 7,66–8,16% · sem subsídio · teto R$ 400k
- F4: renda ≤ R$ 13.000 · taxa 9–10,5% · sem subsídio · teto R$ 600k

---

### Real estate data pipeline (Orulo → Vercel KV → pages)

`lib/orulo-api.ts` fetches from the Orulo API and normalizes buildings into `NormalizedBuilding`. `lib/orulo-kv.ts` stores the catalog in Vercel KV split into 300-item chunks (limit: ~1MB/key). `vercel.json` schedules `/api/orulo/sync` daily at 04:00 UTC to refresh the catalog.

Pages consume the catalog via `/api/orulo/catalog` — never call Orulo directly from page components.

---

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing — profile CTAs |
| `/simulador` | Main financing simulator (MCMV / SBPE-SFH / SFI) |
| `/simulador/na-planta` | Construction-phase simulator (juros evolutivos) |
| `/simulador/historico-tr` | 36-month TR historical impact on SAC loans |
| `/imoveis` | Map + card catalog with filters (MapLibre GL) |
| `/imoveis/[id]` | Property detail |
| `/guia` | Educational FAQ |
| `/glossario` | Financing glossary |
| `/bairro/[slug]` | Neighborhood page |
| `/api/chat` | João AI consultant (Claude API, 20 req/min rate limit) |
| `/api/orulo/sync` | Orulo catalog sync (Vercel cron, secret-protected) |

---

### Key components

- **`Header.tsx`** — nav links are defined in `NAV_SIMPLE` array at the top; the mobile menu references the same array. Add nav items only there.
- **`MapView.tsx`** — MapLibre GL with `forwardRef`/`flyTo` handle. Incremental marker updates via `Map<id, Marker>` (never clear all markers). Mobile: pin cap 50, `pixelRatio` capped at 2×, `touch-action: none`.
- **`ChatFab.tsx`** — "João" floating chat bubble powered by `/api/chat`. System prompt is in `route.ts` (`SYSTEM_BASE`).
- **`BuscaImoveisInteligente.tsx`** — embedded in simulator results; filters catalog by value range and shows compatible properties.

---

### GitHub Actions

`.github/workflows/update-tr.yml` — runs on day 5 of each month, calls `scripts/update-tr.js` to fetch BCB Série 226, updates `TR_HISTORICO_36M` in `lib/calculos.ts`, and auto-commits. Requires the GitHub token to have `workflow` scope.

---

### Styling

No global CSS framework in use beyond Tailwind v4 utility classes. Most components use inline `style={{}}` objects. CSS variables: `--primary`, `--bg-card`, `--border`, `--text`, `--text-faint`, `--primary-light` (defined in `app/layout.tsx` or global CSS).

---

### Data sources & update policy

| Data | Source | Update frequency |
|------|--------|-----------------|
| TR mensal | BCB Série 226 | Automated — day 5 each month (GitHub Actions) |
| MCMV tetos/taxas | Portaria MCID | Manual — when government publishes new portaria |
| SBPE bank rates | Bank simulators | Manual — check periodically |
| Orulo catalog | Orulo API | Automated — daily 04:00 UTC (Vercel cron) |

When updating MCMV/SBPE constants, update `lib/calculos.ts` **and** the matching text in: `app/guia/page.tsx`, `app/glossario/page.tsx`, `app/api/chat/route.ts` (SYSTEM_BASE section).
