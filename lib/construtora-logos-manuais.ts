/**
 * Logos oficiais baixadas manualmente dos sites das construtoras — a Orulo
 * não fornece `developer.logo`/`developer.image` pra nenhuma construtora do
 * catálogo (confirmado em 2026-09-10, até pra Cury), então esse campo nunca
 * vem preenchido pela API. Arquivos em public/logos/, servidos como /logos/*.
 *
 * Chave = slug da construtora (ver construtoraToSlug em construtora-nomes.ts).
 */
export const LOGOS_MANUAIS: Record<string, string> = {
  'cury':               '/logos/cury.png',
  'dialogo':            '/logos/dialogo.svg',
  'vivaz':              '/logos/vivaz.svg',
  'plano-plano':        '/logos/plano-plano.svg',
  'metrocasa':          '/logos/metrocasa.svg',
  'tiberio':            '/logos/tiberio.svg',
  'econ-construtora':   '/logos/econ.webp',
  'benx-bueno-netto':   '/logos/benx.svg',
  'vitacon':            '/logos/vitacon.svg',
  'mrv':                '/logos/mrv.svg',
  'trisul':             '/logos/trisul.svg',
  'living':             '/logos/living.svg',
  'mitre-realty':       '/logos/mitre-realty.svg',
  'eztec':              '/logos/eztec.svg',
  'vibra':              '/logos/vibra.svg',
};
