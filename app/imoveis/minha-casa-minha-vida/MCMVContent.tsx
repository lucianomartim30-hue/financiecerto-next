'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatBRL } from '@/lib/calculos';
import { getStatusCfg } from '@/lib/status';
import type { MCMVFaixaStat } from '@/lib/mcmv-catalog';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
interface Imovel {
  id: string; name: string; developer: string;
  min_price: number | null; max_price: number | null;
  bedrooms_min: number | null; bedrooms_max: number | null;
  area_min: number | null; area_max: number | null;
  bathrooms_min: number | null; bathrooms_max: number | null;
  vagas_min: number | null; vagas_max: number | null;
  neighborhood: string; city: string; state: string;
  photo: string | null; orulo_url: string | null; sharing_url: string | null;
  status: string; address_full: string; street: string; number: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Skeleton
// ──────────────────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ height: '178px', background: 'var(--border)', animation: 'pulse 1.4s ease infinite' }} />
      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[60, 80, 45, 90].map((w, i) => (
          <div key={i} style={{ height: i === 1 ? '14px' : '11px', width: `${w}%`, background: 'var(--border)', borderRadius: '6px', animation: 'pulse 1.4s ease infinite' }} />
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Card Imóvel
// ──────────────────────────────────────────────────────────────────────────────
function CardImovel({ imovel: b }: { imovel: Imovel }) {
  const [imgErr, setImgErr] = useState(false);
  const [hover, setHover] = useState(false);
  const router = useRouter();

  const preco      = b.min_price ? `A partir de ${formatBRL(b.min_price)}` : 'Preço sob consulta';
  const statusCfg  = getStatusCfg(b.status || '');

  function faixa(min: number | null, max: number | null, unit: string) {
    if (!min) return null;
    if (max && max !== min) return `${min}–${max} ${unit}`;
    return `${min} ${unit}`;
  }

  const specs = [
    faixa(b.area_min,      b.area_max,      'm²')    && { icon: '▦',  label: faixa(b.area_min, b.area_max, 'm²')! },
    faixa(b.bedrooms_min,  b.bedrooms_max,  b.bedrooms_min === 1 ? 'quarto' : 'qts') && { icon: '🛏', label: faixa(b.bedrooms_min, b.bedrooms_max, b.bedrooms_min === 1 ? 'quarto' : 'qts')! },
    faixa(b.bathrooms_min, b.bathrooms_max, 'ban.')   && { icon: '🚿', label: faixa(b.bathrooms_min, b.bathrooms_max, 'ban.')! },
    faixa(b.vagas_min,     b.vagas_max,     b.vagas_min === 1 ? 'vaga' : 'vagas') && { icon: '🚗', label: faixa(b.vagas_min, b.vagas_max, b.vagas_min === 1 ? 'vaga' : 'vagas')! },
  ].filter(Boolean) as { icon: string; label: string }[];

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => router.push(`/imoveis/${b.id}`)}
      style={{
        background: 'var(--bg-card)', borderRadius: '14px',
        border: `1.5px solid ${hover ? 'var(--primary)' : 'var(--border)'}`,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        transition: 'all 0.18s', cursor: 'pointer',
        boxShadow: hover ? '0 6px 24px rgba(37,99,235,.13)' : '0 1px 4px rgba(0,0,0,.05)',
        transform: hover ? 'translateY(-2px)' : 'none',
      }}
    >
      <div style={{ height: '178px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {b.photo && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.photo} alt={b.name} onError={() => setImgErr(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover',
              transform: hover ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 0.4s cubic-bezier(.4,0,.2,1)' }} />
        ) : (
          <div style={{ width: '100%', height: '100%',
            background: 'linear-gradient(145deg, #1e3a5f 0%, #0f2744 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '32px' }}>🏙️</span>
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '70px',
          background: 'linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 100%)',
          pointerEvents: 'none' }} />
        {b.status && (
          <div style={{ position: 'absolute', top: '7px', left: '7px',
            background: statusCfg.cor, color: '#fff',
            fontSize: '9px', fontWeight: '800', padding: '3px 7px',
            borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            {statusCfg.label}
          </div>
        )}
        {(b.neighborhood || b.city) && (
          <p style={{ position: 'absolute', bottom: '9px', left: '10px',
            fontSize: '10px', color: 'rgba(255,255,255,.9)', fontWeight: '600', margin: 0 }}>
            📍 {b.neighborhood || b.city}{b.city && b.neighborhood ? `, ${b.city}` : ''}
          </p>
        )}
      </div>

      <div style={{ padding: '14px 14px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {b.developer && (
          <p style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-faint)',
            textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
            {b.developer}
          </p>
        )}
        <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)',
          lineHeight: 1.35, marginBottom: '10px' }}>
          {b.name}
        </h3>

        {specs.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap',
            marginBottom: '10px', paddingBottom: '10px',
            borderBottom: '1px solid var(--border)' }}>
            {specs.map(({ icon, label }, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '3px',
                fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                <span style={{ fontSize: '12px' }}>{icon}</span> {label}
              </span>
            ))}
          </div>
        )}

        <p style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', margin: '0 0 10px' }}>
          {preco}
        </p>

        <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
          <Link
            href={`/simulador?preco_imovel=${b.min_price || ''}&nome_imovel=${encodeURIComponent(b.name)}`}
            onClick={e => {
              e.stopPropagation();
              import('@/lib/gtag').then(m => m.trackCtaClick({ origem: 'card_imovel_mcmv', destino: '/simulador', texto: 'Simular' }));
            }}
            style={{ flex: 1, background: 'var(--primary)', color: '#fff',
              padding: '8px 10px', borderRadius: '8px', fontSize: '11px',
              fontWeight: '700', textAlign: 'center', textDecoration: 'none', display: 'block' }}>
            Simular
          </Link>
          <Link
            href={`/imoveis/${b.id}`}
            onClick={e => e.stopPropagation()}
            style={{ flex: 1, background: 'var(--bg)', border: '1.5px solid var(--border)',
              color: 'var(--text-muted)', padding: '8px 10px', borderRadius: '8px',
              fontSize: '11px', fontWeight: '600', textAlign: 'center',
              textDecoration: 'none', display: 'block' }}>
            Ver mais
          </Link>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Pill
// ──────────────────────────────────────────────────────────────────────────────
function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: '99px', fontSize: '12px',
      fontWeight: active ? '700' : '500', cursor: 'pointer', border: '1.5px solid',
      borderColor: active ? 'var(--primary)' : 'var(--border)',
      background: active ? 'var(--primary-light)' : 'var(--bg-card)',
      color: active ? 'var(--primary)' : 'var(--text-muted)',
      transition: 'all 0.15s', whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  );
}

function fmtUnidades(n: number): string {
  if (n >= 1000) return `${Math.round(n / 100) / 10} mil`.replace('.', ',');
  return String(n);
}

// ──────────────────────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────────────────────
export default function MCMVContent({
  stats,
  searchParams,
}: {
  stats: MCMVFaixaStat[];
  searchParams: Record<string, string>;
}) {
  const router = useRouter();

  const faixaValida = ['faixa12', 'faixa3', 'faixa4'].includes(searchParams.faixa) ? searchParams.faixa : 'faixa4';
  const [faixaKey, setFaixaKey] = useState<'faixa12' | 'faixa3' | 'faixa4'>(faixaValida as 'faixa12' | 'faixa3' | 'faixa4');
  const faixaAtual = stats.find(s => s.key === faixaKey) ?? stats[stats.length - 1];

  const [quartos,      setQuartos]      = useState(searchParams.quartos || 'todos');
  const [statusFilter, setStatusFilter] = useState(searchParams.status  || 'todos');
  const [sortBy,        setSortBy]      = useState<'relevancia' | 'menor-preco' | 'maior-preco'>('relevancia');
  const [showAdvanced,  setShowAdvanced] = useState(false);

  const [imoveis,     setImoveis]     = useState<Imovel[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [total,       setTotal]       = useState(0);
  const [pages,       setPages]       = useState(1);
  const [page,        setPage]        = useState(1);
  const [erro,        setErro]        = useState('');
  const [loadingMore, setLoadingMore] = useState(false);

  function setUrlParam(key: string, value: string) {
    const url = new URL(window.location.href);
    if (value && value !== 'todos') url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    router.replace(url.pathname + url.search, { scroll: false });
  }

  const buscar = useCallback(async (p = 1, append = false) => {
    if (!faixaAtual) return;
    if (p === 1) setLoading(true); else setLoadingMore(true);
    setErro('');
    try {
      const params = new URLSearchParams({
        residencial: '1',
        max_price:   String(faixaAtual.teto),
        page:        String(p),
      });
      if (quartos !== 'todos') {
        if (quartos === '4+') {
          params.set('bedrooms_min', '4'); params.set('bedrooms_max', '99');
        } else {
          params.set('bedrooms_min', quartos); params.set('bedrooms_max', quartos);
        }
      }
      if (statusFilter !== 'todos') params.set('status', statusFilter);

      const res  = await fetch(`/api/orulo?${params}`);
      if (!res.ok) throw new Error('Erro');
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setPage(p);
      setImoveis(prev => append ? [...prev, ...(data.buildings || [])] : (data.buildings || []));
    } catch {
      setErro('Não foi possível carregar os imóveis. Tente novamente.');
    } finally {
      setLoading(false); setLoadingMore(false);
    }
  }, [faixaAtual, quartos, statusFilter]);

  useEffect(() => { buscar(1); }, [buscar]);

  const imoveisSorted = [...imoveis].sort((a, b) => {
    if (sortBy === 'menor-preco') return (a.min_price ?? 0) - (b.min_price ?? 0);
    if (sortBy === 'maior-preco') return (b.min_price ?? 0) - (a.min_price ?? 0);
    return 0;
  });

  const cidadesComImoveis = [...new Set(imoveis.map(i => i.city).filter(Boolean))].sort();

  const quartosPills = [
    { key: 'todos', label: 'Todos' },
    { key: '1',     label: '1 quarto' },
    { key: '2',     label: '2 quartos' },
    { key: '3',     label: '3 quartos' },
    { key: '4+',    label: '4+ quartos' },
  ];
  const statusPills = [
    { key: 'todos',       label: 'Qualquer estágio' },
    { key: 'na planta',   label: 'Na Planta' },
    { key: 'lançamento',  label: 'Lançamento' },
    { key: 'em obras',    label: 'Em Obras' },
    { key: 'pronto',      label: 'Pronto' },
  ];

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(160deg, #0f172a 0%, #1a2e4a 60%, #0f172a 100%)',
        padding: '48px 24px 72px',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          <nav style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '11px', color: 'rgba(255,255,255,.35)', marginBottom: '28px',
          }}>
            <Link href="/"        style={{ color: 'inherit', textDecoration: 'none' }}>Início</Link>
            <span>›</span>
            <Link href="/imoveis" style={{ color: 'inherit', textDecoration: 'none' }}>Imóveis</Link>
            <span>›</span>
            <span style={{ color: 'rgba(255,255,255,.7)', fontWeight: '600' }}>Minha Casa Minha Vida</span>
          </nav>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ maxWidth: '640px' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: '#475569', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '10px' }}>
                PROGRAMA HABITACIONAL FEDERAL
              </p>
              <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '800', color: '#fff', lineHeight: 1.15, marginBottom: '14px' }}>
                Imóveis Minha Casa Minha Vida
              </h1>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.55)', lineHeight: 1.6, marginBottom: '10px' }}>
                Empreendimentos com preço dentro do teto de alguma faixa do MCMV, das Faixas 1 a 4.
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.4)', lineHeight: 1.6 }}>
                A elegibilidade também depende da sua renda — o preço estar dentro do teto não garante aprovação.{' '}
                <Link href="/simulador" style={{ color: '#93c5fd', textDecoration: 'underline' }}>Simule seu perfil</Link> pra confirmar.
              </p>
            </div>

            <Link href="/simulador" style={{
              display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
              background: 'rgba(37,99,235,.18)', border: '1px solid rgba(37,99,235,.35)',
              color: '#93c5fd', padding: '12px 22px', borderRadius: '12px',
              fontSize: '13px', fontWeight: '700', textDecoration: 'none',
              backdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
            }}>
              <span>💰</span> Simular financiamento MCMV
            </Link>
          </div>

          {/* Faixa tabs */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '32px', flexWrap: 'wrap' }}>
            {stats.map(s => (
              <button
                key={s.key}
                onClick={() => { setFaixaKey(s.key); setUrlParam('faixa', s.key); }}
                style={{
                  padding: '10px 16px', borderRadius: '12px', cursor: 'pointer',
                  border: `1.5px solid ${faixaKey === s.key ? '#60a5fa' : 'rgba(255,255,255,.15)'}`,
                  background: faixaKey === s.key ? 'rgba(37,99,235,.22)' : 'rgba(255,255,255,.05)',
                  textAlign: 'left', fontFamily: 'inherit',
                }}
              >
                <p style={{ fontSize: '13px', fontWeight: '700', color: faixaKey === s.key ? '#93c5fd' : '#fff', margin: 0 }}>
                  {s.label} · até {formatBRL(s.teto)}
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.45)', margin: '2px 0 0' }}>
                  {s.empreendimentos.toLocaleString('pt-BR')} empreendimentos
                  {s.unidades > 0 ? ` · ${fmtUnidades(s.unidades)} unidades` : ''}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Filter bar sticky ────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        padding: '12px 24px', position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,.07)',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setShowAdvanced(v => !v)} style={{
              background:   showAdvanced ? 'var(--primary-light)' : 'var(--bg)',
              color:        showAdvanced ? 'var(--primary)'       : 'var(--text-muted)',
              border:       `1.5px solid ${showAdvanced ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: '10px', padding: '8px 14px', fontSize: '13px',
              fontWeight: '600', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '5px',
            }}>
              <span>⚙️</span> Filtros
              <span style={{ fontSize: '10px', transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform .2s', display: 'inline-block' }}>▼</span>
            </button>

            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} style={{
              padding: '8px 28px 8px 10px', border: '1.5px solid var(--border)',
              borderRadius: '10px', fontSize: '13px',
              background: 'var(--bg)', color: 'var(--text)',
              fontFamily: 'inherit', cursor: 'pointer', outline: 'none', appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
            }}>
              <option value="relevancia">Relevância</option>
              <option value="menor-preco">Menor preço</option>
              <option value="maior-preco">Maior preço</option>
            </select>

            {(quartos !== 'todos' || statusFilter !== 'todos') && !showAdvanced && (
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                {quartos !== 'todos' && <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '700', background: 'rgba(37,99,235,.1)', color: 'var(--primary)', border: '1px solid rgba(37,99,235,.2)' }}>🛏 {quartosPills.find(p => p.key === quartos)?.label}</span>}
                {statusFilter !== 'todos' && <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '700', background: getStatusCfg(statusFilter).bg, color: getStatusCfg(statusFilter).cor, border: `1px solid ${getStatusCfg(statusFilter).cor}40` }}>{getStatusCfg(statusFilter).label}</span>}
              </div>
            )}
          </div>

          {showAdvanced && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '7px' }}>Quartos</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {quartosPills.map(({ key, label }) => (
                    <Pill key={key} label={label} active={quartos === key}
                      onClick={() => { setQuartos(key); setUrlParam('quartos', key); }} />
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '7px' }}>Estágio da obra</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {statusPills.map(({ key, label }) => (
                    <Pill key={key} label={label} active={statusFilter === key}
                      onClick={() => { setStatusFilter(key); setUrlParam('status', key); }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Conteúdo ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px 80px' }}>

        {erro && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px 18px', marginBottom: '24px' }}>
            <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>⚠️ {erro}</p>
          </div>
        )}

        {!loading && !erro && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              {imoveisSorted.length > 0
                ? <><strong style={{ color: 'var(--text)' }}>{imoveisSorted.length}</strong> de <strong style={{ color: 'var(--text)' }}>{total}</strong> imóveis até <strong style={{ color: 'var(--text)' }}>{formatBRL(faixaAtual?.teto ?? 0)}</strong></>
                : `Nenhum imóvel encontrado com esses filtros`}
            </p>
          </div>
        )}

        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && imoveisSorted.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            {imoveisSorted.map(b => <CardImovel key={b.id} imovel={b} />)}
          </div>
        )}

        {!loading && imoveisSorted.length === 0 && !erro && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</p>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>
              Nenhum imóvel com esses filtros
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Tente uma faixa mais ampla ou remova alguns filtros.
            </p>
            {(quartos !== 'todos' || statusFilter !== 'todos') && (
              <button onClick={() => { setQuartos('todos'); setStatusFilter('todos'); }}
                style={{ padding: '12px 24px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', color: 'var(--text-muted)' }}>
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {!loading && pages > page && imoveisSorted.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button onClick={() => buscar(page + 1, true)} disabled={loadingMore} style={{
              background: 'transparent', color: 'var(--primary)',
              border: '1.5px solid var(--primary)', borderRadius: '12px',
              padding: '12px 32px', fontSize: '14px', fontWeight: '700',
              cursor: loadingMore ? 'default' : 'pointer', opacity: loadingMore ? 0.6 : 1,
            }}>
              {loadingMore ? 'Carregando...' : 'Ver mais imóveis →'}
            </button>
          </div>
        )}

        {!loading && cidadesComImoveis.length > 0 && (
          <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Cidades com imóveis nesta faixa
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {cidadesComImoveis.map(c => (
                <span key={c} style={{
                  padding: '6px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: '600',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Banner FinancieCerto ─────────────────────────────────────────────── */}
        <div style={{
          marginTop: '48px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
          borderRadius: '20px', padding: '40px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '24px',
        }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#475569', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>
              INTELIGÊNCIA FINANCEIRA · FINANCIECERTO
            </p>
            <h2 style={{ fontSize: 'clamp(18px, 2.5vw, 24px)', fontWeight: '800', color: '#fff', lineHeight: 1.3, marginBottom: '10px' }}>
              Você se qualifica pro MCMV?
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.45)', lineHeight: 1.6, maxWidth: '420px' }}>
              O preço do imóvel é só metade da conta — a faixa MCMV também depende da sua renda.
              Simule e descubra sua faixa, taxa subsidiada e parcela real.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
            <Link href="/simulador" style={{
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff',
              padding: '14px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: '800',
              textDecoration: 'none', textAlign: 'center',
              boxShadow: '0 4px 16px rgba(37,99,235,.4)',
            }}>
              Simular financiamento →
            </Link>
            <Link href="/imoveis" style={{
              background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.7)',
              padding: '12px 24px', borderRadius: '12px', fontSize: '13px',
              fontWeight: '600', textDecoration: 'none', textAlign: 'center',
              border: '1px solid rgba(255,255,255,.1)',
            }}>
              Ver todos os imóveis
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
