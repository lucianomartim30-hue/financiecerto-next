/**
 * lib/lancamentos-manuais.ts
 *
 * Empreendimentos cadastrados manualmente, fora do fluxo normal da Orulo —
 * usado quando um "breve lançamento" já existe (site da própria incorporadora
 * confirma) mas a integração da Orulo ainda não devolve os dados pra essa
 * conta (ver auditoria 2026-09: Elev Saúde existe na Orulo com id 85509,
 * dados confirmados por um login pessoal na Orulo, mas `GET /api/v2/buildings/85509`
 * com a chave do FinancieCerto retorna 404 — provável restrição de permissão
 * entre a Trisul e essa integração específica, não uma questão de código).
 *
 * Cada entrada tem duas projeções:
 *  - paraCatalogo(): formato CatalogEntry, pra aparecer nas listagens/busca/mapa
 *    igual a qualquer imóvel vindo da Orulo.
 *  - paraDetalhe(): formato rico (tipologias, amenidades, plantas) igual ao que
 *    GET /api/orulo/[id] devolve pra ficha do imóvel.
 *
 * Fotos e plantas são hospedadas localmente em public/lancamentos-manuais/ —
 * baixadas do site oficial da incorporadora (acesso público), não da área
 * logada da Orulo, pra não depender de um CDN de terceiro nem de sessão.
 */

import type { CatalogEntry } from './orulo-kv';

export interface LancamentoManual {
  id: string;
  name: string;
  developer: string;
  developerWebsite: string;
  neighborhood: string;
  street: string;
  number: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  deliveryDate: string; // DD/MM/AAAA — mesmo formato que a Orulo já usa (exibido cru na ficha)
  launchDate: string;   // DD/MM/AAAA — quando a incorporadora abre a comercialização
  status: string;
  bedroomsMin: number;
  bedroomsMax: number;
  areaMin: number;
  areaMax: number;
  bathroomsMin: number;
  bathroomsMax: number;
  totalUnits: number;
  updatedAt: string; // ISO
  oruloUrl: string;
  heroPhoto: string;
  photos: string[];
  description: string;
  amenities: string[];
  typologies: {
    type: string;
    bedrooms: number;
    area: number;
    bathrooms: number;
    suites: number;
  }[];
  blueprints: { name: string; url: string }[];
}

export const LANCAMENTOS_MANUAIS: LancamentoManual[] = [
  {
    id: 'elev-saude',
    name: 'Elev Saúde',
    developer: 'Trisul',
    developerWebsite: 'https://www.trisul-sa.com.br/apartamentos/sao-paulo/conceicao/elev-saude',
    neighborhood: 'Vila da Saúde',
    street: 'Avenida Miguel Estefno',
    number: '72',
    city: 'São Paulo',
    state: 'SP',
    lat: -23.6196879,
    lng: -46.6386451,
    deliveryDate: '30/09/2029',
    launchDate: '25/09/2026',
    status: 'Breve Lançamento',
    bedroomsMin: 1,
    bedroomsMax: 2,
    areaMin: 25,
    areaMax: 37,
    bathroomsMin: 1,
    bathroomsMax: 2,
    totalUnits: 571,
    updatedAt: '2026-09-11',
    oruloUrl: 'https://www.orulo.com.br/buildings/85509',
    heroPhoto: '/lancamentos-manuais/elev-saude/fachada.webp',
    photos: [
      '/lancamentos-manuais/elev-saude/fachada.webp',
      '/lancamentos-manuais/elev-saude/lazer-piscina.webp',
    ],
    description: 'O Elev Saúde nasce em um endereço onde a mobilidade aproxima muito mais do que destinos — a 1 minuto do Metrô Saúde, com acesso a avenidas importantes e toda a infraestrutura da região (escolas, universidades, mercados e farmácias). Empreendimento com 2 torres, 17 andares e lazer completo.',
    amenities: [
      'Delivery', 'Fitness', 'Pet Care', 'Lavanderia Coletiva', 'Coworking',
      'Minimercado', 'Brinquedoteca', 'Salão de Festas', 'Piscina Adulto',
      'Piscina Infantil', 'Solário', 'Boulevard', 'Redário', 'Espaço Pet',
      'Pomar', 'Quadra Gramada', 'Playground', 'Praça Coworking',
      'Churrasqueira', 'Terraço Descoberto (Rooftop)',
    ],
    typologies: [
      { type: 'Apartamento', bedrooms: 1, area: 25, bathrooms: 1, suites: 0 },
      { type: 'Apartamento', bedrooms: 2, area: 34, bathrooms: 1, suites: 0 },
      { type: 'Apartamento', bedrooms: 2, area: 37, bathrooms: 2, suites: 1 },
    ],
    blueprints: [
      { name: 'Planta 02 — 2 dorm 34m²', url: '/lancamentos-manuais/elev-saude/planta-2dorm.webp' },
    ],
  },
];

export function getLancamentoManual(id: string): LancamentoManual | undefined {
  return LANCAMENTOS_MANUAIS.find(l => l.id === id);
}

// ── Projeção pro formato do catálogo (listagens, busca, mapa) ────────────────
export function lancamentoParaCatalogo(l: LancamentoManual): CatalogEntry {
  return {
    id: l.id,
    name: l.name,
    developer: l.developer,
    developer_logo: null,
    developer_website: l.developerWebsite,
    // CatalogEntry.min_price/max_price são tipados como `number` (não
    // `number | null`) por um detalhe de inferência em normalizeBuilding()
    // — na prática já existem imóveis reais "breve lançamento" sem preço
    // (ver lib/filtro-breve-lancamento.ts), então null é o valor certo,
    // só não o tipo mais preciso que o resto do catálogo já usa.
    min_price: null as unknown as number,
    max_price: null as unknown as number,
    bedrooms_min: l.bedroomsMin,
    bedrooms_max: l.bedroomsMax,
    area_min: l.areaMin,
    area_max: l.areaMax,
    bathrooms_min: l.bathroomsMin,
    bathrooms_max: l.bathroomsMax,
    vagas_min: 0,
    vagas_max: 0,
    neighborhood: l.neighborhood,
    address_full: [l.street, l.number].filter(Boolean).join(', '),
    street: l.street,
    number: l.number,
    city: l.city,
    state: l.state,
    lat: l.lat,
    lng: l.lng,
    delivery_date: l.deliveryDate,
    photo: l.heroPhoto,
    sharing_url: null,
    orulo_url: l.oruloUrl,
    status: l.status,
    status_norm: 'na planta',
    finality: 'Residencial',
    finality_norm: 'residencial',
    updated_at: l.updatedAt,
    stock: l.totalUnits,
    property_types: ['Apartamento'],
    typology_ranges: [{
      type: 'Apartamento',
      price_min: null, price_max: null,
      bedrooms_min: l.bedroomsMin, bedrooms_max: l.bedroomsMax,
      area_min: l.areaMin, area_max: l.areaMax,
    }],
    seo_status: 'active',
    first_missing_at: null,
    last_confirmed_at: new Date().toISOString(),
  };
}

export const CATALOGO_LANCAMENTOS_MANUAIS: CatalogEntry[] = LANCAMENTOS_MANUAIS.map(lancamentoParaCatalogo);

// ── Projeção pro formato de detalhe (ficha do imóvel, GET /api/orulo/[id]) ───
// Mesmo formato de campos que a rota devolve pra um imóvel real da Orulo —
// ImovelDetailClient.tsx consome os dois sem distinção.
export function lancamentoParaDetalhe(l: LancamentoManual) {
  return {
    id: l.id,
    name: l.name,
    developer: l.developer,
    developer_logo: '/lancamentos-manuais/elev-saude/logo.webp',
    developer_website: l.developerWebsite,
    min_price: null,
    max_price: null,
    bedrooms_min: l.bedroomsMin,
    bedrooms_max: l.bedroomsMax,
    area_min: l.areaMin,
    area_max: l.areaMax,
    bathrooms_min: l.bathroomsMin,
    bathrooms_max: l.bathroomsMax,
    vagas_min: 0,
    vagas_max: 0,
    neighborhood: l.neighborhood,
    city: l.city,
    state: l.state,
    zipcode: '',
    address_full: [l.street, l.number, l.neighborhood, l.city].filter(Boolean).join(', '),
    latitude: l.lat,
    longitude: l.lng,
    status: l.status,
    delivery_date: l.deliveryDate,
    launch_date: l.launchDate,
    total_units: l.totalUnits,
    stock: l.totalUnits,
    number_of_floors: null,
    number_of_towers: null,
    virtual_tour: null,
    finality: 'Residencial',
    description: l.description,
    photos: l.photos,
    blueprints: l.blueprints,
    amenities: l.amenities,
    typologies: l.typologies.map(t => ({
      type: t.type,
      bedrooms: t.bedrooms,
      bathrooms: t.bathrooms,
      vagas: 0,
      suites: t.suites,
      area: `${t.area}`,
      private_area: `${t.area}`,
      total_area: '',
      price: 'Consultar',
      stock: null,
      total_units: null,
      photo: null,
      blueprint: l.blueprints.find(bp => bp.name.includes(`${t.area}`))?.url ?? null,
    })),
    sharing_url: l.oruloUrl,
    promocoes: [],
    campanhaOrulo: null,
  };
}
