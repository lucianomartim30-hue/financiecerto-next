/**
 * lib/cidades-liberadas.ts
 * Lista única de municípios liberados a aparecer publicamente no site
 * (listagens, sitemap, páginas de bairro). Compartilhada entre
 * app/api/orulo/route.ts e app/sitemap.ts para evitar que as duas listas
 * divirjam — foi exatamente essa divergência que fez o sitemap indexar
 * imóveis/bairros de cidades nunca liberadas (ex: Goiânia).
 */

// ── Municípios da Região Metropolitana de São Paulo (RMSP) liberados no portal ─
const GRANDE_SP = new Set([
  'são paulo','guarulhos','osasco','santo andré','são bernardo do campo',
  'são caetano do sul','diadema','barueri','taboão da serra','santana de parnaíba',
]);

// ── Região de Campinas — segunda praça atendida fora da Grande SP ─────────────
const OUTRAS_PRACAS = new Set([
  'campinas','hortolândia','americana','paulínia','valinhos',
  "santa bárbara d'oeste",
]);

// ── Santa Catarina — litoral norte + capital ──────────────────────────────────
const SANTA_CATARINA = new Set([
  'florianópolis','itajaí','bombinhas','itapema','balneário camboriú','porto belo',
]);

// ── Curitiba (PR) ──────────────────────────────────────────────────────────────
const CURITIBA = new Set(['curitiba']);

// Municípios liberados a aparecer no catálogo (Grande SP + outras praças + SC + PR).
export const CIDADES_LIBERADAS = new Set([
  ...GRANDE_SP, ...OUTRAS_PRACAS, ...SANTA_CATARINA, ...CURITIBA,
]);
