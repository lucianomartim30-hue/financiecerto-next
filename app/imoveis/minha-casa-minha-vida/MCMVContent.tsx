'use client';

import { useState, useEffect, useCallback, useMemo, useRef, useDeferredValue } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatBRL } from '@/lib/calculos';
import { getStatusCfg } from '@/lib/status';
import { CIDADES_BUSCA, SP_BAIRROS, normStr, stripTipoLogradouro } from '@/lib/localizacao';
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
  status: string; status_norm: string; address_full: string; street: string; number: string;
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

  const preco      = b.min_price && b.min_price >= 100 ? `A partir de ${formatBRL(b.min_price)}` : 'Preço sob consulta';
  const statusCfg  = getStatusCfg(b.status || '', b.min_price);

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
      onClick={() => {
        import('@/lib/gtag').then(m => m.trackImovelView({ imovel: b.name, bairro: b.neighborhood || b.city || undefined, preco: b.min_price ?? undefined }));
        router.push(`/imoveis/${b.id}`);
      }}
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
            onClick={e => {
              e.stopPropagation();
              import('@/lib/gtag').then(m => m.trackImovelView({ imovel: b.name, bairro: b.neighborhood || b.city || undefined, preco: b.min_price ?? undefined }));
            }}
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

  // ── Busca por cidade/bairro/rua — mesmo mecanismo do portal geral (/imoveis),
  // pra nunca misturar bairros com o mesmo nome de cidades diferentes (ver
  // lib/localizacao.ts). Sem cidade escolhida, mostra todas as regiões atendidas.
  const [searchCity, setSearchCity] = useState(searchParams.cidade || '');
  const [activeLocation, setActiveLocation] = useState(searchParams.local || '');
  const [searchInput, setSearchInput] = useState(searchParams.local || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cidadeAberta, setCidadeAberta] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const deferredSearch = useDeferredValue(searchInput);

  const [quartos,      setQuartos]      = useState(searchParams.quartos || 'todos');
  const [statusFilter, setStatusFilter] = useState(searchParams.status  || 'todos');
  const [sortBy,        setSortBy]      = useState<'relevancia' | 'menor-preco' | 'maior-preco'>('relevancia');
  const [showAdvanced,  setShowAdvanced] = useState(false);

  const [allImoveis,  setAllImoveis]  = useState<Imovel[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [erro,        setErro]        = useState('');
  const [displayCount, setDisplayCount] = useState(24);

  function setUrlParam(key: string, value: string) {
    const url = new URL(window.location.href);
    if (value && value !== 'todos') url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    router.replace(url.pathname + url.search, { scroll: false });
  }

  // Fecha o dropdown de cidade e as sugestões ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!searchRef.current || !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setCidadeAberta(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Busca o catálogo inteiro da faixa selecionada de uma vez (igual ao portal
  // geral) — o filtro por cidade/bairro/rua/quartos/estágio roda no cliente,
  // sem round-trip, pra resposta instantânea ao digitar/selecionar.
  const buscar = useCallback(async () => {
    if (!faixaAtual) return;
    setLoading(true);
    setErro('');
    try {
      const params = new URLSearchParams({
        residencial: '1',
        max_price:   String(faixaAtual.teto),
        all:         '1',
      });
      const res  = await fetch(`/api/orulo?${params}`);
      if (!res.ok) throw new Error('Erro');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAllImoveis(data.buildings || []);
    } catch {
      setErro('Não foi possível carregar os imóveis. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [faixaAtual]);

  useEffect(() => { buscar(); }, [buscar]);
  useEffect(() => { setDisplayCount(24); }, [searchCity, activeLocation, quartos, statusFilter, faixaKey]);

  // Cidades com estoque nesta faixa — mesma fonte (CIDADES_BUSCA) do portal geral
  const cidadesComEstoque = useMemo(() => {
    if (allImoveis.length === 0) return [];
    const comEstoque = new Set(allImoveis.map(i => i.city).filter(Boolean));
    const ordenadas = CIDADES_BUSCA.filter(c => comEstoque.has(c));
    // Cidades com estoque mas fora da lista curada entram no fim, ordem alfabética
    const extras = [...comEstoque].filter(c => !CIDADES_BUSCA.includes(c)).sort();
    return [...ordenadas, ...extras];
  }, [allImoveis]);

  // Bairros/ruas — restrito à cidade escolhida (evita "Centro" de SP colidir
  // com "Centro" de Porto Alegre); sem cidade escolhida, busca em tudo.
  const allNeighborhoods = useMemo(() => {
    const escopo = searchCity ? allImoveis.filter(b => normStr(b.city || '') === normStr(searchCity)) : allImoveis;
    const fromCatalog = escopo.map(b => b.neighborhood).filter(Boolean);
    const merged = new Map<string, boolean>();
    if (normStr(searchCity) === normStr('São Paulo')) {
      SP_BAIRROS.forEach(nb => merged.set(normStr(nb), false));
    }
    fromCatalog.forEach(nb => merged.set(normStr(nb), true));
    const catalogByNorm = new Map(fromCatalog.map(nb => [normStr(nb), nb]));
    return [...merged.keys()].map(k => ({
      name: catalogByNorm.get(k) || SP_BAIRROS.find(nb => normStr(nb) === k) || k,
      hasCatalog: merged.get(k) ?? false,
      type: 'bairro' as const,
    })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [allImoveis, searchCity]);

  const allStreets = useMemo(() => {
    const escopo = searchCity ? allImoveis.filter(b => normStr(b.city || '') === normStr(searchCity)) : allImoveis;
    const seen = new Map<string, string>();
    escopo.filter(b => b.street).forEach(b => { const k = normStr(b.street!); if (!seen.has(k)) seen.set(k, b.street!); });
    return [...seen.values()].map(name => ({ name, hasCatalog: true, type: 'rua' as const }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [allImoveis, searchCity]);

  const allLocationSuggestions = useMemo(() => [...allNeighborhoods, ...allStreets], [allNeighborhoods, allStreets]);

  const filteredSuggestions = useMemo(() => {
    if (!deferredSearch.trim()) return [] as { name: string; hasCatalog: boolean; type: 'bairro' | 'rua' }[];
    const q = stripTipoLogradouro(normStr(deferredSearch));
    return allLocationSuggestions
      .filter(n => normStr(n.name).includes(q))
      .sort((a, b) => {
        if (a.hasCatalog !== b.hasCatalog) return a.hasCatalog ? -1 : 1;
        const aStarts = normStr(a.name).startsWith(q) ? 0 : 1;
        const bStarts = normStr(b.name).startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.name.localeCompare(b.name, 'pt-BR');
      })
      .slice(0, 10);
  }, [deferredSearch, allLocationSuggestions]);

  function selecionarCidade(c: string) {
    setSearchCity(c);
    setUrlParam('cidade', c);
    setCidadeAberta(false);
    // Bairro buscado antes pode não existir na nova cidade — limpa pra não confundir
    setActiveLocation('');
    setSearchInput('');
    setUrlParam('local', '');
  }

  function selecionarLocal(nome: string) {
    setActiveLocation(nome);
    setSearchInput(nome);
    setUrlParam('local', nome);
    setShowSuggestions(false);
  }

  function limparLocal() {
    setActiveLocation('');
    setSearchInput('');
    setUrlParam('local', '');
  }

  const filteredImoveis = useMemo(() => {
    let list = allImoveis;
    if (searchCity) list = list.filter(b => normStr(b.city || '') === normStr(searchCity));
    if (activeLocation) {
      const q = stripTipoLogradouro(normStr(activeLocation));
      list = list.filter(b => normStr(`${b.neighborhood} ${b.name} ${b.street || ''}`).includes(q));
    }
    if (quartos !== 'todos') {
      if (quartos === '4+') list = list.filter(b => (b.bedrooms_max ?? 0) >= 4);
      else {
        const n = Number(quartos);
        list = list.filter(b => (b.bedrooms_min ?? 0) <= n && (b.bedrooms_max ?? 99) >= n);
      }
    }
    if (statusFilter !== 'todos') list = list.filter(b => b.status_norm === statusFilter);
    return list;
  }, [allImoveis, searchCity, activeLocation, quartos, statusFilter]);

  const imoveisSorted = useMemo(() => [...filteredImoveis].sort((a, b) => {
    if (sortBy === 'menor-preco') return (a.min_price ?? 0) - (b.min_price ?? 0);
    if (sortBy === 'maior-preco') return (b.min_price ?? 0) - (a.min_price ?? 0);
    return 0;
  }), [filteredImoveis, sortBy]);

  const imoveisVisiveis = imoveisSorted.slice(0, displayCount);
  const temMais = imoveisSorted.length > displayCount;

  const cidadesComImoveisAtuais = useMemo(() =>
    [...new Set(filteredImoveis.map(i => i.city).filter(Boolean))].sort()
  , [filteredImoveis]);

  const quartosPills = [
    { key: 'todos', label: 'Todos' },
    { key: '1',     label: '1 quarto' },
    { key: '2',     label: '2 quartos' },
    { key: '3',     label: '3 quartos' },
    { key: '4+',    label: '4+ quartos' },
  ];
  const statusPills = [
    { key: 'todos',     label: 'Qualquer estágio' },
    { key: 'na planta', label: 'Na Planta' },
    { key: 'em obras',  label: 'Em Obras' },
    { key: 'pronto',    label: 'Pronto' },
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
                Imóveis Minha Casa Minha Vida{searchCity ? ` em ${searchCity}` : ''}
              </h1>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.55)', lineHeight: 1.6, marginBottom: '10px' }}>
                Empreendimentos com preço dentro do teto de alguma faixa do MCMV, das Faixas 1 a 4
                {searchCity ? '' : ', em todas as cidades atendidas pelo FinancieCerto'}.
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
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column' }} ref={searchRef}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>

            {/* ── Buscador: cidade + bairro/rua (mesmo padrão do portal geral) ── */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setCidadeAberta(v => !v)} style={{
                background: searchCity ? 'var(--primary-light)' : 'var(--bg)',
                color:      searchCity ? 'var(--primary)'       : 'var(--text-muted)',
                border:     `1.5px solid ${searchCity ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: '10px', padding: '8px 14px', fontSize: '13px',
                fontWeight: '600', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap',
              }}>
                <span>📍</span> {searchCity || 'Todas as cidades'}
                <span style={{ fontSize: '10px', transform: cidadeAberta ? 'rotate(180deg)' : 'none', transition: 'transform .2s', display: 'inline-block' }}>▼</span>
              </button>
              {cidadeAberta && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,.15)', padding: '6px', zIndex: 20, minWidth: '220px', maxHeight: '360px', overflowY: 'auto' }}>
                  <button onClick={() => selecionarCidade('')} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 14px', background: !searchCity ? 'var(--primary-light)' : 'transparent', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '14px', fontWeight: !searchCity ? '700' : '400', color: !searchCity ? 'var(--primary)' : '#374151', textAlign: 'left' }}>
                    Todas as cidades
                  </button>
                  {cidadesComEstoque.map(c => (
                    <button key={c} onClick={() => selecionarCidade(c)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%', padding: '10px 14px', background: c === searchCity ? 'var(--primary-light)' : 'transparent', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '14px', fontWeight: c === searchCity ? '700' : '400', color: c === searchCity ? 'var(--primary)' : '#374151', textAlign: 'left' }}>
                      {c}
                      {c === searchCity && <span style={{ color: 'var(--primary)', fontSize: '12px' }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
              <input
                value={searchInput}
                onChange={e => { setSearchInput(e.target.value); setShowSuggestions(true); if (!e.target.value) limparLocal(); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={e => { if (e.key === 'Enter' && searchInput.trim()) selecionarLocal(searchInput.trim()); }}
                placeholder={searchCity ? `Bairro ou rua em ${searchCity}...` : 'Bairro ou rua...'}
                style={{
                  width: '100%', padding: '8px 34px 8px 12px', border: '1.5px solid var(--border)',
                  borderRadius: '10px', fontSize: '13px', background: 'var(--bg)', color: 'var(--text)',
                  fontFamily: 'inherit', outline: 'none',
                }}
              />
              {activeLocation && (
                <button onClick={limparLocal} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', fontSize: '13px', padding: '4px' }}>✕</button>
              )}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,.15)', padding: '6px', zIndex: 20, maxHeight: '320px', overflowY: 'auto' }}>
                  {filteredSuggestions.map(s => (
                    <button key={`${s.type}-${s.name}`} onClick={() => selecionarLocal(s.name)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '9px 12px', background: 'transparent', border: 'none', borderRadius: '9px', cursor: 'pointer', fontSize: '13px', color: '#374151', textAlign: 'left' }}>
                      <span style={{ fontSize: '11px' }}>{s.type === 'rua' ? '🛣️' : '📍'}</span> {s.name}
                      {!s.hasCatalog && <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>(sem imóveis ainda)</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
                ? <><strong style={{ color: 'var(--text)' }}>{imoveisVisiveis.length}</strong> de <strong style={{ color: 'var(--text)' }}>{imoveisSorted.length}</strong> imóveis
                    {searchCity ? <> em <strong style={{ color: 'var(--text)' }}>{searchCity}</strong></> : null}
                    {' '}até <strong style={{ color: 'var(--text)' }}>{formatBRL(faixaAtual?.teto ?? 0)}</strong></>
                : `Nenhum imóvel encontrado com esses filtros`}
            </p>
          </div>
        )}

        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && imoveisVisiveis.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            {imoveisVisiveis.map(b => <CardImovel key={b.id} imovel={b} />)}
          </div>
        )}

        {!loading && imoveisSorted.length === 0 && !erro && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</p>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>
              Nenhum imóvel com esses filtros
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Tente uma faixa mais ampla, outra cidade ou remova alguns filtros.
            </p>
            {(quartos !== 'todos' || statusFilter !== 'todos' || searchCity || activeLocation) && (
              <button onClick={() => { setQuartos('todos'); setStatusFilter('todos'); setSearchCity(''); limparLocal(); setUrlParam('quartos', 'todos'); setUrlParam('status', 'todos'); setUrlParam('cidade', ''); }}
                style={{ padding: '12px 24px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '12px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', color: 'var(--text-muted)' }}>
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {!loading && temMais && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button onClick={() => setDisplayCount(c => c + 24)} style={{
              background: 'transparent', color: 'var(--primary)',
              border: '1.5px solid var(--primary)', borderRadius: '12px',
              padding: '12px 32px', fontSize: '14px', fontWeight: '700',
              cursor: 'pointer',
            }}>
              Ver mais imóveis →
            </button>
          </div>
        )}

        {!loading && !searchCity && cidadesComImoveisAtuais.length > 0 && (
          <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Cidades com imóveis nesta faixa
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {cidadesComImoveisAtuais.map(c => (
                <button key={c} onClick={() => selecionarCidade(c)} style={{
                  padding: '6px 14px', borderRadius: '99px', fontSize: '12px', fontWeight: '600',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', cursor: 'pointer',
                }}>
                  {c}
                </button>
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
