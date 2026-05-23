/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState, useRef, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { formatBRL } from '@/lib/calculos';
import type { MapViewHandle, Bounds } from '@/components/MapView';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

interface Imovel {
  id: string; name: string; developer: string;
  min_price: number | null; max_price: number | null;
  bedrooms_min: number | null; bedrooms_max: number | null;
  bathrooms_min: number | null; bathrooms_max: number | null;
  vagas_min: number | null; vagas_max: number | null;
  area_min: number | null; area_max: number | null;
  neighborhood: string; city: string; photo: string | null;
  status: string; status_norm: string;
  lat: number | null; lng: number | null;
  delivery_date: string | null;
}

const STATUS_CFG: Record<string, { cor: string; label: string }> = {
  'na planta':  { cor: '#2563eb', label: 'Na Planta' },
  'lançamento': { cor: '#7c3aed', label: 'Lançamento' },
  'em obras':   { cor: '#d97706', label: 'Em Obras' },
  'pronto':     { cor: '#16a34a', label: 'Pronto' },
};
function getStatus(s: string) {
  const k = (s || '').toLowerCase().trim();
  if (STATUS_CFG[k]) return STATUS_CFG[k];
  if (k.includes('planta') || k.includes('lança')) return STATUS_CFG['na planta'];
  if (k.includes('constru') || k.includes('obra') || k.includes('andamento')) return STATUS_CFG['em obras'];
  if (k.includes('pronto') || k.includes('entreg') || k.includes('conclui')) return STATUS_CFG['pronto'];
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
    <Link href={`/imoveis/${im.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.15s, border-color 0.15s' }}
        onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.boxShadow = '0 4px 18px rgba(37,99,235,.13)'; d.style.borderColor = 'rgba(37,99,235,.35)'; }}
        onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.boxShadow = ''; d.style.borderColor = 'var(--border)'; }}
      >
        <div style={{ width: '100%', height: '140px', background: '#E2E8F0', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          {im.photo
            ? <img src={im.photo} alt={im.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: '#94a3b8' }}>🏢</div>
          }
          <span style={{ position: 'absolute', top: '8px', left: '8px', background: sc.cor, color: '#fff', fontSize: '9px', fontWeight: '800', padding: '3px 8px', borderRadius: '7px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            {sc.label}
          </span>
        </div>
        <div style={{ padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', lineHeight: '1.35', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{im.name}</p>
          <p style={{ fontSize: '10px', color: 'var(--text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{im.neighborhood || im.city}</p>
          <p style={{ fontSize: '13px', fontWeight: '900', color: 'var(--primary)', marginTop: '3px' }}>{im.min_price ? formatBRL(im.min_price) : 'Consultar'}</p>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '3px' }}>
            {fmtRange(im.bedrooms_min, im.bedrooms_max, 'qts') && <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '5px', padding: '1px 5px' }}>🛏 {fmtRange(im.bedrooms_min, im.bedrooms_max, 'qts')}</span>}
            {im.area_min && <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '5px', padding: '1px 5px' }}>▦ {im.area_min}m²</span>}
            {fmtRange(im.vagas_min, im.vagas_max, 'vg') && <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '5px', padding: '1px 5px' }}>🅿 {fmtRange(im.vagas_min, im.vagas_max, 'vg')}</span>}
          </div>
          {im.delivery_date && <p style={{ fontSize: '9px', color: 'var(--text-faint)', marginTop: '2px' }}>🗓 {im.delivery_date}</p>}
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '140px', background: 'var(--border)' }} />
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {[80, 55, 45, 65].map((w, i) => <div key={i} style={{ height: i === 2 ? '14px' : '9px', width: `${w}%`, background: 'var(--border)', borderRadius: '5px' }} />)}
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
          return <button key={n} onClick={() => onChange(on ? 0 : n)} style={{ width: '42px', height: '42px', borderRadius: '8px', border: `1.5px solid ${on ? 'var(--primary)' : 'var(--border)'}`, background: on ? 'var(--primary-light)' : '#fff', color: on ? 'var(--primary)' : 'var(--text-muted)', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>{n === 0 ? '∞' : n === 4 ? '4+' : n}</button>;
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

  const [filterStatus,   setFilterStatus]   = useState(searchParams.get('status') || '');
  const [filterMin,      setFilterMin]      = useState(Number(searchParams.get('min') || 0));
  const [filterMax,      setFilterMax]      = useState(Number(searchParams.get('max') || 0));
  const [filterBedrooms, setFilterBedrooms] = useState(0);
  const [filterVagas,    setFilterVagas]    = useState(0);
  const [filterBaths,    setFilterBaths]    = useState(0);
  const [filterAreaMin,  setFilterAreaMin]  = useState(0);
  const [filterAreaMax,  setFilterAreaMax]  = useState(0);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geoMsg, setGeoMsg] = useState('');
  const [minInput, setMinInput] = useState('');
  const [maxInput, setMaxInput] = useState('');
  const [areaMinInput, setAreaMinInput] = useState('');
  const [areaMaxInput, setAreaMaxInput] = useState('');

  const mapRef = useRef<MapViewHandle>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch('/api/orulo?all=1')
      .then(r => r.json())
      .then(d => setAllBuildings(d.buildings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDisplayCount(12); }, [bounds, filterStatus, filterMin, filterMax, filterBedrooms, filterVagas, filterBaths, filterAreaMin, filterAreaMax]);

  // Fechar dropdown ao clicar fora — usa mousedown para funcionar antes do click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const baseFilter = useCallback((b: Imovel) => {
    if (filterMin     && (b.min_price    ?? 0)  < filterMin)     return false;
    if (filterMax     && (b.min_price    ?? 0)  > filterMax)     return false;
    if (filterBedrooms && (b.bedrooms_max ?? 99) < filterBedrooms) return false;
    if (filterVagas   && (b.vagas_max    ?? 99) < filterVagas)   return false;
    if (filterBaths   && (b.bathrooms_max ?? 99) < filterBaths)  return false;
    if (filterAreaMin && (b.area_max     ?? 0)  < filterAreaMin) return false;
    if (filterAreaMax && (b.area_min     ?? 0)  > filterAreaMax) return false;
    if (filterStatus  && b.status_norm !== filterStatus)         return false;
    return true;
  }, [filterMin, filterMax, filterBedrooms, filterVagas, filterBaths, filterAreaMin, filterAreaMax, filterStatus]);

  // Todos os pins — SEM filtro de bounds (mostra tudo no mapa)
  const mapPins = useMemo(() => allBuildings
    .filter(b => b.lat && b.lng)
    .filter(baseFilter)
    .map(b => ({ id: b.id, lat: b.lat!, lng: b.lng!, name: b.name, price: b.min_price ? formatBRL(b.min_price) : 'Consultar', neighborhood: b.neighborhood, status: b.status_norm || b.status })),
  [allBuildings, baseFilter]);

  // Cards filtrados por bounds
  const visibleBuildings = useMemo(() => {
    const result = allBuildings.filter(baseFilter);
    if (bounds) {
      const inBounds = result.filter(b => b.lat && b.lng && b.lat >= bounds.sw_lat && b.lat <= bounds.ne_lat && b.lng >= bounds.sw_lng && b.lng <= bounds.ne_lng);
      if (inBounds.length > 0) return inBounds;
    }
    return result;
  }, [allBuildings, bounds, baseFilter]);

  const geocodeAndFly = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setGeocoding(true); setGeoMsg('');
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', São Paulo, Brasil')}&format=json&limit=3&countrycodes=br&accept-language=pt-BR`);
      const data = await r.json();
      if (data.length > 0) {
        mapRef.current?.flyTo(parseFloat(data[0].lat), parseFloat(data[0].lon), 14);
        setGeoMsg(`📍 ${data[0].display_name.split(',').slice(0, 2).join(',')}`);
        setTimeout(() => setGeoMsg(''), 4000);
      } else {
        setGeoMsg('❌ Localização não encontrada.');
        setTimeout(() => setGeoMsg(''), 4000);
      }
    } catch { setGeoMsg('❌ Erro.'); setTimeout(() => setGeoMsg(''), 3000); }
    finally { setGeocoding(false); }
  }, []);

  const applyMais = useCallback(() => {
    setFilterMin(Number(minInput.replace(/\D/g, '')) || 0);
    setFilterMax(Number(maxInput.replace(/\D/g, '')) || 0);
    setFilterAreaMin(Number(areaMinInput.replace(/\D/g, '')) || 0);
    setFilterAreaMax(Number(areaMaxInput.replace(/\D/g, '')) || 0);
    setOpenDropdown(null);
  }, [minInput, maxInput, areaMinInput, areaMaxInput]);

  const clearAll = useCallback(() => {
    setFilterStatus(''); setFilterMin(0); setFilterMax(0);
    setFilterBedrooms(0); setFilterVagas(0); setFilterBaths(0);
    setFilterAreaMin(0); setFilterAreaMax(0);
    setMinInput(''); setMaxInput(''); setAreaMinInput(''); setAreaMaxInput('');
    setOpenDropdown(null);
  }, []);

  const hasFilters = !!(filterStatus || filterMin || filterMax || filterBedrooms || filterVagas || filterBaths || filterAreaMin || filterAreaMax);
  const maisCount = [filterBedrooms, filterVagas, filterBaths, filterMin, filterMax, filterAreaMin, filterAreaMax].filter(Boolean).length;

  // Pill button inline
  const pillStyle = (active: boolean): React.CSSProperties => ({
    height: '42px', padding: '0 18px', borderRadius: '21px',
    border: `1.5px solid ${active ? 'var(--primary)' : '#d1d5db'}`,
    background: active ? 'var(--primary-light)' : '#fff',
    color: active ? 'var(--primary)' : '#374151',
    fontSize: '14px', fontWeight: active ? '700' : '500',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
    whiteSpace: 'nowrap' as const, flexShrink: 0 as unknown as number,
    transition: 'all 0.15s',
  });

  return (
    // ── Container externo: SEM overflow:hidden para não clipar os dropdowns
    <div style={{ display: 'flex', flexDirection: 'column', height: `calc(100vh - var(--header-h))`, background: 'var(--bg)' }}>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div ref={filterBarRef} style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 20px', display: 'flex', gap: '10px', alignItems: 'center', zIndex: 300, flexShrink: 0, position: 'relative' }}>

        {/* Campo de localização compacto */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none' }}>📍</span>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar local"
            onKeyDown={e => { if (e.key === 'Enter') { geocodeAndFly(search); setOpenDropdown(null); } }}
            style={{ width: '185px', paddingLeft: '34px', paddingRight: '12px', height: '42px', border: '1.5px solid #d1d5db', borderRadius: '21px', fontSize: '14px', outline: 'none', background: '#f9fafb', color: '#111827', fontFamily: 'inherit' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = '#fff'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.background = '#f9fafb'; }}
          />
        </div>

        {/* Estágio */}
        <div style={{ position: 'relative' }}>
          <button style={pillStyle(!!filterStatus)} onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'status' ? null : 'status'); }}>
            {filterStatus ? getStatus(filterStatus).label : 'Estágio'} <span style={{ fontSize: '10px' }}>▾</span>
          </button>
          {openDropdown === 'status' && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,.12)', padding: '6px', zIndex: 9999, minWidth: '200px' }}>
              {[
                { val: '',           label: 'Todos os estágios' },
                { val: 'na planta',  label: '🌱 Na Planta' },
                { val: 'lançamento', label: '🚀 Lançamento' },
                { val: 'em obras',   label: '🏗 Em Obras' },
                { val: 'pronto',     label: '✅ Pronto / Entregue' },
              ].map(({ val, label }) => (
                <button key={val} onClick={() => { setFilterStatus(val); setOpenDropdown(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', background: filterStatus === val ? 'var(--primary-light)' : 'transparent', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '14px', fontWeight: filterStatus === val ? '700' : '400', color: filterStatus === val ? 'var(--primary)' : '#374151', textAlign: 'left' }}>
                  {filterStatus === val && <span style={{ color: 'var(--primary)', fontSize: '12px' }}>✓</span>}
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Finalidade */}
        <div style={{ position: 'relative' }}>
          <button style={pillStyle(false)} onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'final' ? null : 'final'); }}>
            Finalidade <span style={{ fontSize: '10px' }}>▾</span>
          </button>
          {openDropdown === 'final' && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,.12)', padding: '6px', zIndex: 9999, minWidth: '170px' }}>
              {['🏢 Comercial', '🏠 Residencial'].map(label => (
                <button key={label} onClick={() => setOpenDropdown(null)}
                  style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '14px', color: '#374151', textAlign: 'left' }}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mais */}
        <div style={{ position: 'relative' }}>
          <button style={pillStyle(maisCount > 0)} onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'mais' ? null : 'mais'); }}>
            {maisCount > 0 ? `Mais (${maisCount})` : 'Mais'} <span style={{ fontSize: '10px' }}>▾</span>
          </button>
          {openDropdown === 'mais' && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,.12)', padding: '20px 20px 16px', zIndex: 9999, width: '310px' }}>
              <NumSelector label="Quartos"   value={filterBedrooms} onChange={setFilterBedrooms} />
              <NumSelector label="Banheiros" value={filterBaths}    onChange={setFilterBaths} />
              <NumSelector label="Vagas"     value={filterVagas}    onChange={setFilterVagas} />
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>Preço</p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="text" placeholder="De" value={minInput} onChange={e => setMinInput(e.target.value)} style={{ flex: 1, height: '40px', padding: '0 12px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                  <span style={{ color: '#9ca3af' }}>–</span>
                  <input type="text" placeholder="Até" value={maxInput} onChange={e => setMaxInput(e.target.value)} style={{ flex: 1, height: '40px', padding: '0 12px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>Área (m²)</p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="text" placeholder="De" value={areaMinInput} onChange={e => setAreaMinInput(e.target.value)} style={{ flex: 1, height: '40px', padding: '0 12px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                  <span style={{ color: '#9ca3af' }}>–</span>
                  <input type="text" placeholder="Até" value={areaMaxInput} onChange={e => setAreaMaxInput(e.target.value)} style={{ flex: 1, height: '40px', padding: '0 12px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={applyMais} style={{ flex: 1, height: '42px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>Aplicar</button>
                <button onClick={() => { setFilterBedrooms(0); setFilterBaths(0); setFilterVagas(0); setFilterMin(0); setFilterMax(0); setFilterAreaMin(0); setFilterAreaMax(0); setMinInput(''); setMaxInput(''); setAreaMinInput(''); setAreaMaxInput(''); }}
                  style={{ height: '42px', padding: '0 16px', background: 'transparent', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>Limpar</button>
              </div>
            </div>
          )}
        </div>

        {hasFilters && (
          <button onClick={clearAll} style={{ height: '42px', padding: '0 16px', borderRadius: '21px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            ✕ Limpar filtros
          </button>
        )}
      </div>

      {geoMsg && (
        <div style={{ background: geoMsg.startsWith('❌') ? '#fef2f2' : '#f0fdf4', borderBottom: `1px solid ${geoMsg.startsWith('❌') ? '#fca5a5' : '#86efac'}`, padding: '5px 20px', fontSize: '13px', color: geoMsg.startsWith('❌') ? '#dc2626' : '#166534', fontWeight: '500', flexShrink: 0 }}>
          {geoMsg}
        </div>
      )}

      {/* ── Mapa 50% + Cards 50% — este container tem overflow:hidden ──────── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', minHeight: 0 }} className="imoveis-grid">

        {/* Mapa */}
        <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
          <MapView ref={mapRef} pins={mapPins} onBoundsChange={setBounds} onPinClick={id => router.push(`/imoveis/${id}`)} />
          {loading && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(241,245,249,.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 500, gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: '#64748b', fontSize: '13px' }}>Carregando imóveis...</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}
        </div>

        {/* Painel de cards */}
        <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e5e7eb', overflow: 'hidden', background: 'var(--bg)' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>
                {loading ? 'Carregando...' : `${visibleBuildings.length.toLocaleString('pt-BR')} imóveis`}
              </span>
              <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '6px' }}>{bounds ? 'nesta área' : 'em São Paulo'}</span>
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

          <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : visibleBuildings.length === 0 ? (
              <div style={{ padding: '60px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: '28px', marginBottom: '10px' }}>🔍</p>
                <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>Nenhum imóvel nesta área</p>
                <p style={{ fontSize: '12px', color: '#9ca3af' }}>Mova o mapa ou ajuste os filtros.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }} className="cards-grid">
                  {visibleBuildings.slice(0, displayCount).map(im => <ImovelCard key={im.id} im={im} />)}
                </div>
                {visibleBuildings.length > displayCount && (
                  <button onClick={() => setDisplayCount(c => c + 12)}
                    style={{ width: '100%', marginTop: '14px', padding: '12px', background: 'var(--primary-light)', color: 'var(--primary)', border: '1.5px solid rgba(37,99,235,.2)', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                    Ver mais {Math.min(12, visibleBuildings.length - displayCount)} imóveis
                    <span style={{ color: '#9ca3af', fontWeight: '400', marginLeft: '6px' }}>({displayCount}/{visibleBuildings.length})</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width:900px){.imoveis-grid{grid-template-columns:1fr!important;grid-template-rows:45vh 55vh}}
        @media (max-width:900px){.cards-grid{grid-template-columns:repeat(2,1fr)!important}}
        @media (max-width:600px){.cards-grid{grid-template-columns:1fr!important}}
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
