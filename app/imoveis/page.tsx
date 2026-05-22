'use client';

import { useEffect, useState, useRef, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { formatBRL } from '@/lib/calculos';
import type { MapViewHandle, Bounds } from '@/components/MapView';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Imovel {
  id: string;
  name: string;
  developer: string;
  min_price: number | null;
  max_price: number | null;
  bedrooms_min: number | null;
  bedrooms_max: number | null;
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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Card compacto para o painel lateral
// ─────────────────────────────────────────────────────────────────────────────
function ImovelCard({ im }: { im: Imovel }) {
  const sc = getStatus(im.status_norm || im.status || '');
  return (
    <Link href={`/imoveis/${im.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        display: 'flex', gap: '12px', padding: '12px', background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: '14px',
        transition: 'box-shadow 0.15s, border-color 0.15s', cursor: 'pointer',
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(37,99,235,.12)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(37,99,235,.3)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = ''; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
      >
        {/* Foto */}
        <div style={{ width: '88px', height: '72px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, background: '#E2E8F0' }}>
          {im.photo
            ? <img src={im.photo} alt={im.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🏢</div>
          }
        </div>
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ background: sc.bg, color: sc.cor, fontSize: '9px', fontWeight: '800', padding: '2px 7px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {sc.label}
            </span>
            {im.delivery_date && (
              <span style={{ fontSize: '9px', color: 'var(--text-faint)' }}>🗓 {im.delivery_date}</span>
            )}
          </div>
          <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {im.name}
          </p>
          <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {im.developer} · {im.neighborhood}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
            <span style={{ fontSize: '14px', fontWeight: '900', color: 'var(--primary)' }}>
              {im.min_price ? formatBRL(im.min_price) : 'Consultar'}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {fmtRange(im.bedrooms_min, im.bedrooms_max, 'qts') && (
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 6px' }}>
                  🛏 {fmtRange(im.bedrooms_min, im.bedrooms_max, 'qts')}
                </span>
              )}
              {im.area_min && (
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 6px' }}>
                  ▦ {im.area_min}m²
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton card
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ display: 'flex', gap: '12px', padding: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px' }}>
      <div style={{ width: '88px', height: '72px', borderRadius: '10px', background: 'var(--border)', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
        {[70, 90, 60].map((w, i) => (
          <div key={i} style={{ height: i === 1 ? '13px' : '10px', width: `${w}%`, background: 'var(--border)', borderRadius: '6px' }} />
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Conteúdo principal (separado para Suspense)
// ─────────────────────────────────────────────────────────────────────────────
function ImoveisContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // ── State ──────────────────────────────────────────────────────────────────
  const [allBuildings, setAllBuildings] = useState<Imovel[]>([]);
  const [loading, setLoading]           = useState(true);
  const [bounds, setBounds]             = useState<Bounds | null>(null);
  const [displayCount, setDisplayCount] = useState(20);

  // Filtros — inicializados com URL params (vindos do simulador)
  const [filterStatus,   setFilterStatus]   = useState(searchParams.get('status') || '');
  const [filterMin,      setFilterMin]      = useState(Number(searchParams.get('min') || 0));
  const [filterMax,      setFilterMax]      = useState(Number(searchParams.get('max') || 0));
  const [filterBedrooms, setFilterBedrooms] = useState(0);

  // Busca / geocoding
  const [search,    setSearch]    = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geoMsg,    setGeoMsg]    = useState('');

  // Filtros avançados (price inputs em texto)
  const [minInput, setMinInput] = useState(filterMin ? String(filterMin) : '');
  const [maxInput, setMaxInput] = useState(filterMax ? String(filterMax) : '');

  const mapRef = useRef<MapViewHandle>(null);

  // ── Carga inicial — todos os imóveis ──────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetch('/api/orulo?all=1')
      .then(r => r.json())
      .then(d => setAllBuildings(d.buildings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Reseta displayCount quando bounds ou filtros mudam
  useEffect(() => { setDisplayCount(20); }, [bounds, filterStatus, filterMin, filterMax, filterBedrooms]);

  // ── Pins para o mapa (sem filtro de bounds) ───────────────────────────────
  const mapPins = useMemo(() => {
    return allBuildings
      .filter(b => b.lat && b.lng)
      .filter(b => !filterMin || (b.min_price ?? 0) >= filterMin)
      .filter(b => !filterMax || (b.min_price ?? 0) <= filterMax)
      .filter(b => !filterBedrooms || (b.bedrooms_max ?? 99) >= filterBedrooms)
      .filter(b => !filterStatus || b.status_norm === filterStatus)
      .map(b => ({
        id:           b.id,
        lat:          b.lat!,
        lng:          b.lng!,
        name:         b.name,
        price:        b.min_price ? formatBRL(b.min_price) : 'Consultar',
        neighborhood: b.neighborhood,
        status:       b.status_norm || b.status,
      }));
  }, [allBuildings, filterMin, filterMax, filterBedrooms, filterStatus]);

  // ── Cards (filtrados por bounds + filtros) ───────────────────────────────
  const visibleBuildings = useMemo(() => {
    let result = allBuildings
      .filter(b => !filterMin || (b.min_price ?? 0) >= filterMin)
      .filter(b => !filterMax || (b.min_price ?? 0) <= filterMax)
      .filter(b => !filterBedrooms || (b.bedrooms_max ?? 99) >= filterBedrooms)
      .filter(b => !filterStatus || b.status_norm === filterStatus);

    if (bounds) {
      const inBounds = result.filter(b =>
        b.lat && b.lng &&
        b.lat >= bounds.sw_lat && b.lat <= bounds.ne_lat &&
        b.lng >= bounds.sw_lng && b.lng <= bounds.ne_lng,
      );
      // se há imóveis com lat/lng no viewport, mostra só eles
      if (inBounds.length > 0) return inBounds;
      // caso contrário, mostra todos os filtrados (sem lat/lng também)
    }
    return result;
  }, [allBuildings, bounds, filterMin, filterMax, filterBedrooms, filterStatus]);

  // ── Geocodificar e voar para localização ─────────────────────────────────
  const geocodeAndFly = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setGeocoding(true);
    setGeoMsg('');
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', São Paulo, Brasil')}&format=json&limit=3&countrycodes=br&accept-language=pt-BR`,
      );
      const data = await r.json();
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        mapRef.current?.flyTo(parseFloat(lat), parseFloat(lon), 14);
        setGeoMsg(`📍 ${display_name.split(',').slice(0, 2).join(',')}`);
        setTimeout(() => setGeoMsg(''), 4000);
      } else {
        setGeoMsg('❌ Localização não encontrada. Tente "Moema, SP" ou "Pinheiros".');
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
  }, [search, geocodeAndFly]);

  const applyPriceFilter = useCallback(() => {
    setFilterMin(Number(minInput.replace(/\D/g, '')) || 0);
    setFilterMax(Number(maxInput.replace(/\D/g, '')) || 0);
  }, [minInput, maxInput]);

  const clearAllFilters = useCallback(() => {
    setFilterStatus('');
    setFilterMin(0);
    setFilterMax(0);
    setFilterBedrooms(0);
    setMinInput('');
    setMaxInput('');
  }, []);

  const hasFilters = filterStatus || filterMin || filterMax || filterBedrooms;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: `calc(100vh - var(--header-h))`, overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Barra de filtros ────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '10px 16px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', zIndex: 200, flexShrink: 0 }}>

        {/* Busca por localização */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '6px', flex: '1 1 220px', minWidth: '180px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar bairro ou endereço..."
              style={{ width: '100%', paddingLeft: '32px', paddingRight: '12px', height: '36px', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '13px', outline: 'none', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          <button type="submit" disabled={geocoding}
            style={{ height: '36px', padding: '0 14px', background: geocoding ? 'var(--border)' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: geocoding ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
            {geocoding ? '...' : 'Ir'}
          </button>
        </form>

        {/* Status */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {[
            { val: '', label: 'Todos' },
            { val: 'na planta', label: '🌱 Na Planta' },
            { val: 'em obras', label: '🏗 Em Obras' },
            { val: 'pronto', label: '✅ Pronto' },
            { val: 'lançamento', label: '🚀 Lançamento' },
          ].map(({ val, label }) => (
            <button key={val} onClick={() => setFilterStatus(filterStatus === val ? '' : val)}
              style={{ height: '32px', padding: '0 12px', borderRadius: '8px', border: `1.5px solid ${filterStatus === val ? 'var(--primary)' : 'var(--border)'}`, background: filterStatus === val ? 'var(--primary-light)' : 'transparent', color: filterStatus === val ? 'var(--primary)' : 'var(--text-muted)', fontSize: '12px', fontWeight: filterStatus === val ? '700' : '500', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Quartos */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: '600' }}>Qts:</span>
          {[0, 1, 2, 3, 4].map(n => (
            <button key={n} onClick={() => setFilterBedrooms(filterBedrooms === n ? 0 : n)}
              style={{ width: '28px', height: '28px', borderRadius: '7px', border: `1.5px solid ${filterBedrooms === n && n > 0 ? 'var(--primary)' : 'var(--border)'}`, background: filterBedrooms === n && n > 0 ? 'var(--primary-light)' : 'transparent', color: filterBedrooms === n && n > 0 ? 'var(--primary)' : 'var(--text-muted)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
              {n === 0 ? '∞' : n === 4 ? '4+' : n}
            </button>
          ))}
        </div>

        {/* Preço */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <input type="text" placeholder="Mín R$" value={minInput}
            onChange={e => setMinInput(e.target.value)}
            onBlur={applyPriceFilter}
            onKeyDown={e => e.key === 'Enter' && applyPriceFilter()}
            style={{ width: '90px', height: '32px', padding: '0 8px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '12px', outline: 'none', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>—</span>
          <input type="text" placeholder="Máx R$" value={maxInput}
            onChange={e => setMaxInput(e.target.value)}
            onBlur={applyPriceFilter}
            onKeyDown={e => e.key === 'Enter' && applyPriceFilter()}
            style={{ width: '90px', height: '32px', padding: '0 8px', border: '1.5px solid var(--border)', borderRadius: '8px', fontSize: '12px', outline: 'none', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' }} />
        </div>

        {/* Limpar filtros */}
        {hasFilters && (
          <button onClick={clearAllFilters}
            style={{ height: '32px', padding: '0 12px', borderRadius: '8px', border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ✕ Limpar
          </button>
        )}
      </div>

      {/* Mensagem de geocoding */}
      {geoMsg && (
        <div style={{ background: geoMsg.startsWith('❌') ? '#FEF2F2' : '#F0FDF4', borderBottom: `1px solid ${geoMsg.startsWith('❌') ? '#FCA5A5' : '#86EFAC'}`, padding: '6px 16px', fontSize: '12px', color: geoMsg.startsWith('❌') ? '#DC2626' : '#166534', fontWeight: '500', flexShrink: 0 }}>
          {geoMsg}
        </div>
      )}

      {/* ── Área principal: mapa + cards ────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 400px', overflow: 'hidden' }} className="imoveis-grid">

        {/* Mapa */}
        <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
          <MapView
            ref={mapRef}
            pins={mapPins}
            onBoundsChange={setBounds}
            onPinClick={id => router.push(`/imoveis/${id}`)}
          />
          {/* Loading overlay */}
          {loading && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(241,245,249,.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 500, gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Carregando imóveis...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
        </div>

        {/* Painel de cards */}
        <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', overflow: 'hidden', background: 'var(--bg)' }}>

          {/* Cabeçalho do painel */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: '#fff', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text)', marginBottom: '2px' }}>
                  {loading ? 'Carregando...' : `${visibleBuildings.length.toLocaleString('pt-BR')} imóveis`}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-faint)' }}>
                  {bounds ? 'nesta área do mapa' : 'em São Paulo'}
                </p>
              </div>
              {bounds && (
                <span style={{ fontSize: '10px', color: '#7C3AED', background: '#F5F3FF', border: '1px solid #DDD6FE', padding: '3px 8px', borderRadius: '8px', fontWeight: '600' }}>
                  🗺 filtrado pelo mapa
                </span>
              )}
            </div>

            {/* Legenda de cores */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
              {[
                { color: '#2563eb', label: 'Na Planta / Lançamento' },
                { color: '#d97706', label: 'Em Obras' },
                { color: '#16a34a', label: 'Pronto / Entregue' },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lista de cards */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : visibleBuildings.length === 0
                ? (
                  <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</p>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>
                      Nenhum imóvel nesta área
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Tente mover ou ampliar o mapa, ou ajuste os filtros.
                    </p>
                  </div>
                )
                : (
                  <>
                    {visibleBuildings.slice(0, displayCount).map(im => (
                      <ImovelCard key={im.id} im={im} />
                    ))}
                    {visibleBuildings.length > displayCount && (
                      <button
                        onClick={() => setDisplayCount(c => c + 20)}
                        style={{ width: '100%', padding: '12px', background: 'var(--primary-light)', color: 'var(--primary)', border: '1.5px solid rgba(37,99,235,.2)', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', marginTop: '4px' }}>
                        Ver mais {Math.min(20, visibleBuildings.length - displayCount)} imóveis
                        <span style={{ color: 'var(--text-faint)', fontWeight: '400', marginLeft: '4px' }}>
                          ({displayCount}/{visibleBuildings.length})
                        </span>
                      </button>
                    )}
                  </>
                )
            }
          </div>
        </div>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 768px) {
          .imoveis-grid {
            grid-template-columns: 1fr !important;
            grid-template-rows: 55vh 45vh;
          }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export (com Suspense para useSearchParams)
// ─────────────────────────────────────────────────────────────────────────────
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
