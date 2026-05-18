'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatBRL } from '@/lib/calculos';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
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
  bathrooms_min: number | null;
  bathrooms_max: number | null;
  vagas_min: number | null;
  vagas_max: number | null;
  neighborhood: string;
  city: string;
  state: string;
  photo: string | null;
  orulo_url: string | null;
  sharing_url: string | null;
  status: string;
  address_full: string;
  street: string;
  number: string;
}

type StatusKey = 'Na Planta' | 'Em Obras' | 'Pronto' | 'Lançamento' | string;

// ──────────────────────────────────────────────────────────────────────────────
// Status config
// ──────────────────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { cor: string; bg: string; label: string }> = {
  // Na planta
  'na planta':      { cor: '#2563eb', bg: 'rgba(37,99,235,.15)',  label: 'Na Planta' },
  'planta':         { cor: '#2563eb', bg: 'rgba(37,99,235,.15)',  label: 'Na Planta' },
  'pre-lançamento': { cor: '#2563eb', bg: 'rgba(37,99,235,.15)',  label: 'Pré-Lançamento' },
  'pre lançamento': { cor: '#2563eb', bg: 'rgba(37,99,235,.15)',  label: 'Pré-Lançamento' },
  // Lançamento
  'lançamento':     { cor: '#7c3aed', bg: 'rgba(124,58,237,.15)', label: 'Lançamento' },
  'lancamento':     { cor: '#7c3aed', bg: 'rgba(124,58,237,.15)', label: 'Lançamento' },
  // Em obras / em construção
  'em obras':       { cor: '#d97706', bg: 'rgba(217,119,6,.15)',  label: 'Em Obras' },
  'em construção':  { cor: '#d97706', bg: 'rgba(217,119,6,.15)',  label: 'Em Construção' },
  'em construcao':  { cor: '#d97706', bg: 'rgba(217,119,6,.15)',  label: 'Em Construção' },
  'construção':     { cor: '#d97706', bg: 'rgba(217,119,6,.15)',  label: 'Em Construção' },
  'em andamento':   { cor: '#d97706', bg: 'rgba(217,119,6,.15)',  label: 'Em Andamento' },
  // Pronto / entregue
  'pronto':         { cor: '#16a34a', bg: 'rgba(22,163,74,.15)',  label: 'Pronto' },
  'pronto novo':    { cor: '#16a34a', bg: 'rgba(22,163,74,.15)',  label: 'Pronto Novo' },
  'entregue':       { cor: '#16a34a', bg: 'rgba(22,163,74,.15)',  label: 'Entregue' },
  'concluído':      { cor: '#16a34a', bg: 'rgba(22,163,74,.15)',  label: 'Concluído' },
  'concluido':      { cor: '#16a34a', bg: 'rgba(22,163,74,.15)',  label: 'Concluído' },
};

function getStatusCfg(status: StatusKey) {
  const key = status.toLowerCase().trim();
  if (STATUS_CFG[key]) return STATUS_CFG[key];
  // Fuzzy match por palavras-chave
  if (key.includes('planta'))      return STATUS_CFG['na planta'];
  if (key.includes('lança'))       return STATUS_CFG['lançamento'];
  if (key.includes('constru') || key.includes('obra') || key.includes('andamento'))
                                   return STATUS_CFG['em obras'];
  if (key.includes('pronto') || key.includes('entreg') || key.includes('conclui'))
                                   return STATUS_CFG['pronto'];
  // Fallback visível (cinza escuro, não transparente)
  return { cor: '#475569', bg: 'rgba(71,85,105,.18)', label: status };
}

// ──────────────────────────────────────────────────────────────────────────────
// Skeleton card
// ──────────────────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: '18px',
      border: '1px solid var(--border)', overflow: 'hidden',
    }}>
      <div style={{ height: '200px', background: 'var(--border)', animation: 'pulse 1.4s ease infinite' }} />
      <div style={{ padding: '18px' }}>
        {[80, 60, 50, 90].map((w, i) => (
          <div key={i} style={{
            height: i === 0 ? '14px' : i === 1 ? '18px' : '12px',
            width: `${w}%`, background: 'var(--border)',
            borderRadius: '6px', marginBottom: i < 3 ? '10px' : '0',
            animation: 'pulse 1.4s ease infinite',
          }} />
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }`}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Card Imóvel — estilo portal (Apto.vc)
// ──────────────────────────────────────────────────────────────────────────────
function CardImovel({ imovel: b }: { imovel: Imovel }) {
  const [imgErr, setImgErr] = useState(false);
  const [hover, setHover] = useState(false);
  const router = useRouter();

  const preco = b.min_price ? `A partir de ${formatBRL(b.min_price)}` : 'Preço sob consulta';
  const statusCfg = getStatusCfg(b.status || '');
  const link = b.sharing_url || b.orulo_url || '#';

  const waMsg = encodeURIComponent(
    `Olá! Vi o imóvel *${b.name}* no FinancieCerto e quero mais informações.${link !== '#' ? ' Link: ' + link : ''}`
  );

  // Helpers para faixas (ex: "62–85 m²" ou "62 m²")
  function faixa(min: number | null, max: number | null, unit: string) {
    if (!min) return null;
    if (max && max !== min) return `${min}–${max} ${unit}`;
    return `${min} ${unit}`;
  }

  const areaStr    = faixa(b.area_min, b.area_max, 'm²');
  const quartosStr = faixa(b.bedrooms_min, b.bedrooms_max, b.bedrooms_min === 1 && !b.bedrooms_max ? 'quarto' : 'qts');
  const bathStr    = faixa(b.bathrooms_min, b.bathrooms_max, b.bathrooms_min === 1 && !b.bathrooms_max ? 'ban.' : 'ban.');
  const vagasStr   = faixa(b.vagas_min, b.vagas_max, b.vagas_min === 1 && !b.vagas_max ? 'vaga' : 'vagas');

  const specs = [
    areaStr    && { icon: '▦',  label: areaStr },
    quartosStr && { icon: '🛏', label: quartosStr },
    bathStr    && { icon: '🚿', label: bathStr },
    vagasStr   && { icon: '🚗', label: vagasStr },
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
        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
        boxShadow: hover ? '0 6px 24px rgba(37,99,235,.13)' : '0 1px 4px rgba(0,0,0,.05)',
        transform: hover ? 'translateY(-2px)' : 'none',
        cursor: 'pointer',
      }}
    >
      {/* Foto */}
      <div style={{ height: '178px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {b.photo && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={b.photo}
            alt={b.name}
            onError={() => setImgErr(true)}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: hover ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 0.4s cubic-bezier(.4,0,.2,1)',
            }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(145deg, #1e3a5f 0%, #0f2744 100%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            <span style={{ fontSize: '32px' }}>🏙️</span>
          </div>
        )}
        {/* Overlay gradient */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '70px',
          background: 'linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />
        {/* Status badge */}
        {b.status && (
          <div style={{
            position: 'absolute', top: '10px', left: '10px',
            background: statusCfg.bg, backdropFilter: 'blur(8px)',
            border: `1px solid ${statusCfg.cor}50`,
            color: statusCfg.cor, fontSize: '9px', fontWeight: '800',
            padding: '3px 8px', borderRadius: '99px',
            textTransform: 'uppercase', letterSpacing: '0.6px',
          }}>
            {statusCfg.label}
          </div>
        )}
        {/* Bairro no overlay */}
        {(b.neighborhood || b.city) && (
          <p style={{
            position: 'absolute', bottom: '9px', left: '10px',
            fontSize: '10px', color: 'rgba(255,255,255,.9)',
            fontWeight: '600', margin: 0,
          }}>
            📍 {b.neighborhood || b.city}
          </p>
        )}
      </div>

      {/* Conteúdo */}
      <div style={{ padding: '14px 14px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {b.developer && (
          <p style={{
            fontSize: '9px', fontWeight: '700', color: 'var(--text-faint)',
            textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px',
          }}>
            {b.developer}
          </p>
        )}
        <h3 style={{
          fontSize: '13px', fontWeight: '700', color: 'var(--text)',
          lineHeight: 1.35, marginBottom: b.address_full ? '4px' : '10px', flex: b.address_full ? 0 : 1,
        }}>
          {b.name}
        </h3>

        {/* Endereço */}
        {b.address_full && (
          <p style={{
            fontSize: '10px', color: 'var(--text-faint)', fontWeight: '500',
            marginBottom: '10px', flex: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            📍 {b.address_full}
          </p>
        )}

        {/* Specs: m² / quartos / banheiros / vagas */}
        {specs.length > 0 && (
          <div style={{
            display: 'flex', gap: '10px', flexWrap: 'wrap',
            marginBottom: '10px', paddingBottom: '10px',
            borderBottom: '1px solid var(--border)',
          }}>
            {specs.map(({ icon, label }, i) => (
              <span key={i} style={{
                display: 'flex', alignItems: 'center', gap: '3px',
                fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600',
              }}>
                <span style={{ fontSize: '12px' }}>{icon}</span>
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Preço */}
        <p style={{
          fontSize: '14px', fontWeight: '800', color: 'var(--text)',
          fontVariantNumeric: 'tabular-nums', marginBottom: '10px',
        }}>
          {preco}
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <a
            href={`https://wa.me/5511933661403?text=${waMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, textAlign: 'center', background: '#25D366', color: '#fff',
              textDecoration: 'none', fontSize: '11px', fontWeight: '700',
              padding: '8px 10px', borderRadius: '9px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
            }}
          >
            <span>💬</span> WhatsApp
          </a>
          <a
            href={`/imoveis/${b.id}`}
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, textAlign: 'center',
              background: 'var(--primary-light)', color: 'var(--primary)',
              border: '1.5px solid var(--primary)',
              textDecoration: 'none', fontSize: '11px', fontWeight: '700',
              padding: '8px 10px', borderRadius: '9px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            Ver detalhes →
          </a>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Empty state
// ──────────────────────────────────────────────────────────────────────────────
function EmptyState({ filtroAtivo, localSearch }: { filtroAtivo: boolean; localSearch?: string }) {
  const localName = localSearch?.replace(/,.*$/, '').trim(); // pega só "Guarulhos" de "Guarulhos – SP"
  return (
    <div style={{
      textAlign: 'center', padding: '80px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
    }}>
      <span style={{ fontSize: '56px' }}>🏚️</span>
      <div>
        <p style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>
          {localName
            ? `Nenhum empreendimento disponível em ${localName}`
            : filtroAtivo ? 'Nenhum imóvel com esses filtros' : 'Nenhum imóvel encontrado'}
        </p>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '400px', lineHeight: 1.65 }}>
          {localName
            ? `A Orulo ainda não tem lançamentos cadastrados em ${localName}. Tente uma região próxima ou busque por nome do empreendimento.`
            : filtroAtivo
              ? 'Tente ajustar a faixa de preço, quartos ou estágio da obra.'
              : 'A integração com Órulo pode estar configurando. Tente novamente em instantes.'}
        </p>
      </div>
      <Link href="/simulador" style={{
        background: 'linear-gradient(135deg, var(--primary), var(--accent))',
        color: '#fff', textDecoration: 'none',
        fontSize: '14px', fontWeight: '700',
        padding: '12px 28px', borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(37,99,235,.3)',
        marginTop: '8px',
      }}>
        Calcular meu perfil →
      </Link>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Pill button helper
// ──────────────────────────────────────────────────────────────────────────────
function Pill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 16px', borderRadius: '99px', fontSize: '13px',
        fontWeight: active ? '700' : '500', cursor: 'pointer', border: '1.5px solid',
        borderColor: active ? 'var(--primary)' : 'var(--border)',
        background: active ? 'var(--primary-light)' : 'var(--bg-card)',
        color: active ? 'var(--primary)' : 'var(--text-muted)',
        transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// BRL input helpers
// ──────────────────────────────────────────────────────────────────────────────
function fmtInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('pt-BR');
}
function stripFmt(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

// ──────────────────────────────────────────────────────────────────────────────
// Main content (needs Suspense for useSearchParams)
// ──────────────────────────────────────────────────────────────────────────────
// Parse "Bairro, Cidade – SP" or "Cidade – SP" from datalist selection
function parseLocation(search: string): { neighborhood: string; city: string; state: string } | null {
  const s = search.trim();
  // "Moema, São Paulo – SP"
  const nbMatch = s.match(/^(.+?),\s*(.+?)\s*[–\-]\s*([A-Z]{2})$/);
  if (nbMatch) return { neighborhood: nbMatch[1].trim(), city: nbMatch[2].trim(), state: nbMatch[3].trim() };
  // "Guarulhos – SP"
  const cityMatch = s.match(/^(.+?)\s*[–\-]\s*([A-Z]{2})$/);
  if (cityMatch) return { neighborhood: '', city: cityMatch[1].trim(), state: cityMatch[2].trim() };
  return null;
}

function ImoveisContent() {
  const searchParams = useSearchParams();
  const minParam = searchParams.get('min') || '';
  const maxParam = searchParams.get('max') || '';

  // Filtros de API (todos acionam re-fetch)
  const [minPrice, setMinPriceRaw] = useState(minParam);
  const [maxPrice, setMaxPriceRaw] = useState(maxParam);
  const [minInput, setMinInput] = useState(minParam ? fmtInput(minParam) : '');
  const [maxInput, setMaxInput] = useState(maxParam ? fmtInput(maxParam) : '');
  const [quartosFilter, setQuartosFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [localSearch, setLocalSearch] = useState('');
  const [localSearchInput, setLocalSearchInput] = useState('');

  // Filtro local apenas (ordenação)
  const [sortBy, setSortBy] = useState<'relevancia' | 'menor-preco' | 'maior-preco'>('relevancia');

  // UI state do painel
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);

  // Data
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [erro, setErro] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);

  const buscar = useCallback(async (p = 1, append = false) => {
    if (p === 1) setLoading(true);
    else setLoadingMore(true);
    setErro('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      // Parse localização estruturada do datalist ("Bairro, Cidade – SP")
      const parsed = localSearch.trim() ? parseLocation(localSearch) : null;
      if (parsed) {
        if (parsed.state)        params.set('state', parsed.state);
        if (parsed.city)         params.set('city', parsed.city);
        if (parsed.neighborhood) params.set('neighborhood', parsed.neighborhood);
        // q não necessário quando parsed — evita full-text que ignora localização
      } else {
        params.set('state', 'SP');
        // localSearch livre vai como q (ex: nome do empreendimento, bairro sem cidade)
        if (localSearch.trim()) params.set('q', localSearch.trim());
      }
      if (minPrice) params.set('min_price', minPrice);
      if (maxPrice) params.set('max_price', maxPrice);

      // Filtros de quartos → API
      if (quartosFilter !== 'todos') {
        if (quartosFilter === '4+') {
          params.set('bedrooms_min', '4');
          params.set('bedrooms_max', '99');
        } else {
          params.set('bedrooms_min', quartosFilter);
          params.set('bedrooms_max', quartosFilter);
        }
      }

      // Filtro de estágio → API
      if (statusFilter !== 'todos') params.set('status', statusFilter);

      // Busca textual → API
      if (localSearch.trim()) params.set('q', localSearch.trim());

      const res = await fetch(`/api/orulo?${params}`);
      if (!res.ok) throw new Error('Erro');
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setPage(p);
      setImoveis(prev => append ? [...prev, ...(data.buildings || [])] : (data.buildings || []));
    } catch {
      setErro('Não foi possível carregar os imóveis. Verifique a integração Órulo ou tente novamente.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [minPrice, maxPrice, quartosFilter, statusFilter, localSearch]);

  // Re-fetch sempre que qualquer filtro de API mudar
  useEffect(() => { buscar(1); }, [buscar]);

  // Carrega sugestões de localização da API
  useEffect(() => {
    fetch('/api/orulo/bairros')
      .then(r => r.json())
      .then(d => {
        if (d.locations) setLocationSuggestions(d.locations.map((l: { label: string }) => l.label));
      })
      .catch(() => {});
  }, []);

  // Ordenação local (não precisa re-fetch)
  const imoveisFiltrados = [...imoveis].sort((a, bx) => {
    if (sortBy === 'menor-preco') return (a.min_price ?? 0) - (bx.min_price ?? 0);
    if (sortBy === 'maior-preco') return (bx.min_price ?? 0) - (a.min_price ?? 0);
    return 0;
  });

  const filtroAtivo = !!(minPrice || maxPrice || quartosFilter !== 'todos' || statusFilter !== 'todos' || localSearch.trim());

  function aplicarPreco() {
    setMinPriceRaw(stripFmt(minInput));
    setMaxPriceRaw(stripFmt(maxInput));
  }

  function aplicarBusca() {
    setLocalSearch(localSearchInput);
  }

  function limparFiltros() {
    setMinPriceRaw(''); setMaxPriceRaw('');
    setMinInput(''); setMaxInput('');
    setQuartosFilter('todos');
    setStatusFilter('todos');
    setLocalSearch(''); setLocalSearchInput('');
    setSortBy('relevancia');
  }

  // Pills de quartos acionam re-fetch direto
  function handleQuartos(key: string) {
    setQuartosFilter(key);
  }

  // Pills de estágio acionam re-fetch direto
  function handleStatus(key: string) {
    setStatusFilter(key);
  }

  const quartosPills = [
    { key: 'todos', label: 'Todos' },
    { key: '1', label: '1 quarto' },
    { key: '2', label: '2 quartos' },
    { key: '3', label: '3 quartos' },
    { key: '4+', label: '4+ quartos' },
  ];
  const statusPills = [
    { key: 'todos', label: 'Qualquer estágio' },
    { key: 'na planta', label: 'Na Planta' },
    { key: 'lançamento', label: 'Lançamento' },
    { key: 'em obras', label: 'Em Obras' },
    { key: 'pronto', label: 'Pronto' },
  ];

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(160deg, #0f172a 0%, #1a2e4a 60%, #0f172a 100%)',
        padding: '64px 24px 80px',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <p style={{
            fontSize: '11px', fontWeight: '700', color: '#475569',
            letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '14px',
          }}>
            Empreendimentos · São Paulo
          </p>
          <h1 style={{
            fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: '800',
            color: '#fff', lineHeight: 1.2, marginBottom: '10px',
          }}>
            {minParam || maxParam
              ? 'Imóveis compatíveis com seu perfil'
              : 'Imóveis disponíveis'}
          </h1>
          {(minParam || maxParam) && (
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.5)', marginBottom: '12px' }}>
              Filtrados entre{' '}
              <strong style={{ color: 'rgba(255,255,255,.8)' }}>
                {minParam ? formatBRL(Number(minParam)) : 'sem mínimo'}
              </strong>
              {' '}e{' '}
              <strong style={{ color: 'rgba(255,255,255,.8)' }}>
                {maxParam ? formatBRL(Number(maxParam)) : 'sem máximo'}
              </strong>
              {' '}— resultado da sua simulação
            </p>
          )}
        </div>
      </section>

      {/* ── Painel de filtros ────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        padding: '14px 24px',
        position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,.06)',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0' }}>

          {/* ── Linha principal (sempre visível) ─────────────────────────────── */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>

            {/* Busca bairro/nome */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '1 1 220px', minWidth: '180px' }}>
              <span style={{ position: 'absolute', left: '11px', color: 'var(--text-faint)', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
              <input
                type="text"
                list="location-suggestions"
                value={localSearchInput}
                onChange={e => setLocalSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (aplicarPreco(), aplicarBusca())}
                placeholder="Bairro, cidade ou empreendimento..."
                style={{
                  padding: '10px 12px 10px 34px', border: '1.5px solid var(--border)',
                  borderRadius: '10px', fontSize: '13px', width: '100%',
                  outline: 'none', background: 'var(--bg)',
                  color: 'var(--text)', fontFamily: 'inherit',
                }}
              />
              {locationSuggestions.length > 0 && (
                <datalist id="location-suggestions">
                  {locationSuggestions.map(s => <option key={s} value={s} />)}
                </datalist>
              )}
            </div>

            {/* Buscar */}
            <button
              onClick={() => { aplicarPreco(); aplicarBusca(); }}
              style={{
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                color: '#fff', border: 'none', borderRadius: '10px',
                padding: '10px 22px', fontSize: '13px', fontWeight: '700',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              Buscar
            </button>

            {/* Filtros avançados toggle */}
            <button
              onClick={() => setShowAdvanced(v => !v)}
              style={{
                background: showAdvanced ? 'var(--primary-light)' : 'var(--bg)',
                color: showAdvanced ? 'var(--primary)' : 'var(--text-muted)',
                border: `1.5px solid ${showAdvanced ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: '10px', padding: '10px 16px',
                fontSize: '13px', fontWeight: '600',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: '6px',
                transition: 'all 0.15s',
              }}
            >
              <span>⚙️</span>
              Filtros avançados
              <span style={{
                display: 'inline-block',
                transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                fontSize: '10px',
              }}>▼</span>
            </button>

            {/* Ordenar por */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              title="Ordenar por"
              style={{
                padding: '10px 30px 10px 12px', border: '1.5px solid var(--border)',
                borderRadius: '10px', fontSize: '13px',
                background: 'var(--bg)', color: 'var(--text)',
                fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
                appearance: 'none', flexShrink: 0,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
              }}
            >
              <option value="relevancia">Relevância</option>
              <option value="menor-preco">Menor preço</option>
              <option value="maior-preco">Maior preço</option>
            </select>

            {/* Limpar filtros */}
            {filtroAtivo && (
              <button
                onClick={limparFiltros}
                style={{
                  background: 'transparent', color: 'var(--text-muted)',
                  border: '1.5px solid var(--border)', borderRadius: '10px',
                  padding: '10px 14px', fontSize: '13px', cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                ✕ Limpar
              </button>
            )}
          </div>

          {/* ── Chips de filtros ativos (quando avançados fechados) ───────────── */}
          {!showAdvanced && (quartosFilter !== 'todos' || statusFilter !== 'todos' || minPrice || maxPrice) && (
            <div style={{
              display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center',
              marginTop: '10px',
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: '600' }}>Filtros:</span>
              {minPrice && (
                <span style={{
                  padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '700',
                  background: 'rgba(37,99,235,.1)', color: 'var(--primary)', border: '1px solid rgba(37,99,235,.2)',
                }}>
                  A partir de R$ {Number(minPrice).toLocaleString('pt-BR')}
                </span>
              )}
              {maxPrice && (
                <span style={{
                  padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '700',
                  background: 'rgba(37,99,235,.1)', color: 'var(--primary)', border: '1px solid rgba(37,99,235,.2)',
                }}>
                  Até R$ {Number(maxPrice).toLocaleString('pt-BR')}
                </span>
              )}
              {quartosFilter !== 'todos' && (
                <span style={{
                  padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '700',
                  background: 'rgba(37,99,235,.1)', color: 'var(--primary)', border: '1px solid rgba(37,99,235,.2)',
                }}>
                  🛏 {quartosPills.find(p => p.key === quartosFilter)?.label}
                </span>
              )}
              {statusFilter !== 'todos' && (
                <span style={{
                  padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '700',
                  background: `${getStatusCfg(statusFilter).bg}`, color: getStatusCfg(statusFilter).cor,
                  border: `1px solid ${getStatusCfg(statusFilter).cor}40`,
                }}>
                  {getStatusCfg(statusFilter).label}
                </span>
              )}
            </div>
          )}

          {/* ── Seção de filtros avançados (colapsável) ──────────────────────── */}
          {showAdvanced && (
            <div style={{
              marginTop: '14px', paddingTop: '14px',
              borderTop: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', gap: '14px',
            }}>

              {/* Linha: faixa de preço */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '5px' }}>
                    Preço mínimo
                  </p>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '11px', color: 'var(--text-faint)', fontSize: '13px', fontWeight: '600', pointerEvents: 'none' }}>R$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={minInput}
                      onChange={e => setMinInput(fmtInput(e.target.value))}
                      onKeyDown={e => e.key === 'Enter' && (aplicarPreco(), aplicarBusca())}
                      placeholder="200.000"
                      style={{
                        padding: '9px 12px 9px 36px', border: '1.5px solid var(--border)',
                        borderRadius: '10px', fontSize: '13px', width: '148px',
                        outline: 'none', background: 'var(--bg)',
                        color: 'var(--text)', fontFamily: 'inherit',
                      }}
                    />
                  </div>
                </div>

                <span style={{ color: 'var(--text-faint)', fontSize: '16px', marginBottom: '9px' }}>–</span>

                <div>
                  <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '5px' }}>
                    Preço máximo
                  </p>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '11px', color: 'var(--text-faint)', fontSize: '13px', fontWeight: '600', pointerEvents: 'none' }}>R$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={maxInput}
                      onChange={e => setMaxInput(fmtInput(e.target.value))}
                      onKeyDown={e => e.key === 'Enter' && (aplicarPreco(), aplicarBusca())}
                      placeholder="800.000"
                      style={{
                        padding: '9px 12px 9px 36px', border: '1.5px solid var(--border)',
                        borderRadius: '10px', fontSize: '13px', width: '148px',
                        outline: 'none', background: 'var(--bg)',
                        color: 'var(--text)', fontFamily: 'inherit',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Linha: quartos */}
              <div>
                <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '7px' }}>
                  Quartos
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {quartosPills.map(({ key, label }) => (
                    <Pill key={key} label={label} active={quartosFilter === key} onClick={() => handleQuartos(key)} />
                  ))}
                </div>
              </div>

              {/* Linha: estágio */}
              <div>
                <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '7px' }}>
                  Estágio da obra
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {statusPills.map(({ key, label }) => (
                    <Pill key={key} label={label} active={statusFilter === key} onClick={() => handleStatus(key)} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Conteúdo ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Contagem + erro */}
        {erro ? (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '12px', padding: '16px 18px', marginBottom: '24px',
          }}>
            <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>⚠️ {erro}</p>
          </div>
        ) : !loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              {imoveisFiltrados.length > 0
                ? <><strong style={{ color: 'var(--text)' }}>{imoveisFiltrados.length}</strong> de {total} empreendimento{total !== 1 ? 's' : ''}</>
                : 'Nenhum imóvel com esses filtros'}
            </p>
            {(statusFilter !== 'todos' || quartosFilter !== 'todos') && imoveisFiltrados.length > 0 && (
              <p style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
                {statusFilter !== 'todos' && <span style={{ color: getStatusCfg(statusFilter).cor }}>● {getStatusCfg(statusFilter).label}</span>}
                {statusFilter !== 'todos' && quartosFilter !== 'todos' && '  '}
                {quartosFilter !== 'todos' && <span>🛏 {quartosPills.find(p => p.key === quartosFilter)?.label}</span>}
              </p>
            )}
          </div>
        )}

        {/* Skeletons */}
        {loading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '16px',
          }}>
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Grid */}
        {!loading && imoveisFiltrados.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '40px',
          }}>
            {imoveisFiltrados.map(b => <CardImovel key={b.id} imovel={b} />)}
            {/* Fillers invisíveis para completar última linha do grid */}
            {Array.from({ length: (4 - (imoveisFiltrados.length % 4)) % 4 }).map((_, i) => (
              <div key={`filler-${i}`} style={{ visibility: 'hidden', minHeight: '1px' }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !erro && imoveisFiltrados.length === 0 && (
          <EmptyState filtroAtivo={filtroAtivo} localSearch={localSearch} />
        )}

        {/* Ver mais */}
        {!loading && page < pages && imoveisFiltrados.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <button
              onClick={() => buscar(page + 1, true)}
              disabled={loadingMore}
              style={{
                background: 'transparent', color: 'var(--primary)',
                border: '1.5px solid var(--primary)', borderRadius: '12px',
                padding: '12px 32px', fontSize: '14px', fontWeight: '700',
                cursor: loadingMore ? 'default' : 'pointer',
                opacity: loadingMore ? 0.6 : 1,
                transition: 'all 0.15s',
              }}
            >
              {loadingMore ? 'Carregando...' : 'Ver mais imóveis →'}
            </button>
          </div>
        )}

        {/* CTA para simulador */}
        {!loading && !erro && (
          <div style={{
            marginTop: '48px',
            background: 'linear-gradient(145deg, #1e3a5f 0%, #0f172a 100%)',
            borderRadius: '20px', padding: '32px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '16px',
          }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '800', color: '#fff', marginBottom: '5px' }}>
                Não sabe qual imóvel cabe no seu bolso?
              </p>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                Calcule seu poder de compra, faixa MCMV e valor de parcelas em 2 minutos.
              </p>
            </div>
            <Link href="/simulador" style={{
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              color: '#fff', textDecoration: 'none', fontSize: '14px',
              fontWeight: '700', padding: '13px 28px', borderRadius: '12px',
              whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(37,99,235,.4)',
            }}>
              Calcular meu perfil →
            </Link>
          </div>
        )}

        {/* ── SEO: Bairros populares ───────────────────────────────────────── */}
        <div style={{ marginTop: '64px', borderTop: '1px solid var(--border)', paddingTop: '48px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>
            Buscar imóveis por região em São Paulo e Grande SP
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.65 }}>
            Explore apartamentos à venda em toda a Região Metropolitana — capital, ABC Paulista, Guarulhos, Osasco e mais.
          </p>

          {/* Grupos de regiões */}
          {[
            {
              titulo: 'São Paulo – Zona Sul & Oeste',
              bairros: ['Moema','Itaim Bibi','Brooklin','Campo Belo','Vila Olímpia',
                'Pinheiros','Vila Madalena','Perdizes','Lapa','Santo Amaro','Vila Mariana'],
            },
            {
              titulo: 'São Paulo – Zona Norte & Leste',
              bairros: ['Santana','Tatuapé','Mooca','Penha','Vila Maria',
                'Casa Verde','Tucuruvi','Aricanduva','Vila Prudente','Itaquera'],
            },
            {
              titulo: 'São Paulo – Centro',
              bairros: ['Consolação','Bela Vista','Jardins','Higienópolis',
                'República','Liberdade','Santa Cecília','Cerqueira César','Paraíso'],
            },
            {
              titulo: 'Grande ABC',
              bairros: ['Santo André','São Bernardo do Campo','São Caetano do Sul',
                'Diadema','Mauá','Ribeirão Pires'],
            },
            {
              titulo: 'Outros municípios da RMSP',
              bairros: ['Guarulhos','Osasco','Barueri','Alphaville','Santana de Parnaíba',
                'Cotia','Taboão da Serra','Carapicuíba','Mogi das Cruzes','Suzano',
                'Itaquaquecetuba','Embu das Artes','Mairiporã','Caieiras'],
            },
          ].map(({ titulo, bairros }) => (
            <div key={titulo} style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-faint)',
                textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                {titulo}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                {bairros.map(bairro => (
                  <button
                    key={bairro}
                    onClick={() => { setLocalSearchInput(bairro); setLocalSearch(bairro); }}
                    style={{
                      padding: '5px 13px', borderRadius: '99px', fontSize: '12px',
                      fontWeight: '600', cursor: 'pointer',
                      border: '1.5px solid var(--border)',
                      background: 'var(--bg-card)', color: 'var(--text-muted)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {bairro}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div style={{ marginBottom: '24px' }} />

          {/* SEO editorial */}
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text)', marginBottom: '12px' }}>
            Morar em São Paulo
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: '20px', maxWidth: '720px' }}>
            São Paulo concentra o maior volume de lançamentos imobiliários do Brasil. A cidade oferece
            opções para todos os perfis: do Minha Casa Minha Vida (MCMV) até imóveis de altíssimo padrão
            no SFI. Bairros como Pinheiros, Itaim Bibi e Jardins lideram em valorização; já regiões como
            Tatuapé, Vila Mariana e Brooklin atraem compradores que buscam custo-benefício.
          </p>

          {/* FAQ */}
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', marginBottom: '20px' }}>
            Perguntas frequentes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '720px' }}>
            {[
              {
                q: 'Com renda de R$ 3.000 consigo comprar um apartamento em São Paulo?',
                a: 'Sim! Com R$ 3.000 de renda você se enquadra no Minha Casa Minha Vida Faixa 1 (até R$ 3.200). Pelo programa, juros são subsidiados e a parcela pode caber no seu bolso. Use o simulador FinancieCerto para calcular o valor exato que você pode financiar.',
              },
              {
                q: 'Qual o valor do metro quadrado em São Paulo?',
                a: 'O m² varia muito por bairro. Em 2025, a média em São Paulo é de R$ 9.000–11.000/m². Bairros premium como Jardins e Itaim Bibi chegam a R$ 15.000/m², enquanto regiões periféricas ficam entre R$ 4.000–6.000/m².',
              },
              {
                q: 'O que é melhor: comprar na planta ou pronto?',
                a: 'Na planta oferece preço de lançamento (menor) e entrada parcelada durante a obra. Pronto permite financiamento imediato e mudança imediata. Na planta tem risco de obra e prazo; pronto tem liquidez maior. Use o simulador para comparar parcelas.',
              },
              {
                q: 'Posso usar o FGTS para comprar apartamento em SP?',
                a: 'Sim, desde que você seja cotista há pelo menos 3 anos, seja o primeiro imóvel financiado e não possua outro imóvel no município onde reside ou trabalha. O FGTS pode ser usado como entrada em imóveis de até R$ 2,25 milhões (SFH).',
              },
            ].map(({ q, a }, i) => (
              <div key={i} style={{
                padding: '16px 18px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
              }}>
                <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>
                  {q}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
                  {a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Export (Suspense boundary for useSearchParams)
// ──────────────────────────────────────────────────────────────────────────────
export default function ImoveisPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-faint)' }}>
        Carregando imoveis...
      </div>
    }>
      <ImoveisContent />
    </Suspense>
  );
}
