/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState, useRef, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  status: string; status_norm: string;
  finality?: string; finality_norm?: string;
  lat: number | null; lng: number | null;
  delivery_date: string | null;
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
          <p style={{ fontSize: '10px', color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{im.neighborhood || im.city}</p>
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const [allBuildings, setAllBuildings] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [displayCount, setDisplayCount] = useState(12);

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  const [filterStatus,   setFilterStatus]   = useState(searchParams.get('status') || '');
  const [filterFinality, setFilterFinality] = useState('');
  const [filterMin,      setFilterMin]      = useState(Number(searchParams.get('min') || 0));
  const [filterMax,      setFilterMax]      = useState(Number(searchParams.get('max') || 0));
  const [filterBedrooms, setFilterBedrooms] = useState(0);
  const [filterVagas,    setFilterVagas]    = useState(0);
  const [filterBaths,    setFilterBaths]    = useState(0);
  const [filterAreaMin,  setFilterAreaMin]  = useState(0);
  const [filterAreaMax,  setFilterAreaMax]  = useState(0);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [search, setSearch] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geoMsg, setGeoMsg] = useState('');
  const [minInput, setMinInput] = useState('');
  const [maxInput, setMaxInput] = useState('');
  const [areaMinInput, setAreaMinInput] = useState('');
  const [areaMaxInput, setAreaMaxInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const mapRef = useRef<MapViewHandle>(null);

  // Detectar mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Fechar autocomplete ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
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
    if (!search.trim()) return [] as { name: string; hasCatalog: boolean }[];
    const q = normStr(search);
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
  }, [search, allNeighborhoods]);

  useEffect(() => {
    setLoading(true);
    fetch('/api/orulo?all=1')
      .then(r => r.json())
      .then(d => setAllBuildings(d.buildings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setDisplayCount(12); }, [filterStatus, filterFinality, filterMin, filterMax, filterBedrooms, filterVagas, filterBaths, filterAreaMin, filterAreaMax]);

  const baseFilter = useCallback((b: Imovel) => {
    if (filterMin      && (b.min_price    ?? 0)  < filterMin)     return false;
    if (filterMax      && (b.min_price    ?? 0)  > filterMax)     return false;
    if (filterBedrooms && (b.bedrooms_max ?? 99) < filterBedrooms) return false;
    if (filterVagas    && (b.vagas_max    ?? 99) < filterVagas)   return false;
    if (filterBaths    && (b.bathrooms_max ?? 99) < filterBaths)  return false;
    if (filterAreaMin  && (b.area_max     ?? 0)  < filterAreaMin) return false;
    if (filterAreaMax  && (b.area_min     ?? 0)  > filterAreaMax) return false;
    if (filterStatus   && b.status_norm !== filterStatus)         return false;
    if (filterFinality) {
      // Imóveis sem finality definida são tratados como Residencial (padrão da Orulo)
      const fn = b.finality_norm || '';
      const effectiveFn = fn === '' ? 'residencial' : fn;
      if (effectiveFn !== filterFinality) return false;
    }
    return true;
  }, [filterMin, filterMax, filterBedrooms, filterVagas, filterBaths, filterAreaMin, filterAreaMax, filterStatus, filterFinality]);

  // Conta quantos imóveis existem para cada tipo de finalidade no catálogo
  const finalityCounts = useMemo(() => {
    const counts: Record<string, number> = { residencial: 0, nr: 0, lojas: 0 };
    allBuildings.forEach(b => {
      const fn = (b.finality_norm || '') === '' ? 'residencial' : (b.finality_norm || '');
      if (fn in counts) counts[fn]++;
    });
    return counts;
  }, [allBuildings]);

  const mapPins = useMemo(() => allBuildings
    .filter(b => b.lat && b.lng)
    .filter(baseFilter)
    .map(b => ({ id: b.id, lat: b.lat!, lng: b.lng!, name: b.name, price: b.min_price ? formatBRL(b.min_price) : 'Consultar', neighborhood: b.neighborhood, status: b.status_norm || b.status })),
  [allBuildings, baseFilter]);

  // No desktop, filtra os cards pelo viewport do mapa (bounds)
  const visibleBuildings = useMemo(() => {
    const filtered = allBuildings.filter(baseFilter);
    if (!isMobile && bounds) {
      const inBounds = filtered.filter(b =>
        b.lat && b.lng &&
        b.lat >= bounds.sw_lat && b.lat <= bounds.ne_lat &&
        b.lng >= bounds.sw_lng && b.lng <= bounds.ne_lng
      );
      // Só aplica o filtro de bounds se houver imóveis com coordenadas na área
      if (inBounds.length > 0) return inBounds;
    }
    return filtered;
  }, [allBuildings, baseFilter, isMobile, bounds]);

  const geocodeAndFly = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setShowSuggestions(false);

    // 1. Tenta usar coordenadas de um imóvel do catálogo no mesmo bairro (instantâneo)
    const qNorm = normStr(query);
    const catalogMatch = allBuildings.find(b => b.lat && b.lng && normStr(b.neighborhood).includes(qNorm));
    if (catalogMatch) {
      if (isMobile) setMobileView('map');
      mapRef.current?.flyTo(catalogMatch.lat!, catalogMatch.lng!, 14);
      setGeoMsg(`📍 ${catalogMatch.neighborhood}`);
      setTimeout(() => setGeoMsg(''), 4000);
      return;
    }

    // 2. Fallback: Nominatim (para bairros sem imóveis no catálogo)
    setGeocoding(true); setGeoMsg('');
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', São Paulo, Brasil')}&format=json&limit=3&countrycodes=br&accept-language=pt-BR`);
      const data = await r.json();
      if (data.length > 0) {
        if (isMobile) setMobileView('map');
        mapRef.current?.flyTo(parseFloat(data[0].lat), parseFloat(data[0].lon), 14);
        setGeoMsg(`📍 ${data[0].display_name.split(',').slice(0, 2).join(',')}`);
        setTimeout(() => setGeoMsg(''), 4000);
      } else {
        setGeoMsg('❌ Localização não encontrada.');
        setTimeout(() => setGeoMsg(''), 4000);
      }
    } catch { setGeoMsg('❌ Erro ao buscar.'); setTimeout(() => setGeoMsg(''), 3000); }
    finally { setGeocoding(false); }
  }, [isMobile, allBuildings]);

  const applyMais = useCallback(() => {
    setFilterMin(Number(minInput.replace(/\D/g, '')) || 0);
    setFilterMax(Number(maxInput.replace(/\D/g, '')) || 0);
    setFilterAreaMin(Number(areaMinInput.replace(/\D/g, '')) || 0);
    setFilterAreaMax(Number(areaMaxInput.replace(/\D/g, '')) || 0);
    setOpenDropdown(null);
  }, [minInput, maxInput, areaMinInput, areaMaxInput]);

  const clearAll = useCallback(() => {
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

  const hasFilters = !!(filterStatus || filterFinality || filterMin || filterMax || filterBedrooms || filterVagas || filterBaths || filterAreaMin || filterAreaMax);
  const maisCount = [filterBedrooms, filterVagas, filterBaths, filterMin, filterMax, filterAreaMin, filterAreaMax].filter(Boolean).length;

  const pillStyle = (active: boolean): React.CSSProperties => ({
    height: '36px', padding: '0 12px', borderRadius: '18px',
    border: `1.5px solid ${active ? 'var(--primary)' : '#d1d5db'}`,
    background: active ? 'var(--primary-light)' : '#fff',
    color: active ? 'var(--primary)' : '#374151',
    fontSize: '13px', fontWeight: active ? '700' : '500',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
    whiteSpace: 'nowrap' as const, flexShrink: 0,
    transition: 'all 0.15s',
  });

  // ── Cards grid (compartilhado entre mobile e desktop) ──────────────────────
  const renderCards = (cols: number) => (
    <>
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '10px' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '10px' }}>
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
            { val: '',             icon: '🏘', label: 'Todos os tipos',       count: allBuildings.length },
            { val: 'residencial',  icon: '🏠', label: 'Residencial',          count: finalityCounts.residencial },
            { val: 'nr',           icon: '🏢', label: 'NR – Não Residencial', count: finalityCounts.nr },
            { val: 'lojas',        icon: '🛒', label: 'Lojas',                count: finalityCounts.lojas },
          ]
            // Oculta opções sem imóveis (exceto "Todos")
            .filter(o => o.val === '' || o.count > 0)
            .map(({ val, icon, label, count }) => (
            <button key={val} onClick={() => { setFilterFinality(val); setOpenDropdown(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', background: filterFinality === val ? 'var(--primary-light)' : 'transparent', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '14px', fontWeight: filterFinality === val ? '700' : '400', color: filterFinality === val ? 'var(--primary)' : '#374151', textAlign: 'left' }}>
              {filterFinality === val && <span style={{ color: 'var(--primary)', fontSize: '12px' }}>✓</span>}
              <span>{icon}</span>
              <span style={{ flex: 1 }}>{label}</span>
              {val !== '' && <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '400' }}>{count}</span>}
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
        style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '8px 12px', display: 'flex', gap: '7px', alignItems: 'center', flexShrink: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
      >
        {/* Busca + autocomplete + botão */}
        <div ref={searchRef} style={{ position: 'relative', display: 'flex', flexShrink: 0 }}>
          <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid #d1d5db' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', pointerEvents: 'none' }}>📍</span>
              <input
                type="text" value={search}
                onChange={e => { setSearch(e.target.value); setShowSuggestions(true); }}
                placeholder="Bairro ou cidade"
                onKeyDown={e => {
                  if (e.key === 'Enter') geocodeAndFly(search);
                  if (e.key === 'Escape') setShowSuggestions(false);
                }}
                onFocus={e => { e.currentTarget.style.background = '#fff'; setShowSuggestions(true); }}
                onBlur={e => { e.currentTarget.style.background = '#f9fafb'; }}
                style={{ width: '130px', paddingLeft: '28px', paddingRight: '6px', height: '34px', border: 'none', outline: 'none', background: '#f9fafb', color: '#111827', fontFamily: 'inherit', fontSize: '13px' }}
              />
            </div>
            <button
              onClick={() => geocodeAndFly(search)}
              disabled={geocoding}
              style={{ width: '34px', height: '34px', background: geocoding ? '#e5e7eb' : 'var(--primary)', color: '#fff', border: 'none', cursor: geocoding ? 'default' : 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              {geocoding ? <span style={{ fontSize: '10px' }}>...</span> : '🔍'}
            </button>
          </div>
          {/* Dropdown de sugestões */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 9002, minWidth: '190px', overflow: 'hidden' }}>
              {filteredSuggestions.map(nb => (
                <button
                  key={nb.name}
                  onMouseDown={e => { e.preventDefault(); setSearch(nb.name); geocodeAndFly(nb.name); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', fontSize: '13px', color: '#111827', textAlign: 'left', fontFamily: 'inherit' }}
                >
                  <span style={{ fontSize: '12px', opacity: 0.5 }}>📍</span>
                  <span style={{ flex: 1 }}>{nb.name}</span>
                  {nb.hasCatalog && <span style={{ fontSize: '10px', background: '#eff6ff', color: '#2563eb', borderRadius: '4px', padding: '1px 5px', fontWeight: '700', flexShrink: 0 }}>imóveis</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Estágio */}
        <button style={pillStyle(!!filterStatus)} onClick={(e) => openDrop('status', e)}>
          {filterStatus ? getStatus(filterStatus).label : 'Estágio'} <span style={{ fontSize: '10px' }}>▾</span>
        </button>

        {/* Tipo */}
        <button style={pillStyle(!!filterFinality)} onClick={(e) => openDrop('tipo', e)}>
          {filterFinality === 'residencial' ? '🏠 Residencial'
            : filterFinality === 'nr'       ? '🏢 NR'
            : filterFinality === 'lojas'    ? '🛒 Lojas'
            : 'Tipo'} <span style={{ fontSize: '10px' }}>▾</span>
        </button>

        {/* Mais filtros */}
        <button style={pillStyle(maisCount > 0)} onClick={(e) => openDrop('mais', e)}>
          {maisCount > 0 ? `Filtros (${maisCount})` : 'Filtros'} <span style={{ fontSize: '10px' }}>▾</span>
        </button>

        {hasFilters && (
          <button onClick={clearAll} style={{ height: '36px', padding: '0 12px', borderRadius: '18px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Mensagem geocoding */}
      {geoMsg && (
        <div style={{ background: geoMsg.startsWith('❌') ? '#fef2f2' : '#f0fdf4', borderBottom: `1px solid ${geoMsg.startsWith('❌') ? '#fca5a5' : '#86efac'}`, padding: '5px 16px', fontSize: '13px', color: geoMsg.startsWith('❌') ? '#dc2626' : '#166534', fontWeight: '500', flexShrink: 0 }}>
          {geoMsg}
        </div>
      )}

      {/* ── MOBILE: Tabs Lista / Mapa ────────────────────────────────────────── */}
      {isMobile && (
        <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          {([
            { id: 'list' as const, icon: '📋', label: loading ? 'Lista' : `Lista (${visibleBuildings.length})` },
            { id: 'map'  as const, icon: '🗺️', label: loading ? 'Mapa'  : `Mapa (${mapPins.length})` },
          ]).map(({ id, icon, label }) => (
            <button key={id} onClick={() => setMobileView(id)}
              style={{
                flex: 1, padding: '11px 8px', background: 'transparent',
                color: mobileView === id ? 'var(--primary)' : '#6b7280',
                fontWeight: mobileView === id ? '700' : '500',
                border: 'none',
                borderBottom: mobileView === id ? '2.5px solid var(--primary)' : '2.5px solid transparent',
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
          <MapView ref={mapRef} pins={mapPins} onBoundsChange={setBounds} onPinClick={id => router.push(`/imoveis/${id}`)} />
          {loading && renderLoadingOverlay()}
        </div>
      )}

      {isMobile && mobileView === 'list' && (
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '12px', minHeight: 0 }}>
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

          {/* Mapa */}
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <MapView ref={mapRef} pins={mapPins} onBoundsChange={setBounds} onPinClick={id => router.push(`/imoveis/${id}`)} />
            {loading && renderLoadingOverlay()}
          </div>

          {/* Painel de cards */}
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e5e7eb', overflow: 'hidden', background: 'var(--bg)' }}>
            {/* Header do painel */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>
                {loading ? 'Carregando...' : `${visibleBuildings.length.toLocaleString('pt-BR')} imóveis`}
                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '400', marginLeft: '6px' }}>
                  {bounds ? 'na área visível' : 'em São Paulo'}
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
