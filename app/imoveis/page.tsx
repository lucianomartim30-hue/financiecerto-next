/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState, useRef, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { formatBRL } from '@/lib/calculos';
import type { MapViewHandle, Bounds } from '@/components/MapView';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────
interface Imovel {
  id: string;
  name: string;
  developer: string;
  min_price: number | null;
  max_price: number | null;
  bedrooms_min: number | null;
  bedrooms_max: number | null;
  bathrooms_min: number | null;
  bathrooms_max: number | null;
  vagas_min: number | null;
  vagas_max: number | null;
  area_min: number | null;
  area_max: number | null;
  neighborhood: string;
  city: string;
  photo: string | null;
  status: string;
  status_norm: string;
  lat: number | null;
  lng: number | null;
  delivery_date: string | null;
}

// ─── Status helpers ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { cor: string; bg: string; label: string }> = {
  'na planta':  { cor: '#2563eb', bg: 'rgba(37,99,235,.15)',  label: 'Na Planta' },
  'lançamento': { cor: '#7c3aed', bg: 'rgba(124,58,237,.15)', label: 'Lançamento' },
  'em obras':   { cor: '#d97706', bg: 'rgba(217,119,6,.15)',  label: 'Em Obras' },
  'pronto':     { cor: '#16a34a', bg: 'rgba(22,163,74,.15)',  label: 'Pronto' },
};
function getStatus(s: string) {
  const k = (s || '').toLowerCase().trim();
  if (STATUS_CFG[k]) return STATUS_CFG[k];
  if (k.includes('planta') || k.includes('lança')) return STATUS_CFG['na planta'];
  if (k.includes('constru') || k.includes('obra') || k.includes('andamento')) return STATUS_CFG['em obras'];
  if (k.includes('pronto') || k.includes('entreg') || k.includes('conclui')) return STATUS_CFG['pronto'];
  return { cor: '#475569', bg: 'rgba(71,85,105,.15)', label: s || 'Outros' };
}

function fmtRange(min: number | null, max: number | null, unit: string) {
  if (!min) return null;
  if (max && max !== min) return `${min}–${max} ${unit}`;
  return `${min} ${unit}`;
}

// ─── Vertical Card ─────────────────────────────────────────────────────────────
function ImovelCard({ im }: { im: Imovel }) {
  const sc = getStatus(im.status_norm || im.status || '');
  return (
    <Link href={`/imoveis/${im.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '14px', overflow: 'hidden', cursor: 'pointer',
          transition: 'box-shadow 0.15s, border-color 0.15s', height: '100%',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(37,99,235,.14)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(37,99,235,.35)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        }}
      >
        {/* Foto */}
        <div style={{ width: '100%', height: '130px', background: '#E2E8F0', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
          {im.photo
            ? <img src={im.photo} alt={im.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', color: '#94a3b8' }}>🏢</div>
          }
          <span style={{
            position: 'absolute', top: '8px', left: '8px',
            background: sc.cor, color: '#fff', fontSize: '9px', fontWeight: '800',
            padding: '3px 8px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.4px',
          }}>
            {sc.label}
          </span>
        </div>

        {/* Info */}
        <div style={{ padding: '10px 11px 11px' }}>
          <p style={{
            fontSize: '12px', fontWeight: '700', color: 'var(--text)', marginBottom: '2px',
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            lineHeight: '1.35',
          }}>
            {im.name}
          </p>
          <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginBottom: '7px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {im.neighborhood || im.city}
          </p>
          <p style={{ fontSize: '13px', fontWeight: '900', color: 'var(--primary)', marginBottom: '7px', lineHeight: '1' }}>
            {im.min_price ? formatBRL(im.min_price) : 'Consultar'}
          </p>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {fmtRange(im.bedrooms_min, im.bedrooms_max, 'qts') && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '5px', padding: '1px 5px' }}>
                🛏 {fmtRange(im.bedrooms_min, im.bedrooms_max, 'qts')}
              </span>
            )}
            {im.area_min && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '5px', padding: '1px 5px' }}>
                ▦ {im.area_min}m²
              </span>
            )}
            {fmtRange(im.vagas_min, im.vagas_max, 'vg') && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '5px', padding: '1px 5px' }}>
                🅿 {fmtRange(im.vagas_min, im.vagas_max, 'vg')}
              </span>
            )}
          </div>
          {im.delivery_date && (
            <p style={{ fontSize: '9px', color: 'var(--text-faint)', marginTop: '6px' }}>
              🗓 {im.delivery_date}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '130px', background: 'var(--border)' }} />
      <div style={{ padding: '10px 11px 11px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {[80, 55, 45, 70].map((w, i) => (
          <div key={i} style={{ height: i === 2 ? '14px' : '9px', width: `${w}%`, background: 'var(--border)', borderRadius: '5px' }} />
        ))}
      </div>
    </div>
  );
}

// ─── Selector de quantidade (quartos / vagas / etc.) ───────────────────────────
function NumSelector({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', marginBottom: '7px' }}>{label}</p>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[0, 1, 2, 3, 4].map(n => {
          const active = value === n && n > 0;
          return (
            <button key={n} onClick={() => onChange(active ? 0 : n)} style={{
              width: '40px', height: '40px', borderRadius: '8px',
              border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
              background: active ? 'var(--primary-light)' : '#fff',
              color: active ? 'var(--primary)' : 'var(--text-muted)',
              fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            }}>
              {n === 0 ? '∞' : n === 4 ? '4+' : n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Conteúdo principal ────────────────────────────────────────────────────────
function ImoveisContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // ── State ──────────────────────────────────────────────────────────────────
  const [allBuildings, setAllBuildings] = useState<Imovel[]>([]);
  const [loading, setLoading]           = useState(true);
  const [bounds, setBounds]             = useState<Bounds | null>(null);
  const [displayCount, setDisplayCount] = useState(12);

  // Filtros
  const [filterStatus,   setFilterStatus]   = useState(searchParams.get('status') || '');
  const [filterMin,      setFilterMin]      = useState(Number(searchParams.get('min') || 0));
  const [filterMax,      setFilterMax]      = useState(Number(searchParams.get('max') || 0));
  const [filterBedrooms, setFilterBedrooms] = useState(0);
  const [filterVagas,    setFilterVagas]    = useState(0);
  const [filterBaths,    setFilterBaths]    = useState(0);
  const [filterAreaMin,  setFilterAreaMin]  = useState(0);
  const [filterAreaMax,  setFilterAreaMax]  = useState(0);

  // UI
  const [openDropdown,   setOpenDropdown]   = useState<string | null>(null);
  const [search,         setSearch]         = useState('');
  const [geocoding,      setGeocoding]      = useState(false);
  const [geoMsg,         setGeoMsg]         = useState('');

  // Inputs em texto para preço e área
  const [minInput,     setMinInput]     = useState(filterMin ? String(filterMin) : '');
  const [maxInput,     setMaxInput]     = useState(filterMax ? String(filterMax) : '');
  const [areaMinInput, setAreaMinInput] = useState('');
  const [areaMaxInput, setAreaMaxInput] = useState('');

  const mapRef       = useRef<MapViewHandle>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch('/api/orulo?all=1')
      .then(r => r.json())
      .then(d => setAllBuildings(d.buildings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Reset displayCount quando filtros mudam
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setDisplayCount(12); }, [bounds, filterStatus, filterMin, filterMax, filterBedrooms, filterVagas, filterBaths, filterAreaMin, filterAreaMax]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  // ── Filtro base (sem bounds) ───────────────────────────────────────────────
  const baseFilter = useCallback((b: Imovel) => {
    if (filterMin    && (b.min_price   ?? 0)  < filterMin)    return false;
    if (filterMax    && (b.min_price   ?? 0)  > filterMax)    return false;
    if (filterBedrooms && (b.bedrooms_max ?? 99) < filterBedrooms) return false;
    if (filterVagas  && (b.vagas_max   ?? 99) < filterVagas)  return false;
    if (filterBaths  && (b.bathrooms_max ?? 99) < filterBaths) return false;
    if (filterAreaMin && (b.area_max   ?? 0)  < filterAreaMin) return false;
    if (filterAreaMax && (b.area_min   ?? 0)  > filterAreaMax) return false;
    if (filterStatus && b.status_norm !== filterStatus) return false;
    return true;
  }, [filterMin, filterMax, filterBedrooms, filterVagas, filterBaths, filterAreaMin, filterAreaMax, filterStatus]);

  // ── Pins do mapa (filtrados + em bounds com buffer) ────────────────────────
  const mapPins = useMemo(() => {
    let list = allBuildings.filter(b => b.lat && b.lng).filter(baseFilter);

    if (bounds) {
      const latBuf = (bounds.ne_lat - bounds.sw_lat) * 0.3;
      const lngBuf = (bounds.ne_lng - bounds.sw_lng) * 0.3;
      list = list.filter(b =>
        b.lat! >= bounds.sw_lat - latBuf && b.lat! <= bounds.ne_lat + latBuf &&
        b.lng! >= bounds.sw_lng - lngBuf && b.lng! <= bounds.ne_lng + lngBuf,
      );
    }

    return list.map(b => ({
      id:           b.id,
      lat:          b.lat!,
      lng:          b.lng!,
      name:         b.name,
      price:        b.min_price ? formatBRL(b.min_price) : 'Consultar',
      neighborhood: b.neighborhood,
      status:       b.status_norm || b.status,
    }));
  }, [allBuildings, bounds, baseFilter]);

  // ── Cards (filtrados + em bounds exatos) ──────────────────────────────────
  const visibleBuildings = useMemo(() => {
    const result = allBuildings.filter(baseFilter);
    if (bounds) {
      const inBounds = result.filter(b =>
        b.lat && b.lng &&
        b.lat >= bounds.sw_lat && b.lat <= bounds.ne_lat &&
        b.lng >= bounds.sw_lng && b.lng <= bounds.ne_lng,
      );
      if (inBounds.length > 0) return inBounds;
    }
    return result;
  }, [allBuildings, bounds, baseFilter]);

  // ── Geocoding ──────────────────────────────────────────────────────────────
  const geocodeAndFly = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setGeocoding(true);
    setGeoMsg('');
    try {
      const r    = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', São Paulo, Brasil')}&format=json&limit=3&countrycodes=br&accept-language=pt-BR`);
      const data = await r.json();
      if (data.length > 0) {
        mapRef.current?.flyTo(parseFloat(data[0].lat), parseFloat(data[0].lon), 14);
        setGeoMsg(`📍 ${data[0].display_name.split(',').slice(0, 2).join(',')}`);
        setTimeout(() => setGeoMsg(''), 4000);
      } else {
        setGeoMsg('❌ Localização não encontrada. Tente "Moema" ou "Pinheiros".');
        setTimeout(() => setGeoMsg(''), 4000);
      }
    } catch {
      setGeoMsg('❌ Erro ao buscar localização.');
      setTimeout(() => setGeoMsg(''), 3000);
    } finally {
      setGeocoding(false);
    }
  }, []);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    geocodeAndFly(search);
    setOpenDropdown(null);
  }, [search, geocodeAndFly]);

  const applyPriceArea = useCallback(() => {
    setFilterMin(Number(minInput.replace(/\D/g, '')) || 0);
    setFilterMax(Number(maxInput.replace(/\D/g, '')) || 0);
    setFilterAreaMin(Number(areaMinInput.replace(/\D/g, '')) || 0);
    setFilterAreaMax(Number(areaMaxInput.replace(/\D/g, '')) || 0);
  }, [minInput, maxInput, areaMinInput, areaMaxInput]);

  const clearAll = useCallback(() => {
    setFilterStatus(''); setFilterMin(0); setFilterMax(0);
    setFilterBedrooms(0); setFilterVagas(0); setFilterBaths(0);
    setFilterAreaMin(0); setFilterAreaMax(0);
    setMinInput(''); setMaxInput(''); setAreaMinInput(''); setAreaMaxInput('');
    setOpenDropdown(null);
  }, []);

  const hasFilters = !!(filterStatus || filterMin || filterMax || filterBedrooms || filterVagas || filterBaths || filterAreaMin || filterAreaMax);
  const maisCount  = [filterBedrooms, filterVagas, filterBaths, filterMin, filterMax, filterAreaMin, filterAreaMax].filter(Boolean).length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: `calc(100vh - var(--header-h))`, overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Barra de filtros estilo Orulo ──────────────────────────────────── */}
      <div ref={filterBarRef} style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center', zIndex: 300, flexShrink: 0, flexWrap: 'wrap', position: 'relative' }}>

        {/* Busca */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '6px', flex: '1 1 220px', minWidth: '160px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', pointerEvents: 'none', color: '#94a3b8' }}>🔍</span>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar bairro ou endereço..."
              style={{ width: '100%', paddingLeft: '30px', paddingRight: '10px', height: '36px', border: '1.5px solid var(--border)', borderRadius: '20px', fontSize: '13px', outline: 'none', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
          </div>
          <button type="submit" disabled={geocoding} style={{ height: '36px', padding: '0 16px', background: geocoding ? 'var(--border)' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: '20px', fontSize: '13px', fontWeight: '700', cursor: geocoding ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
            {geocoding ? '...' : 'Ir'}
          </button>
        </form>

        {/* Separador */}
        <div style={{ width: '1px', height: '24px', background: 'var(--border)', flexShrink: 0 }} />

        {/* Estágio dropdown */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')} style={{
            height: '36px', padding: '0 14px', borderRadius: '20px',
            border: `1.5px solid ${filterStatus ? 'var(--primary)' : 'var(--border)'}`,
            background: filterStatus ? 'var(--primary-light)' : '#fff',
            color: filterStatus ? 'var(--primary)' : 'var(--text-muted)',
            fontSize: '13px', fontWeight: filterStatus ? '700' : '500',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap',
          }}>
            {filterStatus ? getStatus(filterStatus).label : 'Estágio'} <span style={{ fontSize: '9px' }}>▾</span>
          </button>

          {openDropdown === 'status' && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: '14px', boxShadow: '0 8px 30px rgba(0,0,0,.12)', padding: '8px', zIndex: 400, minWidth: '170px' }}>
              {[
                { val: '', label: 'Todos os estágios' },
                { val: 'na planta', label: '🌱 Na Planta' },
                { val: 'lançamento', label: '🚀 Lançamento' },
                { val: 'em obras', label: '🏗 Em Obras' },
                { val: 'pronto', label: '✅ Pronto / Entregue' },
              ].map(({ val, label }) => (
                <button key={val} onClick={() => { setFilterStatus(val); setOpenDropdown(null); }} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                  padding: '9px 12px', background: filterStatus === val ? 'var(--primary-light)' : 'transparent',
                  border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '13px',
                  fontWeight: filterStatus === val ? '700' : '400',
                  color: filterStatus === val ? 'var(--primary)' : 'var(--text)',
                  textAlign: 'left',
                }}>
                  {filterStatus === val && <span style={{ fontSize: '10px', color: 'var(--primary)' }}>✓</span>}
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mais dropdown */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setOpenDropdown(openDropdown === 'mais' ? null : 'mais')} style={{
            height: '36px', padding: '0 14px', borderRadius: '20px',
            border: `1.5px solid ${maisCount > 0 ? 'var(--primary)' : 'var(--border)'}`,
            background: maisCount > 0 ? 'var(--primary-light)' : '#fff',
            color: maisCount > 0 ? 'var(--primary)' : 'var(--text-muted)',
            fontSize: '13px', fontWeight: maisCount > 0 ? '700' : '500',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap',
          }}>
            Mais{maisCount > 0 ? ` (${maisCount})` : ''} <span style={{ fontSize: '9px' }}>▾</span>
          </button>

          {openDropdown === 'mais' && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: '14px', boxShadow: '0 8px 30px rgba(0,0,0,.12)', padding: '18px 18px 14px', zIndex: 400, width: '290px' }}>
              <NumSelector label="Quartos" value={filterBedrooms} onChange={setFilterBedrooms} />
              <NumSelector label="Banheiros" value={filterBaths} onChange={setFilterBaths} />
              <NumSelector label="Vagas" value={filterVagas} onChange={setFilterVagas} />

              {/* Preço */}
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', marginBottom: '7px' }}>Preço</p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="text" placeholder="De" value={minInput} onChange={e => setMinInput(e.target.value)}
                    style={{ flex: 1, height: '36px', padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '12px', outline: 'none', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)' }} />
                  <span style={{ color: 'var(--text-faint)', fontSize: '12px' }}>–</span>
                  <input type="text" placeholder="Até" value={maxInput} onChange={e => setMaxInput(e.target.value)}
                    style={{ flex: 1, height: '36px', padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '12px', outline: 'none', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)' }} />
                </div>
              </div>

              {/* Área */}
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', marginBottom: '7px' }}>Área (m²)</p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="text" placeholder="De" value={areaMinInput} onChange={e => setAreaMinInput(e.target.value)}
                    style={{ flex: 1, height: '36px', padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '12px', outline: 'none', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)' }} />
                  <span style={{ color: 'var(--text-faint)', fontSize: '12px' }}>–</span>
                  <input type="text" placeholder="Até" value={areaMaxInput} onChange={e => setAreaMaxInput(e.target.value)}
                    style={{ flex: 1, height: '36px', padding: '0 10px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '12px', outline: 'none', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)' }} />
                </div>
              </div>

              {/* Botões aplicar/limpar */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { applyPriceArea(); setOpenDropdown(null); }} style={{ flex: 1, height: '36px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  Aplicar
                </button>
                <button onClick={() => {
                  setFilterBedrooms(0); setFilterBaths(0); setFilterVagas(0);
                  setFilterMin(0); setFilterMax(0); setFilterAreaMin(0); setFilterAreaMax(0);
                  setMinInput(''); setMaxInput(''); setAreaMinInput(''); setAreaMaxInput('');
                }} style={{ height: '36px', padding: '0 14px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '9px', fontSize: '12px', cursor: 'pointer' }}>
                  Limpar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Limpar todos */}
        {hasFilters && (
          <button onClick={clearAll} style={{ height: '36px', padding: '0 14px', borderRadius: '20px', border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Mensagem geocoding */}
      {geoMsg && (
        <div style={{ background: geoMsg.startsWith('❌') ? '#FEF2F2' : '#F0FDF4', borderBottom: `1px solid ${geoMsg.startsWith('❌') ? '#FCA5A5' : '#86EFAC'}`, padding: '5px 16px', fontSize: '12px', color: geoMsg.startsWith('❌') ? '#DC2626' : '#166534', fontWeight: '500', flexShrink: 0 }}>
          {geoMsg}
        </div>
      )}

      {/* ── Layout: mapa (50%) + cards (50%) ───────────────────────────────── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden', minHeight: 0 }} className="imoveis-grid">

        {/* Mapa */}
        <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
          <MapView
            ref={mapRef}
            pins={mapPins}
            onBoundsChange={setBounds}
            onPinClick={id => router.push(`/imoveis/${id}`)}
          />
          {loading && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(241,245,249,.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 500, gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Carregando imóveis...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
        </div>

        {/* Painel de cards */}
        <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', overflow: 'hidden', background: 'var(--bg)' }}>

          {/* Cabeçalho */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text)' }}>
                {loading ? 'Carregando...' : `${visibleBuildings.length.toLocaleString('pt-BR')} imóveis`}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-faint)', marginLeft: '6px' }}>
                {bounds ? 'nesta área' : 'em São Paulo'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Legenda */}
              {[{ c: '#2563eb', l: 'Na Planta' }, { c: '#d97706', l: 'Em Obras' }, { c: '#16a34a', l: 'Pronto' }].map(({ c, l }) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, flexShrink: 0 }} />
                  <span style={{ fontSize: '9px', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grid de cards */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : visibleBuildings.length === 0 ? (
              <div style={{ padding: '60px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: '30px', marginBottom: '10px' }}>🔍</p>
                <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>
                  Nenhum imóvel nesta área
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Mova o mapa ou ajuste os filtros.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }} className="cards-grid">
                  {visibleBuildings.slice(0, displayCount).map(im => (
                    <ImovelCard key={im.id} im={im} />
                  ))}
                </div>
                {visibleBuildings.length > displayCount && (
                  <button
                    onClick={() => setDisplayCount(c => c + 12)}
                    style={{ width: '100%', marginTop: '12px', padding: '11px', background: 'var(--primary-light)', color: 'var(--primary)', border: '1.5px solid rgba(37,99,235,.2)', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Ver mais {Math.min(12, visibleBuildings.length - displayCount)} imóveis
                    <span style={{ color: 'var(--text-faint)', fontWeight: '400', marginLeft: '6px' }}>
                      ({displayCount}/{visibleBuildings.length})
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 900px) {
          .imoveis-grid {
            grid-template-columns: 1fr !important;
            grid-template-rows: 45vh 55vh;
          }
          .cards-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 600px) {
          .cards-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function ImoveisPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
      </div>
    }>
      <ImoveisContent />
    </Suspense>
  );
}
