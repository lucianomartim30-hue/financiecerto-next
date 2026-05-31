/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState, useRef, useMemo, useCallback, Suspense, useDeferredValue } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { formatBRL } from '@/lib/calculos';
import type { MapViewHandle, Bounds } from '@/components/MapView';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Lista estática de bairros de São Paulo (para autocomplete completo) ───────
const SP_BAIRROS: string[] = [
  // Centro / Centro Expandido
  'Bela Vista','Bom Retiro','Brás','Cambuci','Consolação','Higienópolis',
  'Liberdade','República','Santa Cecília','Sé','Luz','Pari','Barra Funda',
  'Aclimação','Paraíso','Sumaré','Cerqueira César','Carandiru','Limão',
  // Zona Oeste
  'Pinheiros','Vila Madalena','Alto de Pinheiros','Perdizes','Pacaembú',
  'Pompeia','Lapa','Água Branca','Vila Leopoldina','Butantã','Vila Romana',
  'Raposo Tavares','Jardim Bonfiglioli','Vila São Francisco','Vila Sônia',
  'Jaguaré','Jardim Boa Vista','Perus','Real Parque',
  // Zona Sul
  'Moema','Itaim Bibi','Brooklin','Campo Belo','Vila Mariana','Chácara Klabin',
  'Saúde','Jabaquara','Ipiranga','Sacomã','Planalto Paulista','Mirandópolis',
  'Santo Amaro','Campo Grande','Morumbi','Vila Andrade','Interlagos','Socorro',
  'Granja Julieta','Vila Nova Conceição','Vila Olímpia','Vila Clementino',
  'Jardim Ana Rosa','Campo Limpo','Capão Redondo','Jardim São Luís',
  'Cidade Ademar','Pedreira','Guarapiranga','Americanópolis','Água Funda',
  'Jardim das Imbuias','Cidade Dutra','Grajaú','Parque do Carmo',
  // Jardins
  'Jardins','Jardim Paulista','Jardim Paulistano','Jardim Europa',
  'Jardim América','Jardim Botânico',
  // Zona Norte
  'Santana','Casa Verde','Mandaqui','Tucuruvi','Jaçanã','Tremembé',
  'Pirituba','Freguesia do Ó','Vila Guilherme','Cantareira','Brasilândia',
  'Lajeado','Horto Florestal','Cangaíba','Vila Medeiros','Vila Mazzei',
  'Jaçanã','Parque Edu Chaves','Imirim','Lauzane Paulista',
  // Zona Leste
  'Tatuapé','Penha','Belém','Mooca','Água Rasa','Vila Matilde',
  'Vila Formosa','Aricanduva','Anália Franco','Vila Prudente','Sapopemba',
  'São Miguel Paulista','Itaim Paulista','Ponte Rasa','Engenheiro Goulart',
  'Ermelino Matarazzo','José Bonifácio','Parque do Carmo','Penha de França',
  'Vila Carrão','Vila Constância','Artur Alvim','Cidade Patriarca',
  'Guaianases','Itaquera','José Bonifácio','Parque São Lucas',
  'São Mateus','Vila Jacuí','Iguatemi','Jardim Anália Franco',
  // Grande SP
  'Alphaville','Barueri','Osasco','Guarulhos','São Caetano do Sul',
  'Santo André','São Bernardo do Campo','Diadema','Mauá','Carapicuíba',
  'Cotia','Embu das Artes','Granja Viana','Taboão da Serra',
  'Poá','Ribeirão Pires','Suzano','Ferraz de Vasconcelos',
  'Santana de Parnaíba','Itaquaquecetuba','Mogi das Cruzes',
  'Jandira','Itapevi','Vargem Grande Paulista',
];

// Normaliza string para comparação: minúsculo, sem acentos
function normStr(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/g, '');
}

interface Imovel {
  id: string; name: string; developer: string;
  min_price: number | null; max_price: number | null;
  bedrooms_min: number | null; bedrooms_max: number | null;
  bathrooms_min: number | null; bathrooms_max: number | null;
  vagas_min: number | null; vagas_max: number | null;
  area_min: number | null; area_max: number | null;
  neighborhood: string; city: string; photo: string | null;
  address_full?: string; street?: string;
  status: string; status_norm: string;
  finality?: string; finality_norm?: string;
  lat: number | null; lng: number | null;
  delivery_date: string | null;
}

// Calcula finality no cliente — lê finality_norm se disponível,
// senão calcula do campo finality bruto e, como último recurso, infere pelo nome.
// Necessário porque o KV cache pode ter sido gerado antes do campo ser adicionado.
function getEffectiveFinality(b: Imovel): string {
  const norm = b.finality_norm || '';
  if (norm === 'residencial' || norm === 'comercial') return norm;

  // Tenta calcular a partir do campo bruto
  const raw = (b.finality || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  if (raw.includes('residencial') || raw === 'residential') return 'residencial';
  if (
    raw.includes('comercial') || raw.includes('loja') || raw === 'commercial' ||
    raw.includes('nr') || raw.includes('nao residencial') || raw.includes('misto')
  ) return 'comercial';

  // Último recurso: inferir pelo nome (cobre cache gerado antes de finality ser adicionado)
  const t = `${b.name} ${b.developer || ''}`.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (
    t.includes('sala comercial') || t.includes('salas comerciais') ||
    t.includes('sala de escritorio') || t.includes('salas de escritorio') ||
    t.includes('escritorio') ||
    /\bloja\b/.test(t) || /\blojas\b/.test(t) ||
    /\boffice\b/.test(t) ||
    t.includes('centro empresarial') || t.includes('centro comercial') ||
    t.includes('torre comercial') || t.includes('torres comerciais') ||
    t.includes('nao residencial') ||
    /\bnr\b/.test(t) ||
    t.includes('laje corporativa') || t.includes('corporate')
  ) return 'comercial';

  return ''; // vazio → tratado como residencial no filtro
}

const STATUS_CFG: Record<string, { cor: string; label: string }> = {
  'na planta': { cor: '#2563eb', label: 'Na Planta' },
  'em obras':  { cor: '#d97706', label: 'Em Obras'  },
  'pronto':    { cor: '#16a34a', label: 'Pronto'    },
};
function getStatus(s: string) {
  const k = (s || '').toLowerCase()
    .replace(/[áàãâ]/g,'a').replace(/[éèê]/g,'e').replace(/[óòõô]/g,'o').replace(/[úùû]/g,'u').replace(/ç/g,'c')
    .trim();
  if (STATUS_CFG[k]) return STATUS_CFG[k];
  if (k.includes('planta') || k.includes('lanca') || k.includes('lancamento')) return STATUS_CFG['na planta'];
  if (k.includes('obra') || k.includes('constru') || k.includes('andamento'))  return STATUS_CFG['em obras'];
  if (k.includes('pronto') || k.includes('entreg') || k.includes('conclui') || k === 'novo') return STATUS_CFG['pronto'];
  return { cor: '#475569', label: s || 'Outros' };
}
function fmtRange(min: number | null, max: number | null, unit: string) {
  if (!min) return null;
  if (max && max !== min) return `${min}–${max} ${unit}`;
  return `${min} ${unit}`;
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function ImovelCard({ im }: { im: Imovel }) {
  const sc = getStatus(im.status_norm || im.status || '');
  return (
    <Link href={`/imoveis/${im.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px',
        overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
        onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.boxShadow = '0 4px 18px rgba(37,99,235,.13)'; d.style.borderColor = 'rgba(37,99,235,.35)'; }}
        onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.boxShadow = ''; d.style.borderColor = 'var(--border)'; }}
      >
        <div style={{ width: '100%', height: '120px', background: '#E2E8F0', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          {im.photo
            ? <img src={im.photo} alt={im.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { const t = e.currentTarget; t.style.display = 'none'; const p = t.parentElement; if (p) { p.style.display = 'flex'; p.style.alignItems = 'center'; p.style.justifyContent = 'center'; p.innerHTML = '<span style="font-size:28px;color:#94a3b8">🏢</span>'; } }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: '#94a3b8' }}>🏢</div>
          }
          <span style={{ position: 'absolute', top: '7px', left: '7px', background: sc.cor, color: '#fff', fontSize: '9px', fontWeight: '800', padding: '3px 7px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            {sc.label}
          </span>
        </div>
        <div style={{ padding: '9px 10px 11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text)', lineHeight: '1.35', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{im.name}</p>
          {im.developer && <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{im.developer}</p>}
          <p style={{ fontSize: '10px', color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            📍 {[im.neighborhood || im.city, im.street].filter(Boolean).join(' · ')}
          </p>
          <p style={{ fontSize: '13px', fontWeight: '900', color: 'var(--primary)', marginTop: '2px' }}>{im.min_price ? formatBRL(im.min_price) : 'Consultar'}</p>
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '2px' }}>
            {fmtRange(im.bedrooms_min, im.bedrooms_max, 'qts') && <span style={{ fontSize: '9px', color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '5px', padding: '1px 4px' }}>🛏 {fmtRange(im.bedrooms_min, im.bedrooms_max, 'qts')}</span>}
            {im.area_min && <span style={{ fontSize: '9px', color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '5px', padding: '1px 4px' }}>▦ {im.area_min}m²</span>}
            {fmtRange(im.vagas_min, im.vagas_max, 'vg') && <span style={{ fontSize: '9px', color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '5px', padding: '1px 4px' }}>🅿 {fmtRange(im.vagas_min, im.vagas_max, 'vg')}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '120px', background: 'var(--border)' }} />
      <div style={{ padding: '9px 10px 11px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {[80, 55, 45, 65].map((w, i) => <div key={i} style={{ height: i === 2 ? '13px' : '8px', width: `${w}%`, background: 'var(--border)', borderRadius: '5px' }} />)}
      </div>
    </div>
  );
}

function NumSelector({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>{label}</p>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0, 1, 2, 3, 4].map(n => {
          const on = value === n && n > 0;
          return <button key={n} onClick={() => onChange(on ? 0 : n)} style={{ width: '40px', height: '40px', borderRadius: '8px', border: `1.5px solid ${on ? 'var(--primary)' : 'var(--border)'}`, background: on ? 'var(--primary-light)' : '#fff', color: on ? 'var(--primary)' : 'var(--text-muted)', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>{n === 0 ? '∞' : n === 4 ? '4+' : n}</button>;
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function ImoveisContent() {
  const searchParams = useSearchParams();

  const [allBuildings, setAllBuildings] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(12);

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  const [filterStatus,   setFilterStatus]   = useState(searchParams.get('status') || '');
  const [filterFinality, setFilterFinality] = useState(searchParams.get('tipo') || '');
  const [filterMin,      setFilterMin]      = useState(Number(searchParams.get('min') || 0));
  const [filterMax,      setFilterMax]      = useState(Number(searchParams.get('max') || 0));
  const [filterBedrooms, setFilterBedrooms] = useState(0);
  const [filterVagas,    setFilterVagas]    = useState(0);
  const [filterBaths,    setFilterBaths]    = useState(0);
  const [filterAreaMin,  setFilterAreaMin]  = useState(0);
  const [filterAreaMax,  setFilterAreaMax]  = useState(0);

  // Localização buscada (texto commitado — filtra cards + mapa)
  const [activeLocation, setActiveLocation] = useState(searchParams.get('q') || '');

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [geocoding, setGeocoding] = useState(false);
  const [minInput, setMinInput] = useState('');
  const [maxInput, setMaxInput] = useState('');
  const [areaMinInput, setAreaMinInput] = useState('');
  const [areaMaxInput, setAreaMaxInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Bounds debounçados: o mapa atualiza a cada pan, mas os cards só re-filtram 350ms depois
  const [debouncedBounds, setDebouncedBounds] = useState<Bounds | null>(null);
  const boundsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleBoundsChange = useCallback((b: Bounds) => {
    if (boundsTimer.current) clearTimeout(boundsTimer.current);
    // Mobile precisa de debounce maior para não re-renderizar durante o pan
    boundsTimer.current = setTimeout(() => setDebouncedBounds(b), isMobile ? 600 : 350);
  }, [isMobile]);

  const mapRef          = useRef<MapViewHandle>(null);
  const inputRef        = useRef<HTMLInputElement>(null);
  const mobileInputRef  = useRef<HTMLInputElement>(null);

  // Adiado: sugestões de autocomplete não bloqueiam a digitação
  const deferredSearch = useDeferredValue(search);

  // Modal de busca full-screen (mobile)
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [mobileSearchInput, setMobileSearchInput] = useState('');
  const deferredMobileInput = useDeferredValue(mobileSearchInput);

  // Detectar mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fechar autocomplete ao clicar fora da filter bar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!searchRef.current || !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Atualiza sugestões ao digitar
  // Mescla lista estática completa + bairros do catálogo (para mostrar todos, não só os com imóveis)
  const allNeighborhoods = useMemo(() => {
    const fromCatalog = allBuildings.map(b => b.neighborhood).filter(Boolean);
    const merged = new Map<string, boolean>(); // key=normStr → has catalog properties
    SP_BAIRROS.forEach(nb => merged.set(normStr(nb), false));
    fromCatalog.forEach(nb => {
      const k = normStr(nb);
      merged.set(k, true);        // marca como "tem imóveis"
    });
    // Monta lista final com o nome canônico: prefere o do catálogo (já com capitalização real)
    const catalogByNorm = new Map(fromCatalog.map(nb => [normStr(nb), nb]));
    return [...merged.keys()].map(k => ({
      name: catalogByNorm.get(k) || SP_BAIRROS.find(nb => normStr(nb) === k) || k,
      hasCatalog: merged.get(k) ?? false,
    })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [allBuildings]);

  const filteredSuggestions = useMemo(() => {
    if (!deferredSearch.trim()) return [] as { name: string; hasCatalog: boolean }[];
    const q = normStr(deferredSearch);
    return allNeighborhoods
      .filter(n => normStr(n.name).includes(q))
      .sort((a, b) => {
        // Bairros com imóveis no catálogo primeiro
        if (a.hasCatalog !== b.hasCatalog) return a.hasCatalog ? -1 : 1;
        // Começa com o termo → prioridade
        const aStarts = normStr(a.name).startsWith(q) ? 0 : 1;
        const bStarts = normStr(b.name).startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.name.localeCompare(b.name, 'pt-BR');
      })
      .slice(0, 10);
  }, [deferredSearch, allNeighborhoods]);

  // Sugestões para o modal mobile — quando vazio mostra bairros com imóveis
  const mobileSuggestions = useMemo(() => {
    const q = normStr(deferredMobileInput);
    const base = q
      ? allNeighborhoods.filter(n => normStr(n.name).includes(q))
      : allNeighborhoods.filter(n => n.hasCatalog);
    return base
      .sort((a, b) => {
        if (a.hasCatalog !== b.hasCatalog) return a.hasCatalog ? -1 : 1;
        if (q) {
          const aS = normStr(a.name).startsWith(q) ? 0 : 1;
          const bS = normStr(b.name).startsWith(q) ? 0 : 1;
          if (aS !== bS) return aS - bS;
        }
        return a.name.localeCompare(b.name, 'pt-BR');
      })
      .slice(0, 25);
  }, [deferredMobileInput, allNeighborhoods]);

  useEffect(() => {
    setLoading(true);
    fetch('/api/orulo?all=1')
      .then(r => r.json())
      .then(d => setAllBuildings(d.buildings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setDisplayCount(12); }, [activeLocation, filterStatus, filterFinality, filterMin, filterMax, filterBedrooms, filterVagas, filterBaths, filterAreaMin, filterAreaMax]);
  // Reseta paginação quando o mapa é movido (novos cards aparecem do início)
  useEffect(() => { if (!activeLocation) setDisplayCount(12); }, [debouncedBounds, activeLocation]);

  const baseFilter = useCallback((b: Imovel) => {
    // ── Filtro de localização (bairro / cidade digitado pelo usuário) ──────────
    if (activeLocation) {
      const q = normStr(activeLocation);
      const haystack = normStr(`${b.neighborhood} ${b.city} ${b.name}`);
      if (!haystack.includes(q)) return false;
    }
    if (filterMin      && (b.min_price    ?? 0)  < filterMin)     return false;
    if (filterMax      && (b.min_price    ?? 0)  > filterMax)     return false;
    if (filterBedrooms && (b.bedrooms_max ?? 99) < filterBedrooms) return false;
    if (filterVagas    && (b.vagas_max    ?? 99) < filterVagas)   return false;
    if (filterBaths    && (b.bathrooms_max ?? 99) < filterBaths)  return false;
    if (filterAreaMin  && (b.area_max     ?? 0)  < filterAreaMin) return false;
    if (filterAreaMax  && (b.area_min     ?? 0)  > filterAreaMax) return false;
    if (filterStatus   && b.status_norm !== filterStatus)         return false;
    if (filterFinality) {
      const fn = getEffectiveFinality(b);
      const effectiveFn = fn === '' ? 'residencial' : fn;
      if (effectiveFn !== filterFinality) return false;
    }
    return true;
  }, [activeLocation, filterMin, filterMax, filterBedrooms, filterVagas, filterBaths, filterAreaMin, filterAreaMax, filterStatus, filterFinality]);

  // Conta quantos imóveis existem para cada tipo de finalidade no catálogo
  const finalityCounts = useMemo(() => {
    const counts: Record<string, number> = { residencial: 0, comercial: 0 };
    allBuildings.forEach(b => {
      const fn = getEffectiveFinality(b) || 'residencial';
      if (fn in counts) counts[fn]++;
    });
    return counts;
  }, [allBuildings]);

  // Pins do mapa: mostra só os do viewport atual (performance — evita centenas de DOM nodes)
  // Quando há busca de localização, baseFilter já restringe o conjunto (normalmente <30 pins).
  // Sem localização: no mobile limitamos a 50 pins para evitar travamento (criar 300 elementos
  // DOM de uma vez congela o thread principal no mobile).
  const mapPins = useMemo(() => {
    const toPin = (b: Imovel) => ({ id: b.id, lat: b.lat!, lng: b.lng!, name: b.name, price: b.min_price ? formatBRL(b.min_price) : 'Consultar', neighborhood: b.neighborhood, status: b.status_norm || b.status });
    const filtered = allBuildings.filter(b => b.lat && b.lng).filter(baseFilter);

    // Com localização buscada → mostra todos os pins do bairro (normalmente poucos)
    if (activeLocation) {
      return filtered.map(toPin);
    }

    // Sem localização: aplica cap mais apertado no mobile
    const cap = isMobile ? 50 : 300;

    // Distribui cap entre os 3 status → garante bolinhas das 3 cores no mapa
    function mixStatus(list: Imovel[]): Imovel[] {
      const st    = (b: Imovel) => (b.status_norm || b.status || '').toLowerCase();
      const pronto = list.filter(b => { const s = st(b); return s.includes('pronto') || s.includes('entreg') || s.includes('conclui'); });
      const obra   = list.filter(b => { const s = st(b); return s.includes('obra')   || s.includes('constru') || s.includes('andamento'); });
      const planta = list.filter(b => !pronto.includes(b) && !obra.includes(b));
      const perGrp = Math.ceil(cap / 3);
      return [...planta.slice(0, perGrp), ...obra.slice(0, perGrp), ...pronto.slice(0, perGrp)].slice(0, cap);
    }

    // Filtra pelo viewport atual + 20% de margem
    if (debouncedBounds) {
      const latPad = (debouncedBounds.ne_lat - debouncedBounds.sw_lat) * 0.2;
      const lngPad = (debouncedBounds.ne_lng - debouncedBounds.sw_lng) * 0.2;
      const viewport = filtered.filter(b =>
        b.lat! >= debouncedBounds.sw_lat - latPad && b.lat! <= debouncedBounds.ne_lat + latPad &&
        b.lng! >= debouncedBounds.sw_lng - lngPad && b.lng! <= debouncedBounds.ne_lng + lngPad
      );
      if (viewport.length > 0) return mixStatus(viewport).map(toPin);
    }
    return mixStatus(filtered).map(toPin);
  }, [allBuildings, baseFilter, activeLocation, debouncedBounds, isMobile]);

  // Cards: filtrados pelo viewport do mapa quando ele está visível.
  // - Com activeLocation: baseFilter já restringe ao bairro → sem filtro de bounds
  // - Mobile em lista: mapa não está visível → mostra todos os filtrados
  // - Desktop / mobile em mapa: filtra por bounds (cards = o que aparece no mapa)
  const visibleBuildings = useMemo(() => {
    const base = allBuildings.filter(baseFilter);

    if (activeLocation) return base; // bairro já filtra tudo
    if (isMobile && mobileView !== 'map') return base; // lista mobile sem mapa visível

    if (debouncedBounds) {
      const inView = base.filter(b =>
        b.lat && b.lng &&
        b.lat >= debouncedBounds.sw_lat && b.lat <= debouncedBounds.ne_lat &&
        b.lng >= debouncedBounds.sw_lng && b.lng <= debouncedBounds.ne_lng
      );
      if (inView.length > 0) return inView;
    }

    return base;
  }, [allBuildings, baseFilter, activeLocation, debouncedBounds, isMobile, mobileView]);

  const geocodeAndFly = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setShowSuggestions(false);

    // Commita a localização → filtra cards imediatamente
    setActiveLocation(query.trim());
    setDisplayCount(12);

    // 1. Tenta usar coordenadas de um imóvel do catálogo no mesmo bairro (instantâneo)
    const qNorm = normStr(query);
    const catalogMatch = allBuildings.find(b => b.lat && b.lng && normStr(b.neighborhood + ' ' + b.city).includes(qNorm));
    if (catalogMatch) {
      mapRef.current?.flyTo(catalogMatch.lat!, catalogMatch.lng!, 13);
      return;
    }

    // 2. Fallback: Nominatim (para bairros sem imóveis no catálogo)
    setGeocoding(true);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', São Paulo, Brasil')}&format=json&limit=3&countrycodes=br&accept-language=pt-BR`);
      const data = await r.json();
      if (data.length > 0) {
        mapRef.current?.flyTo(parseFloat(data[0].lat), parseFloat(data[0].lon), 13);
      }
    } catch { /* silencioso */ }
    finally { setGeocoding(false); }
  }, [allBuildings]);

  // Commit de busca a partir do modal mobile
  const commitMobileSearch = useCallback((name: string) => {
    setShowMobileSearch(false);
    setMobileSearchInput('');
    setSearch(name);
    geocodeAndFly(name);
  }, [geocodeAndFly]);

  const applyMais = useCallback(() => {
    setFilterMin(Number(minInput.replace(/\D/g, '')) || 0);
    setFilterMax(Number(maxInput.replace(/\D/g, '')) || 0);
    setFilterAreaMin(Number(areaMinInput.replace(/\D/g, '')) || 0);
    setFilterAreaMax(Number(areaMaxInput.replace(/\D/g, '')) || 0);
    setOpenDropdown(null);
  }, [minInput, maxInput, areaMinInput, areaMaxInput]);

  const clearAll = useCallback(() => {
    setActiveLocation(''); setSearch('');
    setFilterStatus(''); setFilterFinality(''); setFilterMin(0); setFilterMax(0);
    setFilterBedrooms(0); setFilterVagas(0); setFilterBaths(0);
    setFilterAreaMin(0); setFilterAreaMax(0);
    setMinInput(''); setMaxInput(''); setAreaMinInput(''); setAreaMaxInput('');
    setOpenDropdown(null);
  }, []);

  const openDrop = useCallback((name: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const maxW = name === 'mais' ? 270 : 220;
    // Cabe dentro da tela: garante margem de 8px nas bordas
    const dropWidth = Math.min(maxW, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.right - dropWidth, window.innerWidth - dropWidth - 8));
    setDropdownPos({ top: rect.bottom + 6, left });
    setOpenDropdown(prev => prev === name ? null : name);
  }, []);

  const hasFilters = !!(activeLocation || filterStatus || filterFinality || filterMin || filterMax || filterBedrooms || filterVagas || filterBaths || filterAreaMin || filterAreaMax);
  const maisCount = [filterBedrooms, filterVagas, filterBaths, filterMin, filterMax, filterAreaMin, filterAreaMax].filter(Boolean).length;

  const pillStyle = (active: boolean): React.CSSProperties => ({
    height: '36px', padding: '0 12px', borderRadius: '18px',
    border: `1.5px solid ${active ? '#60a5fa' : 'rgba(255,255,255,.2)'}`,
    background: active ? 'rgba(96,165,250,.15)' : 'rgba(255,255,255,.08)',
    color: active ? '#60a5fa' : 'rgba(255,255,255,.85)',
    fontSize: '13px', fontWeight: active ? '700' : '500',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
    whiteSpace: 'nowrap' as const, flexShrink: 0,
    transition: 'all 0.15s',
  });

  // ── Cards grid (compartilhado entre mobile e desktop) ──────────────────────
  const renderCards = (cols: number) => (
    <>
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '10px' }}>
          {Array.from({ length: cols * 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : visibleBuildings.length === 0 ? (
        <div style={{ padding: '60px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: '28px', marginBottom: '10px' }}>🔍</p>
          <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>Nenhum imóvel encontrado</p>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>Ajuste os filtros para ver mais resultados.</p>
          {hasFilters && <button onClick={clearAll} style={{ marginTop: '14px', padding: '10px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>Limpar filtros</button>}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '10px' }}>
            {visibleBuildings.slice(0, displayCount).map(im => <ImovelCard key={im.id} im={im} />)}
          </div>
          {visibleBuildings.length > displayCount && (
            <button onClick={() => setDisplayCount(c => c + 12)}
              style={{ width: '100%', marginTop: '12px', padding: '12px', background: 'var(--primary-light)', color: 'var(--primary)', border: '1.5px solid rgba(37,99,235,.2)', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              Ver mais {Math.min(12, visibleBuildings.length - displayCount)} imóveis
              <span style={{ color: '#9ca3af', fontWeight: '400', marginLeft: '6px' }}>({displayCount} / {visibleBuildings.length})</span>
            </button>
          )}
        </>
      )}
    </>
  );

  // ── Loading overlay (usado no mapa) ───────────────────────────────────────
  const renderLoadingOverlay = () => (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(241,245,249,.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 500, gap: '12px' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#64748b', fontSize: '13px' }}>Carregando imóveis...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: `calc(100vh - var(--header-h))`, background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ── Modal de busca full-screen (mobile) ─────────────────────────────── */}
      {showMobileSearch && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: '#fff', display: 'flex', flexDirection: 'column',
          paddingTop: 'env(safe-area-inset-top)',
        }}>
          {/* Cabeçalho do modal */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 14px', borderBottom: '1px solid #e5e7eb',
          }}>
            <button
              onClick={() => { setShowMobileSearch(false); setMobileSearchInput(''); }}
              style={{
                width: '38px', height: '38px', borderRadius: '50%',
                border: 'none', background: '#f3f4f6', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', color: '#374151', flexShrink: 0,
              }}
            >‹</button>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              background: '#f3f4f6', borderRadius: '10px',
              border: '1.5px solid #e5e7eb',
            }}>
              <span style={{ padding: '0 10px', fontSize: '15px', flexShrink: 0 }}>📍</span>
              <input
                ref={mobileInputRef}
                autoFocus
                type="search"
                inputMode="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={mobileSearchInput}
                onChange={e => setMobileSearchInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && mobileSearchInput.trim()) {
                    commitMobileSearch(mobileSearchInput.trim());
                  }
                  if (e.key === 'Escape') { setShowMobileSearch(false); setMobileSearchInput(''); }
                }}
                placeholder="Bairro ou cidade..."
                style={{
                  flex: 1, height: '46px', border: 'none', outline: 'none',
                  background: 'transparent',
                  fontSize: '16px', /* 16px evita zoom automático no iOS */
                  color: '#111827', fontFamily: 'inherit',
                }}
              />
              {mobileSearchInput ? (
                <button
                  onClick={() => { setMobileSearchInput(''); mobileInputRef.current?.focus(); }}
                  style={{ width: '40px', height: '46px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', fontSize: '20px', flexShrink: 0 }}
                >×</button>
              ) : null}
            </div>
          </div>

          {/* Lista de sugestões */}
          <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {!mobileSearchInput && (
              <div style={{ padding: '14px 16px 6px', fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Bairros com imóveis
              </div>
            )}
            {mobileSuggestions.map(nb => (
              <button
                key={nb.name}
                onClick={() => commitMobileSearch(nb.name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  width: '100%', padding: '14px 16px',
                  background: 'transparent', border: 'none',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: '#eff6ff', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '16px', flexShrink: 0,
                }}>📍</div>
                <span style={{ flex: 1, fontSize: '15px', color: '#111827', fontWeight: '500' }}>
                  {nb.name}
                </span>
                {nb.hasCatalog && (
                  <span style={{
                    fontSize: '10px', background: '#eff6ff', color: '#2563eb',
                    borderRadius: '5px', padding: '3px 7px', fontWeight: '700', flexShrink: 0,
                  }}>imóveis</span>
                )}
              </button>
            ))}
            {mobileSearchInput && mobileSuggestions.length === 0 && (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                Nenhum bairro encontrado
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Overlay: fecha dropdown ao clicar fora ──────────────────────────── */}
      {openDropdown && (
        <div onClick={() => setOpenDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 9000 }} />
      )}

      {/* ── Dropdown Estágio ────────────────────────────────────────────────── */}
      {openDropdown === 'status' && (
        <div style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,.15)', padding: '6px', zIndex: 9001, minWidth: '210px' }}>
          {[
            { val: '',          label: 'Todos os estágios' },
            { val: 'na planta', label: '📐 Na Planta' },
            { val: 'em obras',  label: '🏗 Em Obras' },
            { val: 'pronto',    label: '✅ Pronto / Novo' },
          ].map(({ val, label }) => (
            <button key={val} onClick={() => { setFilterStatus(val); setOpenDropdown(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', background: filterStatus === val ? 'var(--primary-light)' : 'transparent', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '14px', fontWeight: filterStatus === val ? '700' : '400', color: filterStatus === val ? 'var(--primary)' : '#374151', textAlign: 'left' }}>
              {filterStatus === val && <span style={{ color: 'var(--primary)', fontSize: '12px' }}>✓</span>}
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Dropdown Tipo ───────────────────────────────────────────────────── */}
      {openDropdown === 'tipo' && (
        <div style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,.15)', padding: '6px', zIndex: 9001, minWidth: '210px' }}>
          {[
            { val: '',            icon: '🏘', label: 'Todos os tipos', count: allBuildings.length },
            { val: 'residencial', icon: '🏠', label: 'Residencial',    count: finalityCounts.residencial },
            { val: 'comercial',   icon: '🏢', label: 'Comercial',      count: finalityCounts.comercial },
          ].map(({ val, icon, label, count }) => (
            <button key={val} onClick={() => { setFilterFinality(val); setOpenDropdown(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', background: filterFinality === val ? 'var(--primary-light)' : 'transparent', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '14px', fontWeight: filterFinality === val ? '700' : '400', color: filterFinality === val ? 'var(--primary)' : '#374151', textAlign: 'left' }}>
              {filterFinality === val && <span style={{ color: 'var(--primary)', fontSize: '12px' }}>✓</span>}
              <span>{icon}</span>
              <span style={{ flex: 1 }}>{label}</span>
              {val !== '' && count > 0 && <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '400' }}>{count}</span>}
            </button>
          ))}
        </div>
      )}

      {/* ── Dropdown Mais ───────────────────────────────────────────────────── */}
      {openDropdown === 'mais' && (
        <div style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,.15)', padding: '18px 16px 14px', zIndex: 9001, width: `${Math.min(270, typeof window !== 'undefined' ? window.innerWidth - 16 : 270)}px` }}>
          <NumSelector label="Quartos"   value={filterBedrooms} onChange={setFilterBedrooms} />
          <NumSelector label="Banheiros" value={filterBaths}    onChange={setFilterBaths} />
          <NumSelector label="Vagas"     value={filterVagas}    onChange={setFilterVagas} />
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>Preço (R$)</p>
            <input inputMode="numeric" placeholder="Mínimo" value={minInput} maxLength={10}
              onChange={e => setMinInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
              style={{ width: '100%', boxSizing: 'border-box', height: '38px', padding: '0 12px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', marginBottom: '6px' }} />
            <input inputMode="numeric" placeholder="Máximo" value={maxInput} maxLength={10}
              onChange={e => setMaxInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
              style={{ width: '100%', boxSizing: 'border-box', height: '38px', padding: '0 12px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>Área (m²)</p>
            <input inputMode="numeric" placeholder="Mínimo" value={areaMinInput} maxLength={6}
              onChange={e => setAreaMinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ width: '100%', boxSizing: 'border-box', height: '38px', padding: '0 12px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', marginBottom: '6px' }} />
            <input inputMode="numeric" placeholder="Máximo" value={areaMaxInput} maxLength={6}
              onChange={e => setAreaMaxInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ width: '100%', boxSizing: 'border-box', height: '38px', padding: '0 12px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={applyMais} style={{ flex: 1, height: '42px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>Aplicar</button>
            <button onClick={() => { setFilterBedrooms(0); setFilterBaths(0); setFilterVagas(0); setFilterMin(0); setFilterMax(0); setFilterAreaMin(0); setFilterAreaMax(0); setMinInput(''); setMaxInput(''); setAreaMinInput(''); setAreaMaxInput(''); }}
              style={{ height: '42px', padding: '0 14px', background: 'transparent', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>Limpar</button>
          </div>
        </div>
      )}

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div
        className="filter-bar"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', borderBottom: '1px solid rgba(255,255,255,.08)', padding: '8px 12px', display: 'flex', gap: '7px', alignItems: 'center', flexShrink: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
      >
        {/* Busca: botão que abre modal no mobile / input inline no desktop */}
        <div ref={searchRef} style={{ position: 'relative', display: 'flex', flexShrink: 0 }}>
          {isMobile ? (
            /* Mobile: botão tap-to-search que abre modal full-screen */
            <button
              onClick={() => setShowMobileSearch(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                height: '34px', padding: '0 10px',
                background: 'rgba(255,255,255,.1)', border: '1.5px solid rgba(255,255,255,.2)', borderRadius: '8px',
                cursor: 'pointer', fontSize: '13px',
                color: search ? '#fff' : 'rgba(255,255,255,.6)',
                width: 'min(200px, calc(50vw - 40px))', overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <span style={{ flexShrink: 0 }}>📍</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
                {search || 'Buscar bairro...'}
              </span>
            </button>
          ) : (
            /* Desktop: input com autocomplete inline */
            <>
              <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid rgba(255,255,255,.2)' }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', pointerEvents: 'none' }}>📍</span>
                  <input
                    type="text" value={search}
                    onChange={e => { setSearch(e.target.value); setShowSuggestions(true); if (!e.target.value) setActiveLocation(''); }}
                    placeholder="Bairro ou cidade"
                    onKeyDown={e => {
                      if (e.key === 'Enter') { inputRef.current?.blur(); geocodeAndFly(search); }
                      if (e.key === 'Escape') { setShowSuggestions(false); inputRef.current?.blur(); }
                    }}
                    onFocus={e => { e.currentTarget.style.background = 'rgba(255,255,255,.15)'; setShowSuggestions(true); }}
                    onBlur={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; }}
                    ref={inputRef}
                    style={{ width: '130px', paddingLeft: '28px', paddingRight: search ? '24px' : '6px', height: '34px', border: 'none', outline: 'none', background: 'rgba(255,255,255,.08)', color: '#fff', fontFamily: 'inherit', fontSize: '13px' }}
                  />
                </div>
                {search && (
                  <button
                    onClick={() => { setSearch(''); setActiveLocation(''); setShowSuggestions(false); inputRef.current?.focus(); }}
                    style={{ width: '22px', height: '34px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: '-4px' }}
                  >×</button>
                )}
                <button
                  onClick={() => { inputRef.current?.blur(); geocodeAndFly(search); }}
                  disabled={geocoding}
                  style={{ width: '34px', height: '34px', background: geocoding ? '#e5e7eb' : 'var(--primary)', color: '#fff', border: 'none', cursor: geocoding ? 'default' : 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                  {geocoding ? <span style={{ fontSize: '10px' }}>...</span> : '🔍'}
                </button>
              </div>
              {/* Dropdown de sugestões — desktop only */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 9002, minWidth: '190px', overflow: 'hidden' }}>
                  {filteredSuggestions.map(nb => (
                    <button
                      key={nb.name}
                      onClick={() => { setSearch(nb.name); setShowSuggestions(false); inputRef.current?.blur(); geocodeAndFly(nb.name); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '7px', width: '100%', padding: '11px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', fontSize: '14px', color: '#111827', textAlign: 'left', fontFamily: 'inherit' }}
                    >
                      <span style={{ fontSize: '13px', opacity: 0.5 }}>📍</span>
                      <span style={{ flex: 1 }}>{nb.name}</span>
                      {nb.hasCatalog && <span style={{ fontSize: '10px', background: '#eff6ff', color: '#2563eb', borderRadius: '4px', padding: '2px 6px', fontWeight: '700', flexShrink: 0 }}>imóveis</span>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Chip de localização ativa */}
        {activeLocation && (
          <button onClick={() => { setActiveLocation(''); setSearch(''); }}
            style={{ height: '36px', padding: '0 10px', borderRadius: '18px', border: '1.5px solid #60a5fa', background: 'rgba(96,165,250,.15)', color: '#60a5fa', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            📍 {activeLocation} <span style={{ fontSize: '14px', lineHeight: 1 }}>×</span>
          </button>
        )}

        {/* Estágio */}
        <button style={pillStyle(!!filterStatus)} onClick={(e) => openDrop('status', e)}>
          {filterStatus ? getStatus(filterStatus).label : 'Estágio'} <span style={{ fontSize: '10px' }}>▾</span>
        </button>

        {/* Tipo */}
        <button style={pillStyle(!!filterFinality)} onClick={(e) => openDrop('tipo', e)}>
          {filterFinality === 'residencial' ? '🏠 Residencial'
            : filterFinality === 'comercial' ? '🏢 Comercial'
            : 'Tipo'} <span style={{ fontSize: '10px' }}>▾</span>
        </button>

        {/* Mais filtros */}
        <button style={pillStyle(maisCount > 0)} onClick={(e) => openDrop('mais', e)}>
          {maisCount > 0 ? `Filtros (${maisCount})` : 'Filtros'} <span style={{ fontSize: '10px' }}>▾</span>
        </button>

        {hasFilters && (
          <button onClick={clearAll} style={{ height: '36px', padding: '0 12px', borderRadius: '18px', border: '1px solid rgba(252,165,165,.4)', background: 'rgba(220,38,38,.15)', color: '#fca5a5', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            ✕ Limpar
          </button>
        )}
      </div>

      {/* ── MOBILE: Tabs Lista / Mapa ────────────────────────────────────────── */}
      {isMobile && (
        <div style={{ display: 'flex', background: '#1e3a5f', borderBottom: '1px solid rgba(255,255,255,.08)', flexShrink: 0 }}>
          {([
            { id: 'list' as const, icon: '📋', label: loading ? 'Lista' : `Lista (${visibleBuildings.length})` },
            { id: 'map'  as const, icon: '🗺️', label: loading ? 'Mapa'  : `Mapa (${mapPins.length})` },
          ]).map(({ id, icon, label }) => (
            <button key={id} onClick={() => setMobileView(id)}
              style={{
                flex: 1, padding: '11px 8px', background: 'transparent',
                color: mobileView === id ? '#60a5fa' : 'rgba(255,255,255,.5)',
                fontWeight: mobileView === id ? '700' : '500',
                border: 'none',
                borderBottom: mobileView === id ? '2.5px solid #60a5fa' : '2.5px solid transparent',
                fontSize: '14px', cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}>
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>
      )}

      {/* ── MOBILE: Conteúdo ─────────────────────────────────────────────────── */}
      {isMobile && mobileView === 'map' && (
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <MapView ref={mapRef} pins={mapPins} onBoundsChange={handleBoundsChange} />

          {/* Dica: busque um bairro para ver todos os imóveis — visível só sem filtro ativo */}
          {!activeLocation && !loading && (
            <div style={{
              position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 400, pointerEvents: 'none',
            }}>
              <button
                onPointerDown={e => { e.stopPropagation(); }}
                onClick={e => { e.stopPropagation(); setShowMobileSearch(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  background: 'rgba(255,255,255,.96)', borderRadius: '22px',
                  padding: '9px 16px', border: '1px solid #e5e7eb',
                  boxShadow: '0 3px 12px rgba(0,0,0,.18)',
                  fontSize: '13px', fontWeight: '600', color: '#2563eb',
                  cursor: 'pointer', pointerEvents: 'auto', whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                }}
              >
                🔍 Busque um bairro para ver todos os imóveis
              </button>
            </div>
          )}

          {loading && renderLoadingOverlay()}
        </div>
      )}

      {isMobile && mobileView === 'list' && (
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch', padding: '12px', minHeight: 0 }}>
          {/* Cabeçalho da lista */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>
              {loading ? 'Carregando...' : `${visibleBuildings.length.toLocaleString('pt-BR')} imóveis em SP`}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[{ c: '#2563eb', l: 'Na Planta' }, { c: '#d97706', l: 'Em Obras' }, { c: '#16a34a', l: 'Pronto' }].map(({ c, l }) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: c }} />
                  <span style={{ fontSize: '9px', color: '#9ca3af' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          {renderCards(2)}
        </div>
      )}

      {/* ── DESKTOP: Side-by-side ────────────────────────────────────────────── */}
      {!isMobile && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', minHeight: 0 }}>

          {/* Mapa — no desktop a busca fica na filter bar do topo */}
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <MapView ref={mapRef} pins={mapPins} onBoundsChange={handleBoundsChange} />
            {loading && renderLoadingOverlay()}
          </div>

          {/* Painel de cards */}
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e5e7eb', overflow: 'hidden', background: 'var(--bg)' }}>
            {/* Header do painel */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>
                {loading ? 'Carregando...' : `${visibleBuildings.length.toLocaleString('pt-BR')} imóveis`}
                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '400', marginLeft: '6px' }}>
                  {activeLocation ? `em ${activeLocation}` : 'em São Paulo'}
                </span>
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[{ c: '#2563eb', l: 'Na Planta' }, { c: '#d97706', l: 'Em Obras' }, { c: '#16a34a', l: 'Pronto' }].map(({ c, l }) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c }} />
                    <span style={{ fontSize: '9px', color: '#9ca3af' }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cards */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px', minHeight: 0 }}>
              {renderCards(3)}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .filter-bar::-webkit-scrollbar { display: none; }
        .filter-bar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default function ImoveisPage() {
  return (
    <Suspense fallback={<div style={{ padding: '80px', textAlign: 'center' }}><p style={{ color: '#9ca3af' }}>Carregando...</p></div>}>
      <ImoveisContent />
    </Suspense>
  );
}
