/**
 * lib/lancamentos-manuais.ts
 *
 * Empreendimentos cadastrados manualmente, fora do fluxo normal da Orulo —
 * usado quando um lançamento (ou "breve lançamento") já existe (site da própria incorporadora
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
import { LOGOS_MANUAIS } from './construtora-logos-manuais';
import { construtoraToSlug } from './construtora-nomes';

export interface LancamentoManual {
  id: string;
  name: string;
  developer: string;
  developerWebsite: string;
  /** Logo da submarca do empreendimento (ex.: "Elev"), quando existir — mostrado
   * em destaque na ficha, com o logo da construtora em segundo plano. */
  productLogo?: string;
  neighborhood: string;
  street: string;
  number: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  /** Estação de metrô/trem mais próxima, quando vale destacar (ex.: card da home). */
  nearbyMetro?: { name: string; distanceMeters: number };
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
    description: string;
    /** Enquadramento da unidade (ex.: ["HIS 2"] ou ["R2V"]), quando aplicável — muda faixa/regra de financiamento. */
    programs?: string[];
    /** Menor preço de venda desta tipologia ("a partir de"), em reais — sem valor de avaliação. */
    priceFrom?: number;
    /** Quantidade de unidades desta tipologia na tabela de lançamento. */
    units?: number;
  }[];
  blueprints: { name: string; url: string; area: number }[];
  numberOfTowers: number | null;
  numberOfFloors: number | null;
}

/** Menor preço de venda ("a partir de") entre as tipologias com preço publicado, ou null se ainda não há tabela. */
export function precoAPartirDe(l: LancamentoManual): number | null {
  const precos = l.typologies.map(t => t.priceFrom).filter((p): p is number => !!p && p >= 100);
  return precos.length ? Math.min(...precos) : null;
}

export const LANCAMENTOS_MANUAIS: LancamentoManual[] = [
  {
    id: 'elev-saude',
    name: 'Elev Saúde',
    developer: 'Trisul',
    developerWebsite: 'https://www.trisul-sa.com.br/apartamentos/sao-paulo/conceicao/elev-saude',
    // Logo real da submarca "Elev Saúde" (baixado do CDN público da Trisul) —
    // pedido do usuário: mostrar essa marca em destaque, igual ao site
    // oficial, com o logo da Trisul menor ao lado (auditoria 2026-09).
    productLogo: '/lancamentos-manuais/elev-saude/logo.webp',
    neighborhood: 'Saúde',
    street: 'Avenida Miguel Estefno',
    number: '72',
    city: 'São Paulo',
    state: 'SP',
    lat: -23.6196879,
    lng: -46.6386451,
    nearbyMetro: { name: 'Saúde', distanceMeters: 50 },
    deliveryDate: '30/09/2029',
    launchDate: '25/09/2026',
    status: 'Lançamento',
    bedroomsMin: 1,
    bedroomsMax: 2,
    areaMin: 25,
    areaMax: 37,
    bathroomsMin: 1,
    bathroomsMax: 2,
    totalUnits: 571,
    updatedAt: '2026-09-25',
    oruloUrl: 'https://www.orulo.com.br/buildings/85509',
    heroPhoto: '/lancamentos-manuais/elev-saude/fachada.webp',
    // Galeria completa (auditoria 2026-09) — usuário notou 1 foto duplicada
    // (voo-piscinas/lazer-piscina eram o mesmo arquivo, removido) e reportou
    // que a Orulo mostra 19 fotos contra as 11 daqui. Conferindo direto no
    // hotsite oficial (meuelev.com.br/apartamentos/elev-saude, o mesmo link
    // que "Acesse o Hotsite" leva a partir do site institucional da Trisul)
    // a galeria "Áreas Comuns" tem 18 fotos + fachada + portaria = 20 únicas.
    // Baixadas do CDN público da Trisul (trisul-elev-prod-back.s3...), não
    // da área logada da Orulo.
    photos: [
      '/lancamentos-manuais/elev-saude/fachada.webp',
      '/lancamentos-manuais/elev-saude/portaria.webp',
      '/lancamentos-manuais/elev-saude/hall.webp',
      '/lancamentos-manuais/elev-saude/voo-piscinas.webp',
      '/lancamentos-manuais/elev-saude/piscina-interna.webp',
      '/lancamentos-manuais/elev-saude/churrasqueira-rooftop.webp',
      '/lancamentos-manuais/elev-saude/salao-festas.webp',
      '/lancamentos-manuais/elev-saude/fitness.webp',
      '/lancamentos-manuais/elev-saude/pista-corrida.webp',
      '/lancamentos-manuais/elev-saude/quadra-gramada.webp',
      '/lancamentos-manuais/elev-saude/playground-redario.webp',
      '/lancamentos-manuais/elev-saude/espaco-pet-pomar.webp',
      '/lancamentos-manuais/elev-saude/pet-care.webp',
      '/lancamentos-manuais/elev-saude/brinquedoteca.webp',
      '/lancamentos-manuais/elev-saude/coworking.webp',
      '/lancamentos-manuais/elev-saude/praca-coworking.webp',
      '/lancamentos-manuais/elev-saude/lavanderia.webp',
      '/lancamentos-manuais/elev-saude/mini-mercado.webp',
      '/lancamentos-manuais/elev-saude/delivery.webp',
      '/lancamentos-manuais/elev-saude/bicicletario.webp',
    ],
    description: 'O Elev Saúde nasce em um endereço onde a mobilidade aproxima muito mais do que destinos — a 1 minuto do Metrô Saúde, com acesso a avenidas importantes e toda a infraestrutura da região (escolas, universidades, mercados e farmácias). Empreendimento com 2 torres, 17 andares e lazer completo.',
    amenities: [
      'Delivery', 'Fitness', 'Pet Care', 'Lavanderia Coletiva', 'Coworking',
      'Praça Coworking', 'Minimercado', 'Brinquedoteca', 'Salão de Festas',
      'Piscina Adulto', 'Piscina Coberta', 'Piscina Infantil', 'Solário',
      'Boulevard', 'Redário', 'Espaço Pet', 'Pomar', 'Quadra Gramada',
      'Pista de Corrida', 'Playground', 'Bicicletário', 'Churrasqueira',
      'Terraço Descoberto (Rooftop)',
    ],
    // As 3 plantas reais do Elev Saúde, confirmadas direto na base da Trisul
    // (auditoria 2026-09) — o usuário achou uma "planta de 40m²" olhando o
    // site, mas essa é de um empreendimento parecido e vizinho na lista de
    // "similares" (Elev Ipiranga), não deste aqui. 25m²: unidade-suíte (o
    // único dormitório é a própria suíte, sem cômodo "quarto" separado).
    //
    // Tabela de lançamento de 25/09/2026 (valores "a partir de", só preço de
    // venda — o valor de avaliação da tabela NÃO é exibido). A planta de 25m²
    // tem dois enquadramentos: HIS 2 (274 unid.) e R2V (74 unid.).
    typologies: [
      { type: 'Apartamento', bedrooms: 1, area: 25, bathrooms: 1, suites: 1, description: '1 suíte com varanda', programs: ['HIS 2'], priceFrom: 269000, units: 274 },
      { type: 'Apartamento', bedrooms: 1, area: 25, bathrooms: 1, suites: 1, description: '1 suíte com varanda', programs: ['R2V'], priceFrom: 317000, units: 74 },
      { type: 'Apartamento', bedrooms: 2, area: 34, bathrooms: 1, suites: 0, description: '2 dorms. com varanda', programs: ['R2V'], priceFrom: 346000, units: 153 },
      { type: 'Apartamento', bedrooms: 2, area: 37, bathrooms: 2, suites: 1, description: '2 dorms com suíte e varanda', programs: ['R2V'], priceFrom: 420000, units: 70 },
    ],
    blueprints: [
      { name: 'Planta 01 — 25m² (1 suíte)', url: '/lancamentos-manuais/elev-saude/planta-25m2.webp', area: 25 },
      { name: 'Planta 02 — 34m² (2 dorms)', url: '/lancamentos-manuais/elev-saude/planta-34m2.webp', area: 34 },
      { name: 'Planta 03 — 37m² (2 dorms + suíte)', url: '/lancamentos-manuais/elev-saude/planta-37m2.webp', area: 37 },
    ],
    numberOfTowers: 2,
    numberOfFloors: 17,
  },
];

// Logo da CONSTRUTORA (Trisul), não do produto/linha (Elev) — mesmo lookup
// já usado em construtoras-catalogo.ts. Erro corrigido: a primeira versão
// usava o logo "elev" (marca do empreendimento) como se fosse o logo da
// Trisul (auditoria 2026-09, apontado pelo usuário).
function logoDaConstrutora(nomeDeveloper: string): string | null {
  return LOGOS_MANUAIS[construtoraToSlug(nomeDeveloper)] ?? null;
}

export function getLancamentoManual(id: string): LancamentoManual | undefined {
  return LANCAMENTOS_MANUAIS.find(l => l.id === id);
}

// ── Projeção pro formato do catálogo (listagens, busca, mapa) ────────────────
export function lancamentoParaCatalogo(l: LancamentoManual): CatalogEntry {
  return {
    id: l.id,
    name: l.name,
    developer: l.developer,
    developer_logo: logoDaConstrutora(l.developer),
    developer_website: l.developerWebsite,
    // CatalogEntry.min_price/max_price são tipados como `number` (não
    // `number | null`) por um detalhe de inferência em normalizeBuilding()
    // — na prática já existem imóveis reais "breve lançamento" sem preço
    // (ver lib/filtro-breve-lancamento.ts), então null é o valor certo,
    // só não o tipo mais preciso que o resto do catálogo já usa.
    // "A partir de": só o menor preço; max_price fica vazio de propósito pra
    // nenhuma tela mostrar "X até Y" (a tabela publica só o menor de cada tipologia).
    min_price: precoAPartirDe(l) as unknown as number,
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
      price_min: precoAPartirDe(l), price_max: null,
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
    developer_logo: logoDaConstrutora(l.developer),
    // Logo da submarca (ex.: "Elev"), quando existir — ImovelDetailClient.tsx
    // mostra essa em destaque e o developer_logo pequeno ao lado, igual ao
    // site oficial da incorporadora.
    product_logo: l.productLogo ?? null,
    developer_website: l.developerWebsite,
    min_price: precoAPartirDe(l),
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
    number_of_floors: l.numberOfFloors,
    number_of_towers: l.numberOfTowers,
    virtual_tour: null,
    finality: 'Residencial',
    description: l.description,
    photos: l.photos,
    blueprints: l.blueprints,
    amenities: l.amenities,
    typologies: l.typologies.map(t => ({
      // Enquadramento junto do nome (ex.: "Apartamento · HIS 2") — é o que
      // diferencia as duas unidades de 25m² (HIS 2 x R2V) nos cards.
      type: t.programs?.length ? `${t.type} · ${t.programs.join(' + ')}` : t.type,
      bedrooms: t.bedrooms,
      bathrooms: t.bathrooms,
      vagas: 0,
      suites: t.suites,
      area: `${t.area}`,
      private_area: `${t.area}`,
      total_area: '',
      price: t.priceFrom ? `A partir de ${t.priceFrom.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}` : 'Consultar',
      stock: null,
      total_units: t.units ?? null,
      photo: null,
      // Match exato pela área (cada planta tem a área certa cadastrada) —
      // antes usava .includes() no nome, frágil se o texto do nome mudasse.
      blueprint: l.blueprints.find(bp => bp.area === t.area)?.url ?? null,
    })),
    sharing_url: l.oruloUrl,
    promocoes: [],
    campanhaOrulo: null,
  };
}
