/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState, useRef, useMemo, useCallback, Suspense, useDeferredValue } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { formatBRL } from '@/lib/calculos';
import type { MapViewHandle, Bounds } from '@/components/MapView';
import { trackBusca } from '@/lib/gtag';
import { getStatusCfg } from '@/lib/status';
import { SP_BAIRROS, CIDADE_INFO, CIDADES_BUSCA, normStr, stripTipoLogradouro } from '@/lib/localizacao';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });
const SalvarBuscaModal = dynamic(() => import('@/components/SalvarBuscaModal'), { ssr: false });

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
  property_types?: string[];
  typology_ranges?: { type: string; price_min: number | null; price_max: number | null; bedrooms_min: number | null; bedrooms_max: number | null; area_min: number | null; area_max: number | null }[];
  lat: number | null; lng: number | null;
  delivery_date: string | null;
  promocoes_destaque?: {
    unidade?: string;
    tipo?: string;
    andar?: string;
    areaM2?: number;
    quartos?: number;
    vagas?: number;
    precoOriginal?: number;
    precoPromocional: number;
    ultimaUnidade?: boolean;
    beneficio?: string;
  }[];
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

function getStatus(s: string, minPrice?: number | null) {
  const cfg = getStatusCfg(s, minPrice);
  return { cor: cfg.cor, label: cfg.label || 'Outros' };
}
function fmtRange(min: number | null, max: number | null, unit: string) {
  if (!min) return null;
  if (max && max !== min) return `${min}–${max} ${unit}`;
  return `${min} ${unit}`;
}

// Aparência das sugestões de busca (bairro/rua/imóvel/empresa) — compartilhada
// entre o autocomplete desktop e a lista de sugestões do modal mobile.
const SUGESTAO_ICONE: Record<'bairro' | 'rua' | 'imovel' | 'empresa', string> = {
  bairro: '📍', rua: '🛣️', imovel: '🏢', empresa: '🏗',
};
const SUGESTAO_LABEL: Record<'bairro' | 'rua' | 'imovel' | 'empresa', string> = {
  bairro: 'bairro', rua: 'rua', imovel: 'imóvel', empresa: 'construtora',
};
const SUGESTAO_COR: Record<'bairro' | 'rua' | 'imovel' | 'empresa', { bg: string; fg: string }> = {
  bairro:  { bg: '#eff6ff', fg: '#2563eb' },
  rua:     { bg: '#f0fdf4', fg: '#16a34a' },
  imovel:  { bg: '#fdf4ff', fg: '#a21caf' },
  empresa: { bg: '#fff7ed', fg: '#c2410c' },
};

// ─── Card ─────────────────────────────────────────────────────────────────────
function ImovelCard({ im, tipologiaAtiva }: { im: Imovel; tipologiaAtiva?: string }) {
  const sc = getStatus(im.status_norm || im.status || '', im.min_price);
  // Quando há filtro de tipologia ativo, mostra a faixa específica daquele tipo de
  // unidade (ex.: Cobertura Horizontal) em vez da faixa do prédio inteiro — senão o
  // card mostra o apartamento padrão mais barato do prédio, não a unidade filtrada.
  const faixaTipologia = tipologiaAtiva ? im.typology_ranges?.find(t => t.type === tipologiaAtiva) : null;
  const precoExibido   = faixaTipologia?.price_min    ?? im.min_price;
  const quartosMin     = faixaTipologia?.bedrooms_min ?? im.bedrooms_min;
  const quartosMax     = faixaTipologia?.bedrooms_max ?? im.bedrooms_max;
  const areaExibida    = faixaTipologia?.area_min     ?? im.area_min;
  return (
    <Link href={`/imoveis/${im.id}`} style={{ textDecoration: 'none', display: 'block' }}
      onClick={() => { import('@/lib/gtag').then(m => m.trackImovelView({ imovel: im.name, bairro: im.neighborhood, preco: precoExibido ?? undefined })); }}
    >
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
          {im.promocoes_destaque && im.promocoes_destaque.length > 0 && (
            <span style={{ position: 'absolute', top: '7px', right: '7px', background: '#dc2626', color: '#fff', fontSize: '9px', fontWeight: '800', padding: '3px 7px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              🔥 Promoção
            </span>
          )}
        </div>
        <div style={{ padding: '9px 10px 11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text)', lineHeight: '1.35', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{im.name}</p>
          {im.developer && <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{im.developer}</p>}
          <p style={{ fontSize: '10px', color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            📍 {[im.neighborhood || im.city, im.street].filter(Boolean).join(' · ')}
          </p>
          {im.promocoes_destaque && im.promocoes_destaque.length > 0 ? (
            <div style={{ marginTop: '2px', padding: '5px 7px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px' }}>
              <p style={{ fontSize: '9px', fontWeight: '800', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: '3px' }}>
                🔥 {im.promocoes_destaque.length > 1 ? `${im.promocoes_destaque.length} unidades em promoção` : 'Unidade em promoção'}
              </p>
              {im.promocoes_destaque.map((p, i) => {
                const temDesconto = !!(p.precoOriginal && p.precoOriginal > p.precoPromocional);
                const specs = [
                  p.areaM2 ? `▦ ${p.areaM2}m²` : null,
                  p.quartos !== undefined ? `🛏 ${p.quartos} qt${p.quartos === 1 ? '' : 's'}` : null,
                  p.vagas !== undefined ? `🅿 ${p.vagas} vg` : null,
                ].filter(Boolean).join('  ·  ');
                return (
                  <div key={i} style={{ marginBottom: i < im.promocoes_destaque!.length - 1 ? '8px' : 0 }}>
                    <p style={{ fontSize: '11px', fontWeight: '800', color: '#dc2626', lineHeight: 1.3 }}>
                      {temDesconto && (
                        <span style={{ fontSize: '9px', fontWeight: '600', color: '#991b1b', textDecoration: 'line-through', marginRight: '4px' }}>{formatBRL(p.precoOriginal!)}</span>
                      )}
                      {formatBRL(p.precoPromocional)}
                      {(p.tipo || p.unidade || p.andar) && (
                        <span style={{ fontSize: '9px', fontWeight: '600', color: '#991b1b' }}> — {[p.tipo, p.unidade ? `Apto ${p.unidade}` : null, p.andar].filter(Boolean).join(', ')}</span>
                      )}
                    </p>
                    {temDesconto && (
                      <p style={{ fontSize: '9px', color: '#16a34a', fontWeight: '700', marginTop: '1px' }}>
                        💰 Economize {formatBRL(p.precoOriginal! - p.precoPromocional)} ({Math.round((1 - p.precoPromocional / p.precoOriginal!) * 100)}% off)
                      </p>
                    )}
                    {specs && <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '1px' }}>{specs}</p>}
                    {p.beneficio && <p style={{ fontSize: '9px', color: '#b91c1c', fontWeight: '600', marginTop: '1px' }}>🎁 {p.beneficio}</p>}
                    {p.ultimaUnidade ? (
                      <p style={{ fontSize: '9px', color: '#b91c1c', fontWeight: '700', marginTop: '1px' }}>🏁 Última unidade disponível dessa característica!</p>
                    ) : temDesconto && (
                      <p style={{ fontSize: '9px', color: 'var(--text-faint)', marginTop: '1px' }}>Demais unidades dessa característica a partir de {formatBRL(p.precoOriginal!)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: '13px', fontWeight: '900', color: 'var(--primary)', marginTop: '2px' }}>{precoExibido && precoExibido >= 100 ? formatBRL(precoExibido) : 'Consultar'}</p>
          )}
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '2px' }}>
            {tipologiaAtiva && <span style={{ fontSize: '9px', color: 'var(--primary)', background: 'var(--primary-light)', border: '1px solid rgba(37,99,235,.25)', borderRadius: '5px', padding: '1px 4px', fontWeight: 700 }}>{tipologiaAtiva}</span>}
            {fmtRange(quartosMin, quartosMax, 'qts') && <span style={{ fontSize: '9px', color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '5px', padding: '1px 4px' }}>🛏 {fmtRange(quartosMin, quartosMax, 'qts')}</span>}
            {areaExibida && <span style={{ fontSize: '9px', color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '5px', padding: '1px 4px' }}>▦ {areaExibida}m²</span>}
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
  // Distingue "sem resultado" (busca genuinamente vazia) de "falha ao
  // carregar" (timeout, conexão instável — comum em 4G/wifi trocando) — sem
  // isso, qualquer erro de rede aparecia como "Nenhum imóvel encontrado" e
  // a pessoa achava que era problema dos filtros, sem opção de tentar de novo.
  const [loadError, setLoadError] = useState(false);
  const [displayCount, setDisplayCount] = useState(12);

  // Título próprio (analytics) — sem isso, herda o título da home e some nos relatórios do GA
  useEffect(() => {
    document.title = 'Imóveis Compatíveis | FinancieCerto';
  }, []);

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  const [filterStatus,   setFilterStatus]   = useState(searchParams.get('status') || '');
  const [filterFinality, setFilterFinality] = useState(searchParams.get('tipo') || '');
  const [filterTipologia, setFilterTipologia] = useState(searchParams.get('tipologia') || '');
  const [filterMin,      setFilterMin]      = useState(Number(searchParams.get('min') || 0));
  const [filterMax,      setFilterMax]      = useState(Number(searchParams.get('max') || 0));
  const [filterBedrooms, setFilterBedrooms] = useState(Number(searchParams.get('bedrooms_min') || 0));
  const [filterVagas,    setFilterVagas]    = useState(0);
  const [filterBaths,    setFilterBaths]    = useState(0);
  const [filterAreaMin,  setFilterAreaMin]  = useState(0);
  const [filterAreaMax,  setFilterAreaMax]  = useState(0);

  // Localização buscada (texto commitado — filtra cards + mapa)
  // "q" é o campo de busca livre da própria página; "neighborhood" é o param que os links
  // vindos do simulador usam para pré-aplicar o bairro escolhido — os dois caem no mesmo filtro.
  const [activeLocation, setActiveLocation] = useState(searchParams.get('q') || searchParams.get('neighborhood') || '');

  // Modo de busca — Local (bairro/rua, padrão) vs Imóvel (nome do
  // empreendimento) vs Empresa (nome da construtora/incorporadora). Os dois
  // últimos não restringem por cidade: quem busca "Helbor" pode não saber em
  // qual cidade o empreendimento fica, então busca no catálogo inteiro.
  const [searchMode, setSearchMode] = useState<'local' | 'imovel' | 'empresa'>('local');

  // Quando a busca por Imóvel/Empresa dá resultado em mais de uma cidade
  // (ex.: "Cyrela" tem obras em Porto Alegre E em São Paulo), pede pra
  // pessoa escolher a região antes de filtrar/enquadrar o mapa — sem isso,
  // o mapa mostrava tudo junto misturado, o que não ajuda ninguém.
  const [cidadeResultado, setCidadeResultado] = useState<string | null>(null);

  // Cidade escolhida para a busca por bairro — sempre um valor concreto (nunca
  // "todas"), pra que o bairro digitado/selecionado só possa casar com imóveis
  // dessa cidade. Ver CIDADES_BUSCA acima.
  const [searchCity, setSearchCity] = useState(searchParams.get('city') || 'São Paulo');
  // Marca que a pessoa escolheu uma cidade pra navegar (sem precisar também
  // escolher um bairro específico) — sem isso, trocar de cidade no seletor não
  // filtrava nada sozinho, obrigando um segundo passo (escolher bairro) que a
  // maioria dos portais não exige. Some quando um bairro é buscado (activeLocation
  // assume o filtro mais específico) ou quando a cidade é limpa.
  const [cidadeSemBairro, setCidadeSemBairro] = useState(false);

  // ── Padrão por região (geo por IP, sem pedir permissão do navegador) ───────
  // Só entra em jogo em uma visita "fria" — sem nenhum filtro/busca já na URL —
  // pra não sobrepor um link específico que alguém tenha compartilhado.
  const [geoCities, setGeoCities] = useState<string[] | null>(null);
  const [geoLabel,  setGeoLabel]  = useState<string | null>(null);
  const [geoAtivo,  setGeoAtivo]  = useState(false);
  useEffect(() => {
    const semFiltroNaUrl = !searchParams.get('q') && !searchParams.get('neighborhood') &&
      !searchParams.get('min') && !searchParams.get('max') && !searchParams.get('bedrooms_min') &&
      !searchParams.get('status') && !searchParams.get('tipo') && !searchParams.get('tipologia');
    if (!semFiltroNaUrl) return;
    // Se a pessoa já fechou o chip de região antes, respeita — a geolocalização por
    // IP erra de vez em quando (operadora móvel registrada em outra cidade, por
    // exemplo), e insistir toda visita depois de já ter sido corrigida é ruim.
    try { if (localStorage.getItem('fc_geo_dismissed') === '1') return; } catch { /* ignore */ }
    fetch('/api/geo').then(r => r.json()).then(data => {
      if (data.cities && data.cities.length > 0) {
        setGeoCities(data.cities);
        setGeoLabel(data.state === 'SP' ? 'São Paulo' : (data.city || data.state));
        setGeoAtivo(true);
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [search, setSearch] = useState(searchParams.get('q') || searchParams.get('neighborhood') || '');
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
  // Dropdown de cidade customizado (não usa <select> nativo) — o seletor
  // nativo com <optgroup> renderiza em branco em vários navegadores Android,
  // escondendo Santa Catarina/Paraná/RS/RJ atrás de um popup vazio.
  const [cidadeMobileAberta, setCidadeMobileAberta] = useState(false);
  // Mesmo problema também acontecia no seletor inline (desktop/tablet): era
  // um <select> nativo estilizado (cor/fundo customizados), que é justamente
  // o gatilho do bug de picker em branco no Android — não depende só do
  // <optgroup>. O dropdown desktop usa o mesmo mecanismo de openDropdown/
  // dropdownPos dos outros filtros (Estágio, Tipo...) — position:fixed
  // calculado via getBoundingClientRect, não absolute dentro da filter-bar
  // (que tem overflow:auto e altura fixa, e cortava/escondia um dropdown
  // absolute posicionado dentro dela).
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

  // Atualiza sugestões ao digitar — SEMPRE restrito à cidade escolhida em
  // searchCity, pra nunca misturar bairros de cidades diferentes com o mesmo
  // nome (ex: "Centro" em SP vs. Porto Alegre).
  const allNeighborhoods = useMemo(() => {
    const fromCatalog = allBuildings
      .filter(b => normStr(b.city || '') === normStr(searchCity))
      .map(b => b.neighborhood).filter(Boolean);
    const merged = new Map<string, boolean>(); // key=normStr → has catalog properties
    // Backfill de bairros sem imóveis ainda só existe para a capital (única
    // cidade com lista curada) — nas demais, mostra só o que tem no catálogo.
    if (normStr(searchCity) === normStr('São Paulo')) {
      SP_BAIRROS.forEach(nb => merged.set(normStr(nb), false));
    }
    fromCatalog.forEach(nb => {
      const k = normStr(nb);
      merged.set(k, true);        // marca como "tem imóveis"
    });
    // Monta lista final com o nome canônico: prefere o do catálogo (já com capitalização real)
    const catalogByNorm = new Map(fromCatalog.map(nb => [normStr(nb), nb]));
    return [...merged.keys()].map(k => ({
      name: catalogByNorm.get(k) || SP_BAIRROS.find(nb => normStr(nb) === k) || k,
      hasCatalog: merged.get(k) ?? false,
      type: 'bairro' as const,
    })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [allBuildings, searchCity]);

  // Ruas/avenidas do catálogo — permite buscar empreendimento por endereço
  // ("Rua Cesar Vallejo") além de por bairro. Sem lista curada (como
  // SP_BAIRROS): só existe o que já tem imóvel cadastrado, então
  // hasCatalog é sempre true aqui.
  const allStreets = useMemo(() => {
    const seen = new Map<string, string>(); // normStr → nome canônico
    allBuildings
      .filter(b => normStr(b.city || '') === normStr(searchCity) && b.street)
      .forEach(b => { const k = normStr(b.street!); if (!seen.has(k)) seen.set(k, b.street!); });
    return [...seen.values()]
      .map(name => ({ name, hasCatalog: true, type: 'rua' as const }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [allBuildings, searchCity]);

  const allLocationSuggestions = useMemo(() => [...allNeighborhoods, ...allStreets], [allNeighborhoods, allStreets]);

  // Nomes de empreendimento e de construtora/incorporadora — sem restrição de
  // cidade (ver comentário do searchMode acima).
  const allBuildingNames = useMemo(() => {
    const seen = new Map<string, string>();
    allBuildings.forEach(b => { if (b.name) { const k = normStr(b.name); if (!seen.has(k)) seen.set(k, b.name); } });
    return [...seen.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [allBuildings]);
  const allDevelopers = useMemo(() => {
    const seen = new Map<string, string>();
    allBuildings.forEach(b => { if (b.developer) { const k = normStr(b.developer); if (!seen.has(k)) seen.set(k, b.developer); } });
    return [...seen.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [allBuildings]);

  type Sugestao = { name: string; hasCatalog: boolean; type: 'bairro' | 'rua' | 'imovel' | 'empresa' };

  const filteredSuggestions = useMemo((): Sugestao[] => {
    if (!deferredSearch.trim()) return [];
    if (searchMode === 'imovel') {
      const q = normStr(deferredSearch);
      return allBuildingNames.filter(n => normStr(n).includes(q)).slice(0, 10)
        .map(name => ({ name, hasCatalog: true, type: 'imovel' as const }));
    }
    if (searchMode === 'empresa') {
      const q = normStr(deferredSearch);
      return allDevelopers.filter(n => normStr(n).includes(q)).slice(0, 10)
        .map(name => ({ name, hasCatalog: true, type: 'empresa' as const }));
    }
    const q = stripTipoLogradouro(normStr(deferredSearch));
    return allLocationSuggestions
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
  }, [deferredSearch, allLocationSuggestions, searchMode, allBuildingNames, allDevelopers]);

  // Sugestões para o modal mobile — quando vazio mostra bairros com imóveis
  // (ruas só aparecem depois de digitar — lista completa de ruas é grande
  // demais pra fazer sentido como sugestão "vazia").
  const mobileSuggestions = useMemo((): Sugestao[] => {
    if (searchMode === 'imovel') {
      const q = normStr(deferredMobileInput);
      const base = q ? allBuildingNames.filter(n => normStr(n).includes(q)) : allBuildingNames;
      return base.slice(0, 25).map(name => ({ name, hasCatalog: true, type: 'imovel' as const }));
    }
    if (searchMode === 'empresa') {
      const q = normStr(deferredMobileInput);
      const base = q ? allDevelopers.filter(n => normStr(n).includes(q)) : allDevelopers;
      return base.slice(0, 25).map(name => ({ name, hasCatalog: true, type: 'empresa' as const }));
    }
    const q = stripTipoLogradouro(normStr(deferredMobileInput));
    const base = q
      ? allLocationSuggestions.filter(n => normStr(n.name).includes(q))
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
  }, [deferredMobileInput, allLocationSuggestions, allNeighborhoods, searchMode, allBuildingNames, allDevelopers]);

  // Timeout de 20s — evita ficar "Carregando..." pra sempre numa conexão
  // móvel ruim (o catálogo completo pesa alguns MB); acima disso, melhor
  // mostrar erro com opção de tentar de novo do que travar em silêncio.
  const carregarImoveis = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    fetch('/api/orulo?all=1', { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => setAllBuildings(d.buildings || []))
      .catch(() => setLoadError(true))
      .finally(() => { clearTimeout(timeoutId); setLoading(false); });
  }, []);

  useEffect(() => { carregarImoveis(); }, [carregarImoveis]);

  // Cidades exibidas no seletor: só as que têm pelo menos 1 empreendimento
  // ativo no catálogo agora — CIDADES_BUSCA é a lista de cidades liberadas
  // (onde o portal pode operar), mas o catálogo real muda com o tempo (Orulo
  // sync), e escolher uma cidade sem nenhum resultado é experiência ruim.
  // Antes do catálogo carregar, mostra a lista completa (evita seletor vazio).
  const cidadesComEstoque = useMemo(() => {
    if (allBuildings.length === 0) return CIDADES_BUSCA;
    const comEstoque = new Set(allBuildings.map(b => b.city).filter(Boolean));
    return CIDADES_BUSCA.filter(c => comEstoque.has(c));
  }, [allBuildings]);

  useEffect(() => { setDisplayCount(12); }, [activeLocation, filterStatus, filterFinality, filterTipologia, filterMin, filterMax, filterBedrooms, filterVagas, filterBaths, filterAreaMin, filterAreaMax]);
  // Reseta paginação quando o mapa é movido (novos cards aparecem do início)
  useEffect(() => { if (!activeLocation) setDisplayCount(12); }, [debouncedBounds, activeLocation]);

  // Filtros que não são de localização/busca (preço, quartos, estágio,
  // tipo, tipologia...) — extraído do baseFilter pra poder ser reaplicado
  // no cálculo de contagem por cidade do seletor Imóvel/Empresa (sem isso,
  // o número em cada chip de cidade não bate com o que realmente aparece
  // depois de escolhida, se algum outro filtro já estiver ativo).
  const passesOutrosFiltros = useCallback((b: Imovel) => {
    if (filterMin      && (b.min_price    ?? 0)  < filterMin)     return false;
    if (filterMax      && (b.min_price    ?? 0)  > filterMax)     return false;
    if (filterBedrooms && (b.bedrooms_max ?? 99) < filterBedrooms) return false;
    if (filterVagas    && (b.vagas_max    ?? 99) < filterVagas)   return false;
    if (filterBaths    && (b.bathrooms_max ?? 99) < filterBaths)  return false;
    if (filterAreaMin  && (b.area_max     ?? 0)  < filterAreaMin) return false;
    if (filterAreaMax  && (b.area_min     ?? 0)  > filterAreaMax) return false;
    if (filterStatus   && b.status_norm !== filterStatus)         return false;
    {
      const fn = getEffectiveFinality(b);
      const effectiveFn = fn === '' ? 'residencial' : fn;
      if (filterFinality === 'todos') {
        // Escolha explícita de ver tudo — não filtra por finalidade.
      } else if (filterFinality) {
        if (effectiveFn !== filterFinality) return false;
      } else if (effectiveFn === 'comercial') {
        // Sem filtro de tipo escolhido: portal mostra só residencial por
        // padrão — comercial só aparece se a pessoa escolher isso explicitamente
        // no filtro "Tipo".
        return false;
      }
    }
    if (filterTipologia && !(b.property_types || []).includes(filterTipologia)) return false;
    return true;
  }, [filterMin, filterMax, filterBedrooms, filterVagas, filterBaths, filterAreaMin, filterAreaMax, filterStatus, filterFinality, filterTipologia]);

  const baseFilter = useCallback((b: Imovel) => {
    // ── Filtro de localização (bairro digitado/selecionado pelo usuário) ───────
    // Sempre restrito à cidade escolhida em searchCity — sem isso, um bairro
    // buscado em São Paulo (ex: "Centro") podia casar com o mesmo nome de
    // bairro em outra cidade (ex: Centro de Porto Alegre) e mostrar o lugar
    // errado no mapa/lista.
    if (activeLocation && searchMode === 'imovel') {
      if (!normStr(b.name || '').includes(normStr(activeLocation))) return false;
      if (cidadeResultado && normStr(b.city || '') !== normStr(cidadeResultado)) return false;
    }
    else if (activeLocation && searchMode === 'empresa') {
      if (!normStr(b.developer || '').includes(normStr(activeLocation))) return false;
      if (cidadeResultado && normStr(b.city || '') !== normStr(cidadeResultado)) return false;
    }
    else if (activeLocation) {
      if (normStr(b.city || '') !== normStr(searchCity)) return false;
      const q = stripTipoLogradouro(normStr(activeLocation));
      const haystack = normStr(`${b.neighborhood} ${b.name} ${b.street || ''}`);
      if (!haystack.includes(q)) return false;
    }
    // Cidade escolhida no seletor, sem bairro específico ainda — filtra por
    // cidade sozinha, igual à maioria dos portais (ver cidadeSemBairro acima).
    else if (cidadeSemBairro) {
      if (normStr(b.city || '') !== normStr(searchCity)) return false;
    }
    // ── Padrão por região (geo por IP) — só quando a pessoa não buscou nada ────
    // NÃO restringe por cidade aqui quando a geo falha/ainda não respondeu —
    // baseFilter alimenta tanto os pins do mapa quanto a lista, e o mapa
    // precisa continuar mostrando qualquer cidade liberada pra onde a pessoa
    // pan/zoom (ver visibleBuildings mais abaixo pro fallback de SP, que só
    // se aplica à lista mobile sem mapa visível — não ao mapa em si).
    else if (geoAtivo && geoCities) {
      const cidade = normStr(b.city || '');
      if (!geoCities.some(c => normStr(c) === cidade)) return false;
    }
    return passesOutrosFiltros(b);
  }, [activeLocation, searchCity, searchMode, cidadeResultado, geoAtivo, geoCities, passesOutrosFiltros]);

  // Conta quantos imóveis existem para cada tipo de finalidade no catálogo
  const finalityCounts = useMemo(() => {
    const counts: Record<string, number> = { residencial: 0, comercial: 0 };
    allBuildings.forEach(b => {
      const fn = getEffectiveFinality(b) || 'residencial';
      if (fn in counts) counts[fn]++;
    });
    return counts;
  }, [allBuildings]);

  // Conta quantos imóveis existem para cada tipologia de unidade (Apartamento, Cobertura, Studio...)
  const tipologiaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allBuildings.forEach(b => {
      (b.property_types || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [allBuildings]);

  // Pins do mapa: mostra só os do viewport atual (performance — evita centenas de DOM nodes)
  // Quando há busca de localização, baseFilter já restringe o conjunto (normalmente <30 pins).
  // Sem localização: no mobile limitamos a 50 pins para evitar travamento (criar 300 elementos
  // DOM de uma vez congela o thread principal no mobile).
  const mapPins = useMemo(() => {
    const toPin = (b: Imovel) => ({ id: b.id, lat: b.lat!, lng: b.lng!, name: b.name, price: b.min_price && b.min_price >= 100 ? formatBRL(b.min_price) : 'Consultar', neighborhood: b.neighborhood, status: b.status_norm || b.status });
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
    if (cidadeSemBairro) return base; // cidade escolhida no seletor já filtra tudo
    if (isMobile && mobileView !== 'map') {
      // Lista mobile sem mapa visível: não filtra por bounds. Mas sem geo
      // ativo (IP não detectado/bloqueado — comum), cai pra São Paulo, que é
      // o que o cabeçalho já promete ("imóveis em São Paulo") — só aqui,
      // não em baseFilter, pra não atrapalhar quem pan/zoom o mapa pra
      // outras cidades liberadas (SC, PR, RS, RJ).
      if (!geoAtivo) return base.filter(b => normStr(b.city || '') === normStr('São Paulo'));
      return base;
    }

    if (debouncedBounds) {
      const inView = base.filter(b =>
        b.lat && b.lng &&
        b.lat >= debouncedBounds.sw_lat && b.lat <= debouncedBounds.ne_lat &&
        b.lng >= debouncedBounds.sw_lng && b.lng <= debouncedBounds.ne_lng
      );
      if (inView.length > 0) return inView;
    }

    return base;
  }, [allBuildings, baseFilter, activeLocation, cidadeSemBairro, debouncedBounds, isMobile, mobileView, geoAtivo]);

  // Número exibido no cabeçalho ("X imóveis") — quem chega sem buscar nada
  // não pode ver um número pequeno e achar que o catálogo é curto, mesmo que
  // os cards abaixo continuem priorizando a região dele (geo por IP). Só
  // quando a pessoa efetivamente busca um bairro ou escolhe uma cidade é que
  // o número passa a refletir o resultado real da busca.
  const headlineCount = (activeLocation || cidadeSemBairro) ? visibleBuildings.length : allBuildings.length;

  // Escolher uma cidade no seletor só trocava o filtro — o mapa continuava
  // centrado em São Paulo, então os pins da cidade escolhida ficavam fora da
  // área visível ("sumiam"). Agora também voa até o centro da cidade.
  const selecionarCidade = useCallback((c: string) => {
    setSearchCity(c);
    setCidadeSemBairro(true);
    setSearch(''); setActiveLocation(''); setShowSuggestions(false);
    setDisplayCount(12);
    setOpenDropdown(null);
    setCidadeMobileAberta(false);
    const info = CIDADE_INFO[c];
    if (info) mapRef.current?.flyTo(info.lat, info.lng, 11);
  }, []);

  const geocodeAndFly = useCallback(async (query: string, cityOverride?: string) => {
    if (!query.trim()) return;
    setShowSuggestions(false);

    // Busca por nome de empreendimento ou de construtora — sem restrição de
    // cidade, e sem fallback de geocodificação (Nominatim geocodifica
    // endereço, não nome de prédio/empresa).
    if (searchMode === 'imovel' || searchMode === 'empresa') {
      setActiveLocation(query.trim());
      setDisplayCount(12);
      setCidadeResultado(null); // nova busca — qualquer escolha de cidade anterior não vale mais
      const qNorm = normStr(query);
      const campo = (b: Imovel) => searchMode === 'imovel' ? b.name : (b.developer || '');
      const matches = allBuildings.filter(b => normStr(campo(b)).includes(qNorm) && passesOutrosFiltros(b));
      const comCoord = matches.filter(b => b.lat && b.lng);
      import('@/lib/gtag').then(m => m.trackBusca({ termo: `${query} (${searchMode})`, resultados: matches.length }));
      // Sem restrição de cidade, os resultados podem estar espalhados pelo
      // Brasil inteiro (ex.: "Cyrela" tem obras em Porto Alegre E em São
      // Paulo). Com mais de uma cidade, não dá pra enquadrar tudo junto de
      // forma útil — deixa o mapa como está e mostra o seletor de cidade
      // (ver cidadesDoResultado) pra pessoa escolher a região antes. Com
      // só uma cidade, enquadra direto, sem esse passo extra.
      const cidadesDistintas = new Set(comCoord.map(b => normStr(b.city || '')));
      if (cidadesDistintas.size <= 1 && comCoord.length > 0) {
        mapRef.current?.fitBounds(comCoord.map(b => ({ lat: b.lat!, lng: b.lng! })));
      }
      return;
    }

    const cidade = cityOverride ?? searchCity;

    // Commita a localização → filtra cards imediatamente
    setActiveLocation(query.trim());
    setDisplayCount(12);

    // GA4 — evento de busca de empreendimentos
    const qNorm = stripTipoLogradouro(normStr(query));
    const cidadeNorm = normStr(cidade);
    const resultados = allBuildings.filter(b => normStr(b.city || '') === cidadeNorm && normStr(`${b.neighborhood} ${b.name} ${b.street || ''}`).includes(qNorm)).length;
    import('@/lib/gtag').then(m => m.trackBusca({ termo: `${query} (${cidade})`, resultados }));

    // 1. Tenta usar coordenadas de um imóvel do catálogo no mesmo bairro/rua E
    // cidade (instantâneo) — restringe por cidade pra não "voar" pro bairro de
    // mesmo nome em outra cidade (ex: Centro de SP vs. Centro de Porto Alegre).
    const catalogMatch = allBuildings.find(b =>
      b.lat && b.lng &&
      normStr(b.city || '') === cidadeNorm &&
      normStr(`${b.neighborhood || ''} ${b.street || ''}`).includes(qNorm),
    );
    if (catalogMatch) {
      mapRef.current?.flyTo(catalogMatch.lat!, catalogMatch.lng!, 13);
      return;
    }

    // 2. Fallback: Nominatim (para bairros sem imóveis no catálogo)
    setGeocoding(true);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', ' + cidade + ', Brasil')}&format=json&limit=3&countrycodes=br&accept-language=pt-BR`);
      const data = await r.json();
      if (data.length > 0) {
        mapRef.current?.flyTo(parseFloat(data[0].lat), parseFloat(data[0].lon), 13);
      }
    } catch { /* silencioso */ }
    finally { setGeocoding(false); }
  }, [allBuildings, searchCity, searchMode, passesOutrosFiltros]);

  // Cidades presentes no resultado atual de Imóvel/Empresa — alimenta o
  // seletor de região (só aparece quando há mais de uma cidade e a pessoa
  // ainda não escolheu nenhuma).
  const cidadesDoResultado = useMemo(() => {
    if (searchMode === 'local' || !activeLocation) return [] as { city: string; count: number }[];
    const qNorm = normStr(activeLocation);
    const campo = (b: Imovel) => searchMode === 'imovel' ? b.name : (b.developer || '');
    const counts = new Map<string, number>();
    allBuildings.forEach(b => {
      if (b.city && normStr(campo(b)).includes(qNorm) && passesOutrosFiltros(b)) {
        counts.set(b.city, (counts.get(b.city) || 0) + 1);
      }
    });
    return [...counts.entries()].map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count);
  }, [activeLocation, searchMode, allBuildings, passesOutrosFiltros]);

  const escolherCidadeResultado = useCallback((city: string) => {
    setCidadeResultado(city);
    setDisplayCount(12);
    const qNorm = normStr(activeLocation);
    const campo = (b: Imovel) => searchMode === 'imovel' ? b.name : (b.developer || '');
    const matches = allBuildings.filter(b => b.lat && b.lng && normStr(campo(b)).includes(qNorm) && normStr(b.city || '') === normStr(city) && passesOutrosFiltros(b));
    if (matches.length > 0) mapRef.current?.fitBounds(matches.map(b => ({ lat: b.lat!, lng: b.lng! })));
  }, [activeLocation, searchMode, allBuildings, passesOutrosFiltros]);

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
    setActiveLocation(''); setSearch(''); setSearchMode('local'); setCidadeResultado(null);
    setCidadeSemBairro(false); setSearchCity('São Paulo');
    setFilterStatus(''); setFilterFinality(''); setFilterTipologia(''); setFilterMin(0); setFilterMax(0);
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

  const hasFilters = !!(activeLocation || filterStatus || filterFinality || filterTipologia || filterMin || filterMax || filterBedrooms || filterVagas || filterBaths || filterAreaMin || filterAreaMax);
  const maisCount = [filterBedrooms, filterVagas, filterBaths, filterMin, filterMax, filterAreaMin, filterAreaMax].filter(Boolean).length;

  // Descrição amigável da busca atual — usada no modal "Salvar esta busca" (Fase 3)
  const [showSalvarBusca, setShowSalvarBusca] = useState(false);
  const [showAlertaHint, setShowAlertaHint] = useState(false);
  const clicarAlerta = useCallback(() => {
    if (hasFilters) {
      setShowSalvarBusca(true);
    } else {
      setShowAlertaHint(true);
      setTimeout(() => setShowAlertaHint(false), 3500);
    }
  }, [hasFilters]);
  const descricaoFiltrosAtual = [
    activeLocation || null,
    filterBedrooms ? `${filterBedrooms}+ quartos` : null,
    filterMin ? `a partir de ${formatBRL(filterMin)}` : null,
    filterMax ? `até ${formatBRL(filterMax)}` : null,
    filterStatus || null,
    filterFinality || null,
  ].filter(Boolean).join(' · ') || 'Todos os imóveis';

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
      ) : loadError && allBuildings.length === 0 ? (
        <div style={{ padding: '60px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: '28px', marginBottom: '10px' }}>📡</p>
          <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>Não foi possível carregar os imóveis</p>
          <p style={{ fontSize: '13px', color: '#9ca3af' }}>Verifique sua conexão e tente novamente.</p>
          <button onClick={carregarImoveis} style={{ marginTop: '14px', padding: '10px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>Tentar novamente</button>
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
            {visibleBuildings.slice(0, displayCount).map(im => <ImovelCard key={im.id} im={im} tipologiaAtiva={filterTipologia} />)}
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
              <span style={{ padding: '0 10px', fontSize: '15px', flexShrink: 0 }}>{searchMode === 'imovel' ? '🏢' : searchMode === 'empresa' ? '🏗' : '📍'}</span>
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
                placeholder={
                  searchMode === 'imovel' ? 'Nome do empreendimento...' :
                  searchMode === 'empresa' ? 'Nome da construtora...' :
                  `Bairro ou rua em ${searchCity}...`
                }
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

          {/* Modo de busca: Local / Imóvel / Empresa */}
          <div style={{ display: 'flex', gap: '6px', padding: '10px 14px', borderBottom: '1px solid #e5e7eb' }}>
            {([
              { id: 'local' as const,   label: '📍 Local' },
              { id: 'imovel' as const,  label: '🏢 Imóvel' },
              { id: 'empresa' as const, label: '🏗 Empresa' },
            ]).map(({ id, label }) => (
              <button key={id}
                onClick={() => { setSearchMode(id); setMobileSearchInput(''); setActiveLocation(''); setSearch(''); setCidadeResultado(null); }}
                style={{
                  flex: 1, height: '34px', borderRadius: '8px',
                  border: `1.5px solid ${searchMode === id ? 'var(--primary)' : '#e5e7eb'}`,
                  background: searchMode === id ? 'var(--primary-light)' : '#f9fafb',
                  color: searchMode === id ? 'var(--primary)' : '#374151',
                  fontSize: '12px', fontWeight: searchMode === id ? '700' : '500',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >{label}</button>
            ))}
          </div>

          {/* Passo 1: escolher a cidade — os bairros abaixo são sempre da cidade
              selecionada aqui, pra nunca misturar bairros de mesmo nome em
              cidades diferentes (ex: Centro de SP vs. Centro de Porto Alegre).
              Só faz sentido no modo Local — buscar por empreendimento/construtora
              não é restrito por cidade. */}
          {searchMode === 'local' && <div style={{ padding: '10px 14px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', flexShrink: 0 }}>Cidade</span>
            <button
              onClick={() => setCidadeMobileAberta(v => !v)}
              style={{
                flex: 1, height: '38px', borderRadius: '8px', border: '1.5px solid #e5e7eb',
                background: '#f9fafb', color: '#111827', fontFamily: 'inherit', fontSize: '14px',
                fontWeight: '600', padding: '0 10px', textAlign: 'left', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              {searchCity}
              <span style={{ fontSize: '10px', color: '#6b7280', transform: cidadeMobileAberta ? 'rotate(180deg)' : 'none' }}>▾</span>
            </button>

            {cidadeMobileAberta && (
              <>
                <div onClick={() => setCidadeMobileAberta(false)} style={{ position: 'fixed', inset: 0, zIndex: 10000 }} />
                <div style={{
                  position: 'absolute', top: '100%', left: '14px', right: '14px', marginTop: '4px',
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,.18)', zIndex: 10001,
                  maxHeight: '55vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
                }}>
                  {cidadesComEstoque.map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        selecionarCidade(c);
                        setMobileSearchInput('');
                        setShowMobileSearch(false); // já filtra pela cidade — vai direto pro resultado
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 14px',
                        background: c === searchCity ? '#eff6ff' : 'transparent',
                        color: c === searchCity ? 'var(--primary)' : '#111827',
                        fontWeight: c === searchCity ? '700' : '500',
                        border: 'none', fontSize: '14px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      <span>{c}</span>
                      {CIDADE_INFO[c] && <span style={{ fontSize: '11px', color: c === searchCity ? 'var(--primary)' : '#9ca3af', fontWeight: '700' }}>{CIDADE_INFO[c].uf}</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>}

          {/* Lista de sugestões */}
          <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {!mobileSearchInput && (
              <div style={{ padding: '14px 16px 6px', fontSize: '11px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {searchMode === 'imovel' ? 'Empreendimentos no catálogo' :
                 searchMode === 'empresa' ? 'Construtoras no catálogo' :
                 `Bairros com imóveis em ${searchCity}`}
              </div>
            )}
            {mobileSuggestions.map(nb => (
              <button
                key={`${nb.type}-${nb.name}`}
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
                  background: SUGESTAO_COR[nb.type].bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '16px', flexShrink: 0,
                }}>{SUGESTAO_ICONE[nb.type]}</div>
                <span style={{ flex: 1, fontSize: '15px', color: '#111827', fontWeight: '500' }}>
                  {nb.name}
                </span>
                <span style={{
                  fontSize: '10px', background: SUGESTAO_COR[nb.type].bg, color: SUGESTAO_COR[nb.type].fg,
                  borderRadius: '5px', padding: '3px 7px', fontWeight: '700', flexShrink: 0,
                }}>{SUGESTAO_LABEL[nb.type]}</span>
              </button>
            ))}
            {mobileSearchInput && mobileSuggestions.length === 0 && (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                {searchMode === 'imovel' ? 'Nenhum empreendimento encontrado' :
                 searchMode === 'empresa' ? 'Nenhuma construtora encontrada' :
                 'Nenhum bairro encontrado'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Overlay: fecha dropdown ao clicar fora ──────────────────────────── */}
      {openDropdown && (
        <div onClick={() => setOpenDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 9000 }} />
      )}

      {/* ── Dropdown Cidade (desktop) ─────────────────────────────────────────
          position:fixed (não absolute) — a filter-bar tem overflow:auto e
          altura fixa, que cortava um dropdown absolute posicionado dentro dela. */}
      {openDropdown === 'cidade' && (
        <div style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,.15)', padding: '6px', zIndex: 9001, minWidth: '190px', maxHeight: '360px', overflowY: 'auto' }}>
          {cidadesComEstoque.map(c => (
            <button
              key={c}
              onClick={() => selecionarCidade(c)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', background: c === searchCity ? 'var(--primary-light)' : 'transparent', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '14px', fontWeight: c === searchCity ? '700' : '400', color: c === searchCity ? 'var(--primary)' : '#374151', textAlign: 'left' }}
            >
              {c === searchCity && <span style={{ color: 'var(--primary)', fontSize: '12px' }}>✓</span>}
              <span style={{ flex: 1 }}>{c}</span>
              {CIDADE_INFO[c] && <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '700' }}>{CIDADE_INFO[c].uf}</span>}
            </button>
          ))}
        </div>
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
            { val: 'todos',       icon: '🏘', label: 'Todos os tipos (incl. comercial)', count: allBuildings.length },
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

      {/* ── Dropdown Tipologia ─────────────────────────────────────────────── */}
      {openDropdown === 'tipologia' && (
        <div style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,.15)', padding: '6px', zIndex: 9001, minWidth: '220px', maxHeight: '360px', overflowY: 'auto' }}>
          <button onClick={() => { setFilterTipologia(''); setOpenDropdown(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', background: filterTipologia === '' ? 'var(--primary-light)' : 'transparent', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '14px', fontWeight: filterTipologia === '' ? '700' : '400', color: filterTipologia === '' ? 'var(--primary)' : '#374151', textAlign: 'left' }}>
            {filterTipologia === '' && <span style={{ color: 'var(--primary)', fontSize: '12px' }}>✓</span>}
            <span style={{ flex: 1 }}>Todas as tipologias</span>
          </button>
          {tipologiaCounts.map(([val, count]) => (
            <button key={val} onClick={() => { setFilterTipologia(val); setOpenDropdown(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', background: filterTipologia === val ? 'var(--primary-light)' : 'transparent', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '14px', fontWeight: filterTipologia === val ? '700' : '400', color: filterTipologia === val ? 'var(--primary)' : '#374151', textAlign: 'left' }}>
              {filterTipologia === val && <span style={{ color: 'var(--primary)', fontSize: '12px' }}>✓</span>}
              <span style={{ flex: 1 }}>{val}</span>
              <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '400' }}>{count}</span>
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
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)', borderBottom: '1px solid rgba(255,255,255,.08)', padding: '8px 12px', display: 'flex', gap: '7px', alignItems: 'center', flexShrink: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
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
              <span style={{ flexShrink: 0 }}>{searchMode === 'imovel' ? '🏢' : searchMode === 'empresa' ? '🏗' : '📍'}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
                {search || (searchMode === 'imovel' ? 'Buscar empreendimento...' : searchMode === 'empresa' ? 'Buscar construtora...' : 'Buscar bairro...')}
              </span>
            </button>
          ) : (
            /* Desktop: seletor de modo + seletor de cidade + input com autocomplete inline */
            <>
              {/* Modo de busca: Local / Imóvel / Empresa */}
              <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid rgba(255,255,255,.2)', flexShrink: 0 }}>
                {([
                  { id: 'local' as const,   label: '📍 Local' },
                  { id: 'imovel' as const,  label: '🏢 Imóvel' },
                  { id: 'empresa' as const, label: '🏗 Empresa' },
                ]).map(({ id, label }, i) => (
                  <button key={id}
                    onClick={() => { setSearchMode(id); setSearch(''); setActiveLocation(''); setShowSuggestions(false); setCidadeResultado(null); }}
                    style={{
                      height: '34px', padding: '0 18px', border: 'none',
                      borderRight: i < 2 ? '1px solid rgba(255,255,255,.15)' : 'none',
                      background: searchMode === id ? 'rgba(96,165,250,.25)' : 'rgba(255,255,255,.06)',
                      color: searchMode === id ? '#60a5fa' : 'rgba(255,255,255,.7)',
                      fontSize: '13px', fontWeight: searchMode === id ? '700' : '500',
                      cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
                    }}
                  >{label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid rgba(255,255,255,.2)' }}>
                {searchMode === 'local' && (
                  <button
                    onClick={e => openDrop('cidade', e)}
                    title="Escolha a cidade antes de buscar o bairro"
                    style={{
                      height: '34px', border: 'none', outline: 'none', borderRight: '1px solid rgba(255,255,255,.2)',
                      background: 'rgba(255,255,255,.08)', color: '#fff', fontFamily: 'inherit', fontSize: '12px',
                      fontWeight: '700', padding: '0 6px', maxWidth: '108px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{searchCity}</span>
                    <span style={{ fontSize: '9px', flexShrink: 0, transform: openDropdown === 'cidade' ? 'rotate(180deg)' : 'none' }}>▾</span>
                  </button>
                )}
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', pointerEvents: 'none' }}>
                    {searchMode === 'imovel' ? '🏢' : searchMode === 'empresa' ? '🏗' : '📍'}
                  </span>
                  <input
                    type="text" value={search}
                    onChange={e => { setSearch(e.target.value); setShowSuggestions(true); if (!e.target.value) { setActiveLocation(''); setCidadeResultado(null); } }}
                    placeholder={
                      searchMode === 'imovel' ? 'Nome do empreendimento...' :
                      searchMode === 'empresa' ? 'Nome da construtora...' :
                      `Bairro/rua em ${searchCity}`
                    }
                    onKeyDown={e => {
                      if (e.key === 'Enter') { inputRef.current?.blur(); geocodeAndFly(search); }
                      if (e.key === 'Escape') { setShowSuggestions(false); inputRef.current?.blur(); }
                    }}
                    onFocus={e => { e.currentTarget.style.background = 'rgba(255,255,255,.15)'; setShowSuggestions(true); }}
                    onBlur={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; }}
                    ref={inputRef}
                    style={{ width: '210px', paddingLeft: '28px', paddingRight: search ? '24px' : '6px', height: '34px', border: 'none', outline: 'none', background: 'rgba(255,255,255,.08)', color: '#fff', fontFamily: 'inherit', fontSize: '13px' }}
                  />
                </div>
                {search && (
                  <button
                    onClick={() => { setSearch(''); setActiveLocation(''); setCidadeResultado(null); setShowSuggestions(false); inputRef.current?.focus(); }}
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
                      key={`${nb.type}-${nb.name}`}
                      onClick={() => { setSearch(nb.name); setShowSuggestions(false); inputRef.current?.blur(); geocodeAndFly(nb.name); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '7px', width: '100%', padding: '11px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', fontSize: '14px', color: '#111827', textAlign: 'left', fontFamily: 'inherit' }}
                    >
                      <span style={{ fontSize: '13px', opacity: 0.5 }}>{SUGESTAO_ICONE[nb.type]}</span>
                      <span style={{ flex: 1 }}>{nb.name}</span>
                      <span style={{ fontSize: '10px', background: SUGESTAO_COR[nb.type].bg, color: SUGESTAO_COR[nb.type].fg, borderRadius: '4px', padding: '2px 6px', fontWeight: '700', flexShrink: 0 }}>{SUGESTAO_LABEL[nb.type]}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Chip de localização/imóvel/empresa ativa */}
        {activeLocation && (
          <button onClick={() => { setActiveLocation(''); setSearch(''); setCidadeResultado(null); }}
            style={{ height: '36px', padding: '0 10px', borderRadius: '18px', border: '1.5px solid #60a5fa', background: 'rgba(96,165,250,.15)', color: '#60a5fa', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {searchMode === 'imovel' ? '🏢' : searchMode === 'empresa' ? '🏗' : '📍'} {activeLocation}{cidadeResultado ? ` · ${cidadeResultado}` : ''} <span style={{ fontSize: '14px', lineHeight: 1 }}>×</span>
          </button>
        )}

        {/* Seletor de cidade/região do resultado — só aparece quando a busca
            por Imóvel/Empresa deu resultado em mais de uma cidade e a pessoa
            ainda não escolheu nenhuma. */}
        {activeLocation && searchMode !== 'local' && !cidadeResultado && cidadesDoResultado.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.65)', fontWeight: '600', whiteSpace: 'nowrap' }}>Em qual cidade?</span>
            {cidadesDoResultado.map(({ city, count }) => (
              <button key={city} onClick={() => escolherCidadeResultado(city)}
                style={{ height: '30px', padding: '0 10px', borderRadius: '15px', border: '1.5px solid rgba(96,165,250,.5)', background: 'rgba(96,165,250,.12)', color: '#93c5fd', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {city} <span style={{ opacity: 0.75, fontWeight: 400 }}>({count})</span>
              </button>
            ))}
          </div>
        )}

        {/* Chip de cidade escolhida (sem bairro específico) */}
        {!activeLocation && cidadeSemBairro && (
          <button onClick={() => { setCidadeSemBairro(false); setSearchCity('São Paulo'); }}
            style={{ height: '36px', padding: '0 10px', borderRadius: '18px', border: '1.5px solid #60a5fa', background: 'rgba(96,165,250,.15)', color: '#60a5fa', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            📍 {searchCity} <span style={{ fontSize: '14px', lineHeight: 1 }}>×</span>
          </button>
        )}

        {/* Chip de região automática (geo por IP) — some ao buscar outra localização ou ao ser fechado */}
        {!activeLocation && !cidadeSemBairro && geoAtivo && geoLabel && (
          <button
            onClick={() => { setGeoAtivo(false); try { localStorage.setItem('fc_geo_dismissed', '1'); } catch { /* ignore */ } }}
            title="Ver imóveis de todas as cidades"
            style={{ height: '36px', padding: '0 10px', borderRadius: '18px', border: '1.5px solid #34d399', background: 'rgba(52,211,153,.15)', color: '#059669', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
            📍 Perto de você — {geoLabel} <span style={{ fontSize: '14px', lineHeight: 1 }}>×</span>
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
            : filterFinality === 'todos' ? '🏘 Todos os tipos'
            : 'Tipo'} <span style={{ fontSize: '10px' }}>▾</span>
        </button>

        {/* Tipologia */}
        <button style={pillStyle(!!filterTipologia)} onClick={(e) => openDrop('tipologia', e)}>
          {filterTipologia || 'Tipologia'} <span style={{ fontSize: '10px' }}>▾</span>
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
              {loading ? 'Carregando...' : `${headlineCount.toLocaleString('pt-BR')} imóveis${
                activeLocation && searchMode === 'imovel'  ? ` do empreendimento "${activeLocation}"${cidadeResultado ? ` em ${cidadeResultado}` : ''}` :
                activeLocation && searchMode === 'empresa' ? ` da construtora "${activeLocation}"${cidadeResultado ? ` em ${cidadeResultado}` : ''}` :
                activeLocation ? ` em ${activeLocation}` :
                cidadeSemBairro ? ` em ${searchCity}` :
                ''
              }`}
            </span>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={clicarAlerta}
                title={hasFilters ? 'Ser avisado quando entrar imóvel parecido' : 'Aplique um filtro (bairro, preço, quartos...) para ativar um alerta'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '800',
                  color: hasFilters ? '#fff' : 'var(--text-faint)',
                  background: hasFilters ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'var(--bg)',
                  border: hasFilters ? 'none' : '1px dashed var(--border)',
                  borderRadius: '20px', padding: '6px 12px',
                  cursor: 'pointer',
                  opacity: hasFilters ? 1 : 0.75,
                  whiteSpace: 'nowrap',
                  boxShadow: hasFilters ? '0 2px 8px rgba(37,99,235,.35)' : 'none',
                }}
              >
                🔔 Ativar alerta
              </button>
              {showAlertaHint && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 20,
                  background: '#1f2937', color: '#fff', fontSize: '12px', fontWeight: '600',
                  padding: '8px 12px', borderRadius: '8px', width: '220px', lineHeight: 1.4,
                  boxShadow: '0 4px 12px rgba(0,0,0,.25)',
                }}>
                  Escolha um bairro, região ou outro filtro (preço, quartos...) para poder ativar o alerta.
                </div>
              )}
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
                {loading ? 'Carregando...' : `${headlineCount.toLocaleString('pt-BR')} imóveis`}
                {(activeLocation || cidadeSemBairro) && (
                  <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '400', marginLeft: '6px' }}>
                    {activeLocation && searchMode === 'imovel'  ? `empreendimento "${activeLocation}"${cidadeResultado ? ` em ${cidadeResultado}` : ''}` :
                     activeLocation && searchMode === 'empresa' ? `construtora "${activeLocation}"${cidadeResultado ? ` em ${cidadeResultado}` : ''}` :
                     activeLocation ? `em ${activeLocation}, ${searchCity}` : `em ${searchCity}`}
                  </span>
                )}
              </span>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={clicarAlerta}
                    title={hasFilters ? 'Ser avisado quando entrar imóvel parecido' : 'Aplique um filtro (bairro, preço, quartos...) para ativar um alerta'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '800',
                      color: hasFilters ? '#fff' : 'var(--text-faint)',
                      background: hasFilters ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'var(--bg)',
                      border: hasFilters ? 'none' : '1px dashed var(--border)',
                      borderRadius: '20px', padding: '7px 13px',
                      cursor: 'pointer',
                      opacity: hasFilters ? 1 : 0.75,
                      whiteSpace: 'nowrap',
                      boxShadow: hasFilters ? '0 2px 8px rgba(37,99,235,.35)' : 'none',
                    }}
                  >
                    🔔 Ativar alerta
                  </button>
                  {showAlertaHint && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 20,
                      background: '#1f2937', color: '#fff', fontSize: '12px', fontWeight: '600',
                      padding: '8px 12px', borderRadius: '8px', width: '220px', lineHeight: 1.4,
                      boxShadow: '0 4px 12px rgba(0,0,0,.25)',
                    }}>
                      Escolha um bairro, região ou outro filtro (preço, quartos...) para poder ativar o alerta.
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[{ c: '#2563eb', l: 'Na Planta' }, { c: '#d97706', l: 'Em Obras' }, { c: '#16a34a', l: 'Pronto' }].map(({ c, l }) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c }} />
                      <span style={{ fontSize: '9px', color: '#9ca3af' }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cards */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px', minHeight: 0 }}>
              {renderCards(3)}
            </div>
          </div>
        </div>
      )}

      {showSalvarBusca && (
        <SalvarBuscaModal
          descricaoFiltros={descricaoFiltrosAtual}
          filtrosQuery={typeof window !== 'undefined' ? window.location.search : ''}
          onClose={() => setShowSalvarBusca(false)}
        />
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
