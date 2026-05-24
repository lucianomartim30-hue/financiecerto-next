'use client';

import { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import { formatBRL, simular, descobrir, FAIXAS_MCMV, BANCOS_SBPE, parcelaPrice, TAXA_SBPE_ANUAL, type FaixaMCMV } from '@/lib/calculos';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Tipologia {
  type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  vagas: number | null;
  suites: number | null;
  area: string;
  private_area: string;
  total_area: string;
  price: string;
  stock: number | null;
  total_units: number | null;
  photo: string | null;
  blueprint: string | null;
}
interface Blueprint { name: string; url: string; }
interface ImovelDetalhe {
  id: string;
  name: string;
  developer: string;
  developer_logo: string | null;
  developer_website: string | null;
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
  zipcode: string;
  address_full: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  delivery_date: string | null;
  launch_date: string | null;
  total_units: number | null;
  stock: number | null;
  number_of_floors: number | null;
  number_of_towers: number | null;
  virtual_tour: string | null;
  finality: string | null;
  description: string;
  photos: string[];
  blueprints: Blueprint[];
  amenities: string[];
  typologies: Tipologia[];
  sharing_url: string | null;
}
interface RelatedImovel {
  id: string;
  name: string;
  developer: string;
  neighborhood: string;
  min_price: number | null;
  max_price: number | null;
  bedrooms_min: number | null;
  bedrooms_max: number | null;
  area_min: number | null;
  photos: string[];
  status: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function parseMoeda(v: string): number {
  return Number(v.replace(/\./g, '').replace(',', '.')) || 0;
}
function fmtInput(raw: string) {
  const d = raw.replace(/\D/g, '');
  return d ? Number(d).toLocaleString('pt-BR') : '';
}
function faixaRange(min: number | null, max: number | null, unit: string) {
  if (!min) return null;
  if (max && max !== min) return `${min}–${max} ${unit}`;
  return `${min} ${unit}`;
}

const STATUS_CFG: Record<string, { cor: string; bg: string; label: string }> = {
  'na planta':      { cor: '#2563eb', bg: 'rgba(37,99,235,.12)',  label: 'Na Planta' },
  'planta':         { cor: '#2563eb', bg: 'rgba(37,99,235,.12)',  label: 'Na Planta' },
  'pre-lançamento': { cor: '#7c3aed', bg: 'rgba(124,58,237,.12)', label: 'Pré-Lançamento' },
  'lançamento':     { cor: '#7c3aed', bg: 'rgba(124,58,237,.12)', label: 'Lançamento' },
  'lancamento':     { cor: '#7c3aed', bg: 'rgba(124,58,237,.12)', label: 'Lançamento' },
  'em obras':       { cor: '#d97706', bg: 'rgba(217,119,6,.12)',  label: 'Em Obras' },
  'em construção':  { cor: '#d97706', bg: 'rgba(217,119,6,.12)',  label: 'Em Construção' },
  'em andamento':   { cor: '#d97706', bg: 'rgba(217,119,6,.12)',  label: 'Em Andamento' },
  'pronto':         { cor: '#16a34a', bg: 'rgba(22,163,74,.12)',  label: 'Pronto' },
  'entregue':       { cor: '#16a34a', bg: 'rgba(22,163,74,.12)',  label: 'Entregue' },
};
function getStatus(s: string) {
  const key = s.toLowerCase().trim();
  if (STATUS_CFG[key]) return STATUS_CFG[key];
  if (key.includes('planta'))  return STATUS_CFG['na planta'];
  if (key.includes('lança'))   return STATUS_CFG['lançamento'];
  if (key.includes('constru') || key.includes('obra') || key.includes('andamento'))
    return STATUS_CFG['em obras'];
  if (key.includes('pronto') || key.includes('entreg') || key.includes('conclui'))
    return STATUS_CFG['pronto'];
  return { cor: '#475569', bg: 'rgba(71,85,105,.12)', label: s };
}

function calcEstimate(valorImovel: number) {
  const entrada = Math.round(valorImovel * 0.20);
  const financiado = valorImovel - entrada;
  // Renda sugerida: parcela Price a TAXA_SBPE_ANUAL, 30 anos ≤ 30% renda
  const i = (TAXA_SBPE_ANUAL / 100) / 12;
  const n = 360;
  const parcela = Math.round(financiado * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1) + (financiado * 0.00003) + 25);
  const rendaSugerida = Math.ceil(parcela / 0.30 / 100) * 100;
  // MCMV eligibility via tabela oficial
  const faixaMCMV: FaixaMCMV | null = FAIXAS_MCMV.find(f => valorImovel <= f.teto) ?? null;
  return { entrada, parcela, rendaSugerida, faixaMCMV };
}

function isNaPlanta(status: string) {
  const k = status.toLowerCase();
  return k.includes('planta') || k.includes('lança') || k.includes('constru') || k.includes('obra') || k.includes('andamento');
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero Gallery
// ─────────────────────────────────────────────────────────────────────────────
function HeroGallery({ photos, name }: { photos: string[]; name: string }) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const total = photos.length;

  useEffect(() => {
    if (lightbox === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setLightbox(l => l !== null ? (l + 1) % total : null);
      if (e.key === 'ArrowLeft')  setLightbox(l => l !== null ? (l - 1 + total) % total : null);
      if (e.key === 'Escape')     setLightbox(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, total]);

  if (!total) return (
    <div style={{ height: '360px', background: 'linear-gradient(135deg, #E2E8F0, #CBD5E1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🏙️</div>
  );

  return (
    <>
      {/* Main hero */}
      <div style={{ position: 'relative', height: 'min(520px, 56vw)', minHeight: '280px', background: '#000', overflow: 'hidden' }}>
        {photos.map((p, i) => (
          <img key={i} src={p} alt={`${name} foto ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'}
            onClick={() => setLightbox(i)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: i === current ? 1 : 0, transition: 'opacity 0.4s ease', cursor: 'zoom-in' }} />
        ))}
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.5) 0%, transparent 40%)' }} />

        {/* Nav arrows */}
        {total > 1 && (
          <>
            <button onClick={() => setCurrent(c => (c - 1 + total) % total)}
              style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <button onClick={() => setCurrent(c => (c + 1) % total)}
              style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          </>
        )}

        {/* Counter */}
        <div style={{ position: 'absolute', bottom: '16px', right: '16px', background: 'rgba(0,0,0,.6)', color: '#fff', fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px' }}>
          {current + 1} / {total}
        </div>
      </div>

      {/* Thumbnail strip */}
      {total > 1 && (
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '8px 0', scrollbarWidth: 'none' }}>
          {photos.map((p, i) => (
            <img key={i} src={p} alt="" onClick={() => setCurrent(i)}
              style={{ width: '72px', height: '52px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0, cursor: 'pointer', opacity: i === current ? 1 : 0.55, border: i === current ? '2px solid var(--primary)' : '2px solid transparent', transition: 'all 0.15s' }} />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button
            style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: '28px', width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); setLightbox(l => l !== null ? (l - 1 + total) % total : null); }}>‹</button>
          <img src={photos[lightbox]} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }} />
          <button onClick={(e) => { e.stopPropagation(); setLightbox(l => l !== null ? (l + 1) % total : null); }}
            style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: '28px', width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer' }}>›</button>
          <button onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: '20px', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer' }}>✕</button>
          <div style={{ position: 'absolute', bottom: '20px', color: 'rgba(255,255,255,.7)', fontSize: '13px' }}>{lightbox + 1} / {total}</div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sticky Section Nav
// ─────────────────────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: 'visao-geral',  label: 'Visão Geral' },
  { id: 'financeiro',   label: '💰 Financeiro' },
  { id: 'tipologias',   label: 'Tipologias' },
  { id: 'diferenciais', label: 'Diferenciais' },
  { id: 'localizacao',  label: 'Localização' },
  { id: 'relacionados', label: 'Similares' },
];
function StickyNav({ hasTypologies, hasAmenities }: { hasTypologies: boolean; hasAmenities: boolean }) {
  const [active, setActive] = useState('visao-geral');
  const sections = NAV_SECTIONS.filter(s =>
    (s.id !== 'tipologias'   || hasTypologies) &&
    (s.id !== 'diferenciais' || hasAmenities)
  );

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav style={{ position: 'sticky', top: 'var(--header-h)', zIndex: 100, background: 'rgba(255,255,255,.97)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(12px)', overflowX: 'auto', scrollbarWidth: 'none' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', gap: '4px' }}>
        {sections.map(s => (
          <a key={s.id} href={`#${s.id}`}
            onClick={() => setActive(s.id)}
            style={{ padding: '12px 14px', fontSize: '13px', fontWeight: active === s.id ? '700' : '500', color: active === s.id ? 'var(--primary)' : 'var(--text-muted)', borderBottom: active === s.id ? '2px solid var(--primary)' : '2px solid transparent', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Badge MCMV — elegibilidade com subsídio e taxa
// ─────────────────────────────────────────────────────────────────────────────
function BadgeMCMV({ valorImovel }: { valorImovel: number }) {
  const faixa = FAIXAS_MCMV.find(f => valorImovel <= f.teto);
  if (!faixa) return null;
  return (
    <div style={{ background: 'linear-gradient(135deg, #F0FDF4, #DCFCE7)', border: '1.5px solid #86EFAC', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
        <span style={{ fontSize: '16px' }}>🏠</span>
        <span style={{ fontSize: '12px', fontWeight: '800', color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Elegível MCMV {faixa.label}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ background: 'rgba(255,255,255,.7)', borderRadius: '10px', padding: '8px 10px' }}>
          <p style={{ fontSize: '10px', color: '#4ADE80', fontWeight: '600', marginBottom: '2px' }}>Taxa subsidiada</p>
          <p style={{ fontSize: '14px', fontWeight: '900', color: '#166534' }}>{faixa.taxaRef}% a.a.</p>
        </div>
        {faixa.subsidioMax > 0 ? (
          <div style={{ background: 'rgba(255,255,255,.7)', borderRadius: '10px', padding: '8px 10px' }}>
            <p style={{ fontSize: '10px', color: '#4ADE80', fontWeight: '600', marginBottom: '2px' }}>Subsídio máx.</p>
            <p style={{ fontSize: '14px', fontWeight: '900', color: '#166534' }}>{formatBRL(faixa.subsidioMax)}</p>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,.7)', borderRadius: '10px', padding: '8px 10px' }}>
            <p style={{ fontSize: '10px', color: '#4ADE80', fontWeight: '600', marginBottom: '2px' }}>FGTS</p>
            <p style={{ fontSize: '14px', fontWeight: '900', color: '#166534' }}>Permitido</p>
          </div>
        )}
      </div>
      <p style={{ fontSize: '10px', color: '#166534', marginTop: '8px', lineHeight: '1.5' }}>
        Renda até R$ {faixa.rendaMax.toLocaleString('pt-BR')}/mês · LTV máx. {Math.round(faixa.ltvMax * 100)}%
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparativo SBPE mini — para o sidebar do imóvel
// ─────────────────────────────────────────────────────────────────────────────
function ComparativoBancosCard({ financiado, prazoMeses }: { financiado: number; prazoMeses: number }) {
  if (financiado <= 0) return null;
  const menorTaxa = Math.min(...BANCOS_SBPE.map(b => b.taxa));
  return (
    <div style={{ background: '#F8FAFF', border: '1.5px solid #BFDBFE', borderRadius: '14px', padding: '14px', marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <span style={{ fontSize: '14px' }}>🏦</span>
        <p style={{ fontSize: '11px', fontWeight: '800', color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comparativo SBPE · mai/2026</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {BANCOS_SBPE.map((b, i) => {
          const parcela = parcelaPrice(financiado, b.taxa, prazoMeses > 0 ? prazoMeses : 360);
          const isMenor = b.taxa === menorTaxa && i === 0;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isMenor ? 'rgba(37,99,235,.07)' : 'rgba(255,255,255,.8)', border: `1px solid ${isMenor ? 'rgba(37,99,235,.25)' : 'rgba(0,0,0,.06)'}`, borderRadius: '10px', padding: '8px 10px' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#1E293B', lineHeight: 1.2 }}>{b.banco}</p>
                {b.obs && <p style={{ fontSize: '9px', color: '#64748B', marginTop: '1px' }}>{b.obs}</p>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                <p style={{ fontSize: '10px', color: '#64748B' }}>{b.taxa.toFixed(2)}% +TR</p>
                <p style={{ fontSize: '13px', fontWeight: '800', color: isMenor ? '#1D4ED8' : '#0F172A' }}>{formatBRL(parcela)}</p>
                {isMenor && <span style={{ fontSize: '9px', background: '#DBEAFE', color: '#1D4ED8', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>menor</span>}
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: '9px', color: '#94A3B8', marginTop: '8px', lineHeight: '1.4' }}>
        Parcela Price estimada · + TR mensal · variam por perfil e LTV
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloco Financeiro — card lateral sticky (diferencial FinancieCerto)
// ─────────────────────────────────────────────────────────────────────────────
function BlocoFinanceiro({ imovel }: { imovel: ImovelDetalhe }) {
  const valorRef = imovel.min_price ?? imovel.max_price ?? 0;
  const est = valorRef > 0 ? calcEstimate(valorRef) : null;

  // Simulator state
  const [expanded, setExpanded] = useState(false);
  const [renda, setRenda]   = useState('');
  const [entrada, setEntrada] = useState('');
  const [fgts, setFgts]     = useState('');
  const [prazo, setPrazo]   = useState('30');
  const [naPlanta, setNaPlanta] = useState(isNaPlanta(imovel.status || ''));
  const [resultado, setResultado] = useState<ReturnType<typeof simular> | null>(null);
  const [poder, setPoder]   = useState<ReturnType<typeof descobrir> | null>(null);
  const [erro, setErro]     = useState('');
  const [ctxLoaded, setCtxLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem('joao_sim_context') || sessionStorage.getItem('fc_sim_context');
      if (!raw) return;
      const ctx = JSON.parse(raw) as Record<string, unknown>;
      if (ctx.renda)   setRenda(fmtInput(String(ctx.renda)));
      if (ctx.fgts)    setFgts(fmtInput(String(ctx.fgts)));
      if (ctx.entrada) setEntrada(fmtInput(String(ctx.entrada)));
      if (ctx.renda || ctx.fgts || ctx.entrada) setCtxLoaded(true);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const r = parseMoeda(renda);
    const f = parseMoeda(fgts);
    const e = parseMoeda(entrada);
    if (r >= 800) setPoder(descobrir(r, f, e, parseInt(prazo), 35));
    else setPoder(null);
  }, [renda, fgts, entrada, prazo]);

  function calcular() {
    const r  = parseMoeda(renda);
    const en = parseMoeda(entrada);
    const fg = parseMoeda(fgts);
    if (!r || r < 800) { setErro('Informe sua renda mensal.'); return; }
    if (!valorRef)     { setErro('Valor do imóvel não disponível.'); return; }
    if (en + fg >= valorRef) { setErro('Entrada + FGTS não pode ser maior que o imóvel.'); return; }
    setErro('');
    setResultado(simular({ rendaBruta: r, entrada: en, fgts: fg, valorImovel: valorRef, prazoAnos: parseInt(prazo), naPlanta, prazoObraAnos: naPlanta ? 3 : 0, idadeProponente: 35 }));
  }

  const fg = parseMoeda(fgts);
  const en = parseMoeda(entrada);
  const poderTotal = poder ? (poder.mcmv.elegivel ? poder.mcmv.valorMaxImovel : poder.sbpe.valorMaxImovel) + fg + en : 0;
  const dentroAlcance = poderTotal > 0 && poderTotal >= valorRef;
  const diffPoder = poderTotal - valorRef;

  const waMsg = encodeURIComponent(`Olá! Vi o imóvel *${imovel.name}* no FinancieCerto e gostaria de mais informações.`);

  return (
    <div id="financeiro" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>

      {/* Header do bloco */}
      <div style={{ padding: '20px 20px 0', background: 'linear-gradient(135deg, #0f172a, #1e3a5f)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>FinancieCerto</span>
        </div>
        <p style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '16px' }}>Análise Financeira Instantânea</p>

        {/* Preço */}
        <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
          {imovel.min_price && imovel.max_price && imovel.min_price !== imovel.max_price ? (
            <>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.55)', marginBottom: '4px' }}>Faixa de preço</p>
              <p style={{ fontSize: '22px', fontWeight: '900', color: '#fff', lineHeight: 1 }}>
                {formatBRL(imovel.min_price)} <span style={{ fontSize: '14px', fontWeight: '400', color: 'rgba(255,255,255,.6)' }}>até</span> {formatBRL(imovel.max_price)}
              </p>
            </>
          ) : valorRef > 0 ? (
            <>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,.55)', marginBottom: '4px' }}>A partir de</p>
              <p style={{ fontSize: '26px', fontWeight: '900', color: '#fff', lineHeight: 1 }}>{formatBRL(valorRef)}</p>
            </>
          ) : (
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.6)' }}>Consulte preço</p>
          )}
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Estimativas instantâneas */}
        {est && valorRef > 0 && (
          <div style={{ marginBottom: '18px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Estimativas sem perfil</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Renda sugerida', value: formatBRL(est.rendaSugerida) + '/mês', icon: '💼', color: '#2563eb' },
                { label: 'Entrada (20%)', value: formatBRL(est.entrada), icon: '🏦', color: '#7c3aed' },
                { label: 'Parcela estimada', value: formatBRL(est.parcela) + '/mês', icon: '📅', color: '#0f6e56' },
                { label: est.faixaMCMV ? `${est.faixaMCMV.label} MCMV` : 'SBPE / SFI', value: est.faixaMCMV ? `até R$ ${est.faixaMCMV.rendaMax.toLocaleString('pt-BR')}` : 'Renda livre', icon: est.faixaMCMV ? '🏠' : '🏛️', color: est.faixaMCMV ? '#16a34a' : '#d97706' },
              ].map(({ label, value, icon, color }) => (
                <div key={label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>{icon}</div>
                  <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginBottom: '3px' }}>{label}</p>
                  <p style={{ fontSize: '13px', fontWeight: '800', color }}>{value}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '8px', textAlign: 'center' }}>
              * Estimativas SBPE {TAXA_SBPE_ANUAL}%+TR, 30 anos. Simule para valores precisos.
            </p>
          </div>
        )}

        {/* MCMV Eligibility Badge */}
        {valorRef > 0 && <BadgeMCMV valorImovel={valorRef} />}

        {/* Botão expandir simulador */}
        {!expanded ? (
          <button onClick={() => setExpanded(true)}
            style={{ width: '100%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#fff', border: 'none', borderRadius: '12px', padding: '13px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 16px rgba(37,99,235,.3)', marginBottom: '10px' }}>
            Simular este imóvel →
          </button>
        ) : (
          /* Simulador expandido */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text)' }}>Simulador personalizado</p>
              {ctxLoaded && (
                <span style={{ fontSize: '11px', color: '#085041', background: '#E1F5EE', padding: '3px 8px', borderRadius: '20px', fontWeight: '600' }}>✓ Perfil carregado</span>
              )}
            </div>

            {/* Campos */}
            {[
              { label: 'Renda familiar bruta', val: renda, set: (v: string) => { setRenda(fmtInput(v)); setErro(''); }, ph: '5.000' },
              { label: 'Entrada disponível', val: entrada, set: (v: string) => setEntrada(fmtInput(v)), ph: '0' },
              { label: 'FGTS disponível', val: fgts, set: (v: string) => setFgts(fmtInput(v)), ph: '0' },
            ].map(({ label, val, set, ph }) => (
              <div key={label}>
                <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>{label}</p>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', fontSize: '13px', fontWeight: '600' }}>R$</span>
                  <input type="text" inputMode="numeric" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                    style={{ width: '100%', padding: '10px 12px 10px 32px', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '14px', fontWeight: '600', outline: 'none', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              </div>
            ))}

            {/* Poder de compra preview */}
            {poderTotal > 0 && (
              <div style={{ background: dentroAlcance ? '#E1F5EE' : '#FEF3C7', border: `1px solid ${dentroAlcance ? '#A7F3D0' : '#FCD34D'}`, borderRadius: '12px', padding: '12px 14px' }}>
                <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>Seu Poder de Compra</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '8px', textAlign: 'center' }}>
                  <div>
                    <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginBottom: '2px' }}>Financiamento</p>
                    <p style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)' }}>{formatBRL(poder ? (poder.mcmv.elegivel ? poder.mcmv.valorMaxImovel : poder.sbpe.valorMaxImovel) : 0)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginBottom: '2px' }}>FGTS</p>
                    <p style={{ fontSize: '12px', fontWeight: '800', color: '#0F6E56' }}>{formatBRL(fg)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginBottom: '2px' }}>Entrada</p>
                    <p style={{ fontSize: '12px', fontWeight: '800', color: '#7C3AED' }}>{formatBRL(en)}</p>
                  </div>
                </div>
                <div style={{ borderTop: `1px solid ${dentroAlcance ? '#A7F3D0' : '#FCD34D'}`, paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: dentroAlcance ? '#085041' : '#854F0B' }}>
                    {dentroAlcance ? '✅' : '⚠️'} {formatBRL(poderTotal)}
                  </span>
                  <span style={{ fontSize: '11px', color: dentroAlcance ? '#085041' : '#854F0B', fontWeight: '600' }}>
                    {dentroAlcance ? `${formatBRL(diffPoder)} de sobra` : `${formatBRL(Math.abs(diffPoder))} acima`}
                  </span>
                </div>
              </div>
            )}

            {/* SBPE multi-banco preview — aparece quando renda preenche perfil SBPE */}
            {poder && !poder.mcmv.elegivel && valorRef > 0 && (
              <ComparativoBancosCard
                financiado={Math.round(valorRef * 0.80)}
                prazoMeses={parseInt(prazo) * 12}
              />
            )}

            {/* Prazo */}
            <div>
              <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>Prazo</p>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['20','25','30','35'].map(v => (
                  <button key={v} onClick={() => setPrazo(v)} style={{ flex: 1, padding: '8px 0', borderRadius: '8px', fontSize: '12px', fontWeight: prazo === v ? '800' : '500', border: `2px solid ${prazo === v ? 'var(--primary)' : 'var(--border)'}`, background: prazo === v ? 'var(--primary-light)' : 'var(--bg)', color: prazo === v ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}>{v}a</button>
                ))}
              </div>
            </div>

            {/* Na planta toggle */}
            {isNaPlanta(imovel.status || '') && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(37,99,235,.06)', border: '1px solid rgba(37,99,235,.2)', borderRadius: '10px' }}>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', margin: 0 }}>Juros evolutivos (obra)</p>
                  <p style={{ fontSize: '10px', color: 'var(--text-faint)', margin: '2px 0 0' }}>Simula o período de construção</p>
                </div>
                <button onClick={() => setNaPlanta(p => !p)} style={{ width: '40px', height: '22px', borderRadius: '99px', border: 'none', cursor: 'pointer', background: naPlanta ? 'var(--primary)' : 'var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <span style={{ position: 'absolute', top: '2px', left: naPlanta ? '20px' : '2px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                </button>
              </div>
            )}

            {erro && <p style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: '8px' }}>⚠️ {erro}</p>}

            <button onClick={calcular} style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#fff', border: 'none', borderRadius: '12px', padding: '13px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', width: '100%', boxShadow: '0 4px 16px rgba(37,99,235,.3)' }}>
              Calcular parcelas →
            </button>

            {resultado && (() => {
              const parcela = resultado.parcelaPrimeiro;
              const comprometimento = parseMoeda(renda) > 0 ? Math.round((parcela / parseMoeda(renda)) * 100) : 0;
              const alerta = comprometimento > 30;
              const minFiltro = Math.round(valorRef * 0.75);
              const maxFiltro = Math.round(valorRef * 1.25);
              const ctaLink = `/imoveis?min=${minFiltro}&max=${maxFiltro}${isNaPlanta(imovel.status || '') ? '&status=na planta' : ''}`;
              return (
                <>
                  <div style={{ background: alerta ? 'rgba(239,68,68,.06)' : 'rgba(22,163,74,.06)', border: `1px solid ${alerta ? 'rgba(239,68,68,.25)' : 'rgba(22,163,74,.25)'}`, borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>1ª Parcela</p>
                        <p style={{ fontSize: '22px', fontWeight: '900', color: alerta ? '#dc2626' : 'var(--primary)' }}>{formatBRL(parcela)}</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Comprometimento</p>
                        <p style={{ fontSize: '22px', fontWeight: '900', color: alerta ? '#dc2626' : '#16a34a' }}>{comprometimento}%</p>
                      </div>
                    </div>
                    {alerta && <p style={{ fontSize: '12px', color: '#dc2626', textAlign: 'center', marginBottom: '10px' }}>⚠️ Acima de 30% da renda — risco de reprovação</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {[
                        { l: 'Tabela Price', v: formatBRL(resultado.parcelaPrimeiro) },
                        { l: 'SAC (1ª)', v: formatBRL(resultado.parcelaSACPrimeiro) },
                        { l: 'Valor financiado', v: formatBRL(resultado.valorFinanciado) },
                        { l: 'Total pago (Price)', v: formatBRL(resultado.totalPagoPrice) },
                      ].map(({ l, v }) => (
                        <div key={l} style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginBottom: '2px' }}>{l}</p>
                          <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* CTAs pós-simulação */}
                  <Link href={ctaLink}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', background: 'var(--primary-light)', color: 'var(--primary)', border: '1.5px solid rgba(37,99,235,.25)', borderRadius: '12px', padding: '10px', fontSize: '12px', fontWeight: '700', textDecoration: 'none', textAlign: 'center' }}>
                    🏠 Ver imóveis compatíveis — {formatBRL(minFiltro)} a {formatBRL(maxFiltro)}
                  </Link>
                  <Link href="/simulador"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '12px', padding: '9px', fontSize: '12px', fontWeight: '600', textDecoration: 'none', textAlign: 'center' }}>
                    📊 Simulador completo com todos os cenários →
                  </Link>
                </>
              );
            })()}
          </div>
        )}

        {/* CTA WhatsApp */}
        <a href={`https://wa.me/5511999999999?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', background: '#25D366', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px', fontSize: '13px', fontWeight: '700', textDecoration: 'none', marginTop: '10px' }}>
          <span>💬</span> Falar com consultor
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipologias em cards
// ─────────────────────────────────────────────────────────────────────────────
function SecaoTipologias({ typologies }: { typologies: Tipologia[] }) {
  if (!typologies.length) return null;
  return (
    <div id="tipologias" style={{ scrollMarginTop: '100px' }}>
      <SectionHeader title="Tipologias" subtitle="Plantas e configurações disponíveis" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        {typologies.map((t, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', transition: 'box-shadow 0.2s' }}>
            {t.photo && (
              <img src={t.photo} alt={t.type} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
            )}
            <div style={{ padding: '16px' }}>
              <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text)', marginBottom: '12px' }}>{t.type}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {t.area && <SpecChip icon="▦" label={`${t.area} m²`} />}
                {t.bedrooms !== null && <SpecChip icon="🛏" label={`${t.bedrooms} quarto${t.bedrooms !== 1 ? 's' : ''}`} />}
                {t.suites !== null && <SpecChip icon="🛁" label={`${t.suites} suíte${t.suites !== 1 ? 's' : ''}`} />}
                {t.vagas !== null && <SpecChip icon="🚗" label={`${t.vagas} vaga${t.vagas !== 1 ? 's' : ''}`} />}
                {t.bathrooms !== null && <SpecChip icon="🚿" label={`${t.bathrooms} ban.`} />}
              </div>
              {t.price && t.price !== 'Consultar' && (
                <p style={{ fontSize: '15px', fontWeight: '900', color: 'var(--primary)', marginBottom: '6px' }}>{t.price}</p>
              )}
              {(t.stock !== null || t.total_units !== null) && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {t.stock !== null && (
                    <span style={{ fontSize: '10px', fontWeight: '700', color: (t.stock ?? 0) > 0 ? '#16a34a' : '#dc2626', background: (t.stock ?? 0) > 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${(t.stock ?? 0) > 0 ? '#86efac' : '#fca5a5'}`, borderRadius: '6px', padding: '2px 8px' }}>
                      🔑 {t.stock} disponíveis
                    </span>
                  )}
                  {t.total_units !== null && (
                    <span style={{ fontSize: '10px', color: 'var(--text-faint)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 8px' }}>
                      {t.total_units} total
                    </span>
                  )}
                </div>
              )}
              {t.blueprint && (
                <a href={t.blueprint} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '12px', fontWeight: '600', color: 'var(--primary)', textDecoration: 'none' }}>
                  📐 Ver planta
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SpecChip({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px 8px' }}>
      <span style={{ fontSize: '12px' }}>{icon}</span>
      <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Diferenciais & Lazer
// ─────────────────────────────────────────────────────────────────────────────
const AMENITY_ICONS: Record<string, string> = {
  piscina: '🏊', academia: '🏋️', salão: '🎉', churrasqueira: '🔥',
  playground: '🛝', portaria: '🔐', elevador: '🛗', garden: '🌿',
  sauna: '♨️', spa: '💆', 'espaço gourmet': '🍽️', coworking: '💻',
  brinquedoteca: '🧸', pet: '🐾', quadra: '🎾', cinema: '🎬',
  bike: '🚴', lavanderia: '🫧', rooftop: '🌆', concierge: '🫡',
};
function getAmenityIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(AMENITY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '✨';
}

function SecaoDiferenciais({ amenities }: { amenities: string[] }) {
  if (!amenities.length) return null;
  return (
    <div id="diferenciais" style={{ scrollMarginTop: '100px' }}>
      <SectionHeader title="Diferenciais & Lazer" subtitle={`${amenities.length} itens de lazer e infraestrutura`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
        {amenities.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px' }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>{getAmenityIcon(a)}</span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)', lineHeight: 1.3 }}>{a}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Localização contextual
// ─────────────────────────────────────────────────────────────────────────────
function SecaoLocalizacao({ imovel }: { imovel: ImovelDetalhe }) {
  return (
    <div id="localizacao" style={{ scrollMarginTop: '100px' }}>
      <SectionHeader title="Localização" subtitle={`${imovel.neighborhood} · ${imovel.city}, ${imovel.state}`} />

      {/* Context chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        {[
          { icon: '📍', label: imovel.neighborhood },
          { icon: '🏙️', label: imovel.city },
          imovel.address_full && { icon: '🗺️', label: imovel.address_full },
          imovel.zipcode && { icon: '📮', label: `CEP ${imovel.zipcode}` },
        ].filter(Boolean).map((item, i) => {
          const { icon, label } = item as { icon: string; label: string };
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '6px 14px' }}>
              <span style={{ fontSize: '14px' }}>{icon}</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Map */}
      {imovel.latitude && imovel.longitude ? (
        <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', height: '300px' }}>
          <iframe
            title="Localização do imóvel"
            width="100%" height="300"
            style={{ border: 'none', display: 'block' }}
            src={`https://maps.google.com/maps?q=${imovel.latitude},${imovel.longitude}&z=15&output=embed`}
          />
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '32px' }}>🗺️</span>
          <p style={{ color: 'var(--text-faint)', fontSize: '13px' }}>Mapa não disponível</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Imóveis relacionados
// ─────────────────────────────────────────────────────────────────────────────
function SecaoRelacionados({ neighborhood, currentId }: { neighborhood: string; currentId: string }) {
  const [relacionados, setRelacionados] = useState<RelatedImovel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!neighborhood) return;
    fetch(`/api/orulo?neighborhood=${encodeURIComponent(neighborhood)}`)
      .then(r => r.json())
      .then((data: { buildings?: RelatedImovel[] }) => {
        setRelacionados((data.buildings || []).filter(im => im.id !== currentId).slice(0, 6));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [neighborhood, currentId]);

  if (loading) return null;
  if (!relacionados.length) return null;

  return (
    <div id="relacionados" style={{ scrollMarginTop: '100px' }}>
      <SectionHeader title="Imóveis no mesmo bairro" subtitle={`Mais opções em ${neighborhood}`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
        {relacionados.map(im => {
          const sc = getStatus(im.status || '');
          return (
            <Link key={im.id} href={`/imoveis/${im.id}`}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', textDecoration: 'none', transition: 'box-shadow 0.2s', display: 'block' }}>
              <div style={{ height: '140px', background: '#E2E8F0', position: 'relative', overflow: 'hidden' }}>
                {im.photos?.[0] ? (
                  <img src={im.photos[0]} alt={im.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🏢</div>
                )}
                <div style={{ position: 'absolute', top: '10px', left: '10px', background: sc.bg, color: sc.cor, border: `1px solid ${sc.cor}33`, borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: '700' }}>
                  {sc.label}
                </div>
              </div>
              <div style={{ padding: '14px' }}>
                <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{im.name}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginBottom: '10px' }}>{im.developer}</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {im.bedrooms_min !== null && <SpecChip icon="🛏" label={`${im.bedrooms_min}${im.bedrooms_min !== im.bedrooms_max && im.bedrooms_max ? `–${im.bedrooms_max}` : ''} qts`} />}
                  {im.area_min !== null && <SpecChip icon="▦" label={`${im.area_min}m²`} />}
                </div>
                {im.min_price && (
                  <p style={{ fontSize: '14px', fontWeight: '900', color: 'var(--primary)' }}>
                    {formatBRL(im.min_price)}
                    {im.max_price && im.max_price !== im.min_price && <span style={{ fontWeight: '400', color: 'var(--text-faint)', fontSize: '11px' }}> – {formatBRL(im.max_price)}</span>}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Header helper
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', marginBottom: '4px' }}>{title}</h2>
      {subtitle && <p style={{ fontSize: '13px', color: 'var(--text-faint)' }}>{subtitle}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function ImovelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [imovel, setImovel] = useState<ImovelDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/orulo/${id}`);
        if (!res.ok) throw new Error('Não encontrado');
        const data: ImovelDetalhe = await res.json();
        setImovel(data);
        // Salva contexto para João consultor
        try {
          const ctx = { id: data.id, name: data.name, developer: data.developer, minPrice: data.min_price, maxPrice: data.max_price, status: data.status, neighborhood: data.neighborhood, city: data.city, deliveryDate: data.delivery_date };
          sessionStorage.setItem('fc_current_imovel', JSON.stringify(ctx));
          window.dispatchEvent(new StorageEvent('storage', { key: 'fc_current_imovel', newValue: JSON.stringify(ctx) }));
        } catch { /* ignore */ }
      } catch { setErro('Imóvel não encontrado ou indisponível.'); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return (
    <div style={{ padding: '120px 24px', textAlign: 'center' }}>
      <div style={{ width: '48px', height: '48px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
      <p style={{ color: 'var(--text-muted)' }}>Carregando imóvel...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (erro || !imovel) return (
    <div style={{ padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏚️</div>
      <p style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>{erro}</p>
      <Link href="/imoveis" style={{ color: 'var(--primary)', fontWeight: '600' }}>← Voltar para imóveis</Link>
    </div>
  );

  const statusCfg = getStatus(imovel.status || '');
  const specs = [
    faixaRange(imovel.area_min, imovel.area_max, 'm²')             && { icon: '▦',  label: faixaRange(imovel.area_min, imovel.area_max, 'm²')! },
    faixaRange(imovel.bedrooms_min, imovel.bedrooms_max, 'quartos') && { icon: '🛏', label: faixaRange(imovel.bedrooms_min, imovel.bedrooms_max, 'quartos')! },
    faixaRange(imovel.bathrooms_min, imovel.bathrooms_max, 'ban.')  && { icon: '🚿', label: faixaRange(imovel.bathrooms_min, imovel.bathrooms_max, 'ban.')! },
    faixaRange(imovel.vagas_min, imovel.vagas_max, 'vagas')         && { icon: '🚗', label: faixaRange(imovel.vagas_min, imovel.vagas_max, 'vagas')! },
    imovel.total_units                                               && { icon: '🏢', label: `${imovel.total_units} unidades` },
    imovel.stock !== null && imovel.stock !== undefined              && { icon: '🔑', label: `${imovel.stock} disponíveis` },
    imovel.number_of_floors                                          && { icon: '⬆️', label: `${imovel.number_of_floors} andares` },
    imovel.number_of_towers && imovel.number_of_towers > 1          && { icon: '🏗️', label: `${imovel.number_of_towers} torres` },
  ].filter(Boolean) as { icon: string; label: string }[];

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── Gallery Hero (full width) ────────────────────────────────────── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
            <Link href="/imoveis" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>← Imóveis</Link>
            <span style={{ margin: '0 6px' }}>·</span>
            <span>{imovel.neighborhood}</span>
            <span style={{ margin: '0 6px' }}>·</span>
            <span style={{ color: 'var(--text)' }}>{imovel.name}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {imovel.sharing_url && (
              <a href={imovel.sharing_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', padding: '5px 12px', textDecoration: 'none' }}>
                🔗 Ver original
              </a>
            )}
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '600', color: copied ? '#16a34a' : 'var(--text-muted)', background: copied ? '#E1F5EE' : 'var(--bg-card)', border: `1px solid ${copied ? '#86EFAC' : 'var(--border)'}`, borderRadius: '8px', padding: '5px 12px', cursor: 'pointer', transition: 'all 0.2s' }}>
              {copied ? '✓ Copiado!' : '📋 Copiar link'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
        <HeroGallery photos={imovel.photos} name={imovel.name} />
      </div>

      {/* ── Info bar abaixo da galeria ──────────────────────────────────── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '8px' }}>
          <div style={{ flex: '1 1 auto' }}>
            {/* Status + bairro */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <span style={{ background: statusCfg.bg, color: statusCfg.cor, border: `1px solid ${statusCfg.cor}40`, borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>
                {statusCfg.label}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-faint)' }}>📍 {imovel.neighborhood} · {imovel.city}</span>
              {imovel.delivery_date && (
                <span style={{ fontSize: '12px', color: 'var(--text-faint)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '3px 10px' }}>
                  🗓️ Entrega: {imovel.delivery_date}
                </span>
              )}
              {imovel.launch_date && (
                <span style={{ fontSize: '12px', color: 'var(--text-faint)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '3px 10px' }}>
                  🚀 Lançamento: {imovel.launch_date}
                </span>
              )}
              {imovel.stock !== null && imovel.stock !== undefined && (
                <span style={{ fontSize: '12px', fontWeight: '700', color: imovel.stock > 0 ? '#16a34a' : '#dc2626', background: imovel.stock > 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${imovel.stock > 0 ? '#86efac' : '#fca5a5'}`, borderRadius: '20px', padding: '3px 10px' }}>
                  {imovel.stock > 0 ? `✅ ${imovel.stock} unid. disponíveis` : '❌ Sem unidades disponíveis'}
                </span>
              )}
            </div>
            {/* Nome */}
            <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: '900', color: 'var(--text)', marginBottom: '8px', lineHeight: 1.2 }}>{imovel.name}</h1>
            {/* Construtora */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              {imovel.developer_logo && (
                <img src={imovel.developer_logo} alt={imovel.developer} style={{ height: '24px', objectFit: 'contain' }} />
              )}
              <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>{imovel.developer}</span>
            </div>
            {/* Specs row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {specs.map(({ icon, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '6px 14px' }}>
                  <span style={{ fontSize: '14px' }}>{icon}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preço destaque (desktop) */}
          <div className="price-desktop" style={{ textAlign: 'right', flexShrink: 0 }}>
            {imovel.min_price && (
              <>
                <p style={{ fontSize: '12px', color: 'var(--text-faint)', marginBottom: '4px' }}>A partir de</p>
                <p style={{ fontSize: '28px', fontWeight: '900', color: 'var(--primary)', lineHeight: 1 }}>{formatBRL(imovel.min_price)}</p>
                {imovel.max_price && imovel.max_price !== imovel.min_price && (
                  <p style={{ fontSize: '13px', color: 'var(--text-faint)', marginTop: '4px' }}>até {formatBRL(imovel.max_price)}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky Nav ───────────────────────────────────────────────────── */}
      <StickyNav hasTypologies={imovel.typologies.length > 0} hasAmenities={imovel.amenities.length > 0} />

      {/* ── Two-column content ──────────────────────────────────────────── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 80px' }}>
        <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: '40px', alignItems: 'start' }}>

          {/* ── LEFT: sections ────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>

            {/* Visão geral */}
            <div id="visao-geral" style={{ scrollMarginTop: '100px' }}>
              <SectionHeader title="Visão Geral" />
              {imovel.description && (
                <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--text-muted)', marginBottom: '20px' }}>{imovel.description}</p>
              )}
              {specs.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                  {specs.map(({ icon, label }) => (
                    <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
                      <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>{label}</p>
                    </div>
                  ))}
                </div>
              )}
              {/* Blueprints */}
              {imovel.blueprints.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '10px' }}>Plantas disponíveis</p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {imovel.blueprints.map((bp, i) => (
                      <a key={i} href={bp.url} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', border: '1px solid var(--primary)30', color: 'var(--primary)', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', textDecoration: 'none' }}>
                        📐 {bp.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {/* Tour Virtual */}
              {imovel.virtual_tour && (
                <div style={{ marginTop: '20px' }}>
                  <a href={imovel.virtual_tour} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #7c3aed, #2563eb)', color: '#fff', borderRadius: '12px', padding: '12px 20px', fontSize: '13px', fontWeight: '700', textDecoration: 'none', boxShadow: '0 4px 12px rgba(124,58,237,.3)' }}>
                    🥽 Tour Virtual 360°
                  </a>
                </div>
              )}
            </div>

            {/* Financeiro (mobile only — aparece na coluna esquerda em telas pequenas) */}
            <div className="financeiro-mobile" style={{ display: 'none' }}>
              <BlocoFinanceiro imovel={imovel} />
            </div>

            <SecaoTipologias typologies={imovel.typologies} />
            <SecaoDiferenciais amenities={imovel.amenities} />
            <SecaoLocalizacao imovel={imovel} />
            <SecaoRelacionados neighborhood={imovel.neighborhood} currentId={imovel.id} />
          </div>

          {/* ── RIGHT: sticky financial card ──────────────────────────── */}
          <div className="financeiro-desktop" style={{ position: 'sticky', top: 'calc(var(--header-h) + 52px + 24px)', maxHeight: 'calc(100vh - var(--header-h) - 100px)', overflowY: 'auto' }}>
            <BlocoFinanceiro imovel={imovel} />
          </div>
        </div>
      </div>

      {/* ── Responsive styles ──────────────────────────────────────────── */}
      <style>{`
        @media (max-width: 860px) {
          .detail-grid { grid-template-columns: 1fr !important; }
          .financeiro-desktop { display: none !important; }
          .financeiro-mobile { display: block !important; }
          .price-desktop { display: none !important; }
        }
        .detail-grid > div:last-child { scrollbar-width: thin; }
      `}</style>
    </div>
  );
}
