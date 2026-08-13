/**
 * lib/cidades-liberadas.ts
 * Lista única de municípios liberados a aparecer publicamente no site
 * (listagens, sitemap, páginas de bairro). Compartilhada entre
 * app/api/orulo/route.ts e app/sitemap.ts para evitar que as duas listas
 * divirjam — foi exatamente essa divergência que fez o sitemap indexar
 * imóveis/bairros de cidades nunca liberadas (ex: Goiânia).
 */

// ── Municípios da Região Metropolitana de São Paulo (RMSP) liberados no portal ─
// Exportado porque também define onde o corretor atende presencialmente — usado
// pra decidir se um imóvel oferece "Agendar visita" (ver lib/atende-presencial.ts).
export const GRANDE_SP = new Set([
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

// ── Rio Grande do Sul — capital + litoral norte ───────────────────────────────
const RIO_GRANDE_DO_SUL = new Set(['porto alegre', 'capão da canoa']);

// Municípios liberados a aparecer no catálogo (Grande SP + outras praças + SC + PR + RS).
export const CIDADES_LIBERADAS = new Set([
  ...GRANDE_SP, ...OUTRAS_PRACAS, ...SANTA_CATARINA, ...CURITIBA, ...RIO_GRANDE_DO_SUL,
]);

/**
 * Cidades liberadas agrupadas por estado (sigla IBGE) — usado para o padrão
 * "mostrar primeiro os imóveis da região de quem está acessando" (detecção
 * por IP via headers da Vercel, sem pedir geolocalização do navegador).
 * Adicionar um estado novo aqui (RS, RJ, ...) já ativa o mecanismo pra ele
 * automaticamente, sem tocar em mais nada.
 */
export const CIDADES_POR_ESTADO: Record<string, string[]> = {
  SP: [...GRANDE_SP, ...OUTRAS_PRACAS],
  PR: [...CURITIBA],
  SC: [...SANTA_CATARINA],
  RS: [...RIO_GRANDE_DO_SUL],
};
