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

/**
 * "jabaquara-sp"       → { neighborhood: "Jabaquara",      city: "São Paulo", state: "SP" }
 * "vila-madalena-sp"   → { neighborhood: "Vila Madalena",  city: "São Paulo", state: "SP" }
 */
export function slugToLocation(slug: string): LocationEntity {
  const state   = slug.slice(-2).toUpperCase();      // "SP"
  const rawPart = slug.slice(0, -3);                  // remove trailing "-sp"
  const neighborhood = rawPart
    .split('-')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
  return {
    slug,
    neighborhood,
    city:  'São Paulo',
    state,
    label: `${neighborhood}, São Paulo – ${state}`,
  };
}

/** Retorna o path da página contextual de bairro */
export function bairroPath(neighborhood: string, state = 'SP'): string {
  return `/bairro/${neighborhoodToSlug(neighborhood, state)}`;
}
