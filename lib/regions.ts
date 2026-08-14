/**
 * lib/regions.ts
 * Agrupamento de bairros de São Paulo por região (zona), para as páginas /regiao/[slug].
 * A lista de bairros por zona espelha o agrupamento já usado em lib/sp-neighborhoods.ts.
 */

export interface Region {
  slug: string;
  name: string;
  /** Preposição para uso em frases: "na Zona Sul" (na) vs "no Centro" (no) vs "em Campinas" (em). */
  article: 'na' | 'no' | 'em';
  city: string;
  state: string;
  /** Nomes de bairro "bonitos" (com acento), como aparecem tipicamente no catálogo da Orulo. Vazio quando a região filtra por cidade (ver `cities`). */
  neighborhoods: string[];
  /** Quando definido, a região agrupa municípios inteiros (ex: ABC Paulista) em vez de bairros de um único município. */
  cities?: string[];
}

export const REGIONS: Region[] = [
  {
    slug: 'zona-sul-sp',
    name: 'Zona Sul',
    article: 'na',
    city: 'São Paulo',
    state: 'SP',
    neighborhoods: [
      'Moema', 'Itaim Bibi', 'Brooklin', 'Campo Belo', 'Vila Mariana', 'Chácara Klabin',
      'Saúde', 'Jabaquara', 'Ipiranga', 'Sacomã', 'Planalto Paulista', 'Mirandópolis',
      'Santo Amaro', 'Campo Grande', 'Morumbi', 'Vila Andrade', 'Interlagos', 'Socorro',
      'Granja Julieta', 'Real Parque', 'Panamby', 'Vila Nova Conceição', 'Vila Olímpia',
      'Vila Clementino', 'Jardim Ana Rosa', 'Campo Limpo', 'Capão Redondo', 'Jardim São Luís',
      'Cidade Ademar', 'Pedreira', 'Guarapiranga',
      'Jardins', 'Jardim Paulista', 'Jardim Paulistano', 'Jardim Europa', 'Jardim América', 'Jardim Botânico',
    ],
  },
  {
    slug: 'zona-oeste-sp',
    name: 'Zona Oeste',
    article: 'na',
    city: 'São Paulo',
    state: 'SP',
    neighborhoods: [
      'Pinheiros', 'Vila Madalena', 'Alto de Pinheiros', 'Perdizes', 'Pacaembu', 'Pompeia',
      'Lapa', 'Água Branca', 'Vila Leopoldina', 'Butantã', 'Vila Romana', 'Raposo Tavares',
      'Jardim Bonfiglioli', 'Vila São Francisco', 'Vila Sônia',
    ],
  },
  {
    slug: 'zona-norte-sp',
    name: 'Zona Norte',
    article: 'na',
    city: 'São Paulo',
    state: 'SP',
    neighborhoods: [
      'Santana', 'Casa Verde', 'Mandaqui', 'Tucuruvi', 'Jaçanã', 'Tremembé', 'Pirituba',
      'Freguesia do Ó', 'Vila Guilherme', 'Cantareira',
    ],
  },
  {
    slug: 'zona-leste-sp',
    name: 'Zona Leste',
    article: 'na',
    city: 'São Paulo',
    state: 'SP',
    neighborhoods: [
      'Tatuapé', 'Penha', 'Belém', 'Brás', 'Mooca', 'Água Rasa', 'Vila Matilde', 'Vila Formosa',
      'Aricanduva', 'Anália Franco', 'Vila Prudente', 'Sapopemba', 'Vila Esperança',
      'São Miguel Paulista', 'Itaim Paulista', 'Ponte Rasa', 'Engenheiro Goulart',
      'Ermelino Matarazzo', 'José Bonifácio', 'Parque do Carmo', 'Parque das Nações',
    ],
  },
  {
    slug: 'centro-sp',
    name: 'Centro',
    article: 'no',
    city: 'São Paulo',
    state: 'SP',
    neighborhoods: [
      'Centro', 'República', 'Bela Vista', 'Liberdade', 'Cambuci', 'Consolação',
      'Santa Cecília', 'Higienópolis', 'Bom Retiro', 'Cerqueira César', 'Luz', 'Pari',
      'Barra Funda', 'Aclimação', 'Paraíso', 'Limão', 'Sumaré', 'Carandiru',
    ],
  },
  {
    slug: 'grande-sao-paulo',
    name: 'Grande São Paulo',
    article: 'na',
    city: '',
    state: 'SP',
    neighborhoods: [],
    cities: [
      // ABC — 4 principais
      'Santo André', 'São Bernardo do Campo', 'São Caetano do Sul', 'Diadema',
      // Osasco e região oeste
      'Osasco', 'Barueri', 'Taboão da Serra', 'Santana de Parnaíba',
      // Guarulhos
      'Guarulhos',
    ],
  },
  {
    slug: 'campinas-e-regiao',
    name: 'Região de Campinas',
    article: 'na',
    city: '',
    state: 'SP',
    neighborhoods: [],
    cities: [
      'Campinas', 'Hortolândia', 'Americana', 'Paulínia', 'Valinhos',
      "Santa Bárbara D'Oeste",
    ],
  },
  {
    slug: 'santa-catarina',
    name: 'Santa Catarina',
    article: 'em',
    city: '',
    state: 'SC',
    neighborhoods: [],
    cities: ['Itapema', 'Porto Belo', 'Balneário Camboriú', 'Itajaí', 'Bombinhas', 'Florianópolis'],
  },
  {
    slug: 'curitiba',
    name: 'Curitiba',
    article: 'em',
    city: 'Curitiba',
    state: 'PR',
    neighborhoods: [],
  },
  {
    slug: 'rio-grande-do-sul',
    name: 'Rio Grande do Sul',
    article: 'no',
    city: '',
    state: 'RS',
    neighborhoods: [],
    cities: ['Porto Alegre', 'Capão da Canoa'],
  },
  {
    slug: 'rio-de-janeiro',
    name: 'Rio de Janeiro',
    article: 'no',
    city: 'Rio de Janeiro',
    state: 'RJ',
    neighborhoods: [],
  },
];

export function slugToRegion(slug: string): Region | null {
  return REGIONS.find(r => r.slug === slug) ?? null;
}

