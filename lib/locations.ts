/**
 * lib/locations.ts
 * Utilitários para entidades de localização e slugs de bairro.
 * Usados pela página /bairro/[slug] e pelo autocomplete.
 */

export interface LocationEntity {
  slug:         string;
  neighborhood: string;
  city:         string;
  state:        string;
  label:        string;
}

/** Remove acentos e gera slug kebab-case */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * "Jabaquara"      → "jabaquara-sp"
 * "Vila Madalena"  → "vila-madalena-sp"
 * "Alto de Pinheiros" → "alto-de-pinheiros-sp"
 */
export function neighborhoodToSlug(neighborhood: string, state = 'SP'): string {
  return `${toSlug(neighborhood)}-${state.toLowerCase()}`;
}

// Cidade "âncora" de cada estado onde a página de bairro é usada hoje — só
// existe uma cidade candidata por estado nos casos atuais (SP-capital, Curitiba).
// Estados com múltiplas cidades liberadas (SC, Campinas) nunca chegam aqui:
// essas regiões usam `cities` e não geram links de bairro (ver RegiaoContent.tsx).
const STATE_CITY: Record<string, string> = {
  SP: 'São Paulo',
  PR: 'Curitiba',
};

/**
 * "jabaquara-sp"       → { neighborhood: "Jabaquara",      city: "São Paulo", state: "SP" }
 * "vila-madalena-sp"   → { neighborhood: "Vila Madalena",  city: "São Paulo", state: "SP" }
 * "batel-pr"           → { neighborhood: "Batel",          city: "Curitiba",  state: "PR" }
 */
export function slugToLocation(slug: string): LocationEntity {
  const state   = slug.slice(-2).toUpperCase();      // "SP"
  const rawPart = slug.slice(0, -3);                  // remove trailing "-sp"
  const neighborhood = rawPart
    .split('-')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
  const city = STATE_CITY[state] || '';
  return {
    slug,
    neighborhood,
    city,
    state,
    label: city ? `${neighborhood}, ${city} – ${state}` : `${neighborhood} – ${state}`,
  };
}

/** Retorna o path da página contextual de bairro */
export function bairroPath(neighborhood: string, state = 'SP'): string {
  return `/bairro/${neighborhoodToSlug(neighborhood, state)}`;
}
