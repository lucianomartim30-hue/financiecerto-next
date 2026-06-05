'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatBRL, simular, descobrir, FAIXAS_MCMV, BANCOS_SBPE, parcelaPrice, TAXA_SBPE_ANUAL, type FaixaMCMV } from '@/lib/calculos';
import { lookupSPCoords } from '@/lib/sp-neighborhoods';

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
  address_full?: string;
  street?: string;
  min_price: number | null;
  max_price: number | null;
  bedrooms_min: number | null;
  bedrooms_max: number | null;
  area_min: number | null;
  photo: string | null;
  status: string;
  status_norm?: string;
  lat?: number | null;
  lng?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Classifica o campo virtual_tour da Orulo.
 * Retorna 'tour' se for uma plataforma de tour 360° reconhecida,
 * ou 'site' se for apenas o site/contato da construtora.
 * O campo é mal usado pela Orulo — às vezes recebe o site da construtora.
 */
function classifyTourUrl(url: string): 'tour' | 'site' | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    const TOUR_PLATFORMS = [
      'matterport.com', 'my.matterport.com',
      'kuula.co', 'kuula.com',
      'roundme.com',
      'cloudpano.com',
      'momento360.com',
      'klapty.com',
      'lapentor.com',
      'giraffe360.com',
      'vtournow.com',
      'panotour.com',
      '360cities.net',
      'youtube.com', 'youtu.be',   // vídeos 360°
      'vimeo.com',
      'tours.orulo.com.br',
      'orulo.com.br',
    ];
    const isTour = TOUR_PLATFORMS.some(p => host === p || host.endsWith('.' + p))
      || host.startsWith('tour.')
      || host.startsWith('360.')
      || url.toLowerCase().includes('/tour')
      || url.toLowerCase().includes('virtual');
    return isTour ? 'tour' : 'site';
  } catch {
    return null;
  }
}

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
// Hero Gallery — mosaico estilo Orulo (1 principal + 2 laterais + lightbox)
// ─────────────────────────────────────────────────────────────────────────────
function HeroGallery({ photos, name }: { photos: string[]; name: string }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  // lightboxUrlOverrides: URL atual por índice quando diferente de photos[i]
  const [lightboxUrlOverrides, setLightboxUrlOverrides] = useState<Map<number, string>>(new Map());
  // failedPhotos: índices confirmados como quebrados (todas variantes falharam)
  const [failedPhotos, setFailedPhotos] = useState<Set<number>>(new Set());
  // mosaicFailed: slots do mosaico que falharam (para ocultar o container)
  const [mosaicFailed, setMosaicFailed] = useState<Set<number>>(new Set());

  const total = photos.length;

  // Cadeia de fallback por variante CDN Orulo (qualidade decrescente)
  function nextVariantUrl(url: string): string {
    if (url.includes('/large/'))   return url.replace('/large/', '/xlarge/');
    if (url.includes('/xlarge/'))  return url.replace('/xlarge/', '/featured_modern_without_watermark/');
    if (/\/\d+x\d+\//.test(url))  return url.replace(/\/\d+x\d+\//, '/featured_modern_without_watermark/');
    return '';
  }

  // Próximo índice válido (pula fotos confirmadas como quebradas)
  function nextValid(from: number, dir: 1 | -1): number {
    let idx = (from + dir + total) % total;
    let tries = 0;
    while (failedPhotos.has(idx) && tries < total) {
      idx = (idx + dir + total) % total;
      tries++;
    }
    return idx;
  }

  // onError do mosaico: tenta variante; se esgotada, oculta o container inteiro e registra falha
  function mosaicOnError(e: React.SyntheticEvent<HTMLImageElement>, idx: number) {
    const img = e.currentTarget;
    const next = nextVariantUrl(img.src);
    if (next) { img.src = next; return; }
    // Oculta o container pai para não mostrar caixa preta
    const container = img.closest('[data-mosaic-slot]') as HTMLElement | null;
    if (container) container.style.display = 'none';
    setMosaicFailed(prev => new Set([...prev, idx]));
    setFailedPhotos(prev => new Set([...prev, idx]));
  }

  // onError do lightbox: tenta variante; se esgotada, pula para próxima foto válida
  function lightboxOnError(idx: number) {
    const currentUrl = lightboxUrlOverrides.get(idx) ?? photos[idx];
    const next = nextVariantUrl(currentUrl);
    if (next) {
      setLightboxUrlOverrides(prev => new Map(prev).set(idx, next));
      return;
    }
    // Todas variantes falharam — registra e pula automaticamente
    setFailedPhotos(prev => {
      const updated = new Set([...prev, idx]);
      // Calcula próximo válido com o set atualizado
      let ni = (idx + 1) % total;
      let tries = 0;
      while (updated.has(ni) && tries < total) { ni = (ni + 1) % total; tries++; }
      if (tries < total) setLightbox(ni);
      else setLightbox(null); // todas falharam — fecha lightbox
      return updated;
    });
  }

  // Contagem real (exclui fotos já confirmadas quebradas)
  const validCount = total - failedPhotos.size;

  useEffect(() => {
    if (lightbox === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setLightbox(l => l !== null ? nextValid(l, 1)  : null);
      if (e.key === 'ArrowLeft')  setLightbox(l => l !== null ? nextValid(l, -1) : null);
      if (e.key === 'Escape')     setLightbox(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, total, failedPhotos]);

  if (!total) return (
    <div style={{ height: '420px', background: 'linear-gradient(135deg, #E2E8F0, #CBD5E1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>🏙️</div>
  );

  return (
    <>
      {/* ── Mosaico principal ─────────────────────────────────────────── */}
      <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            height: 'min(560px, 56vw)',
            minHeight: '260px',
            gap: '4px',
            // 1 foto → full width | 2+ fotos → principal (1.75fr) + coluna lateral (1fr)
            gridTemplateColumns: total >= 2 ? '1.75fr 1fr' : '1fr',
            // 3+ fotos → coluna lateral divide em 2 linhas
            gridTemplateRows: total >= 3 ? '1fr 1fr' : '1fr',
          }}
        >
          {/* Foto 1 — principal, ocupa toda a altura à esquerda */}
          <div
            onClick={() => setLightbox(0)}
            style={{
              gridRow: total >= 3 ? '1 / span 2' : '1',
              position: 'relative', overflow: 'hidden',
              cursor: 'zoom-in', background: '#1e293b',
            }}
          >
            <img
              src={photos[0]}
              alt={`${name} — foto 1`}
              loading="eager"
              onError={e => mosaicOnError(e, 0)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>

          {/* Foto 2 — superior direita */}
          {total >= 2 && (
            <div
              data-mosaic-slot="1"
              onClick={() => setLightbox(1)}
              style={{ position: 'relative', overflow: 'hidden', cursor: 'zoom-in', background: '#1e293b' }}
            >
              <img
                src={photos[1]}
                alt={`${name} — foto 2`}
                loading="lazy"
                onError={e => mosaicOnError(e, 1)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          )}

          {/* Foto 3 — inferior direita, com overlay "+N" se houver mais */}
          {total >= 3 && (
            <div
              data-mosaic-slot="2"
              onClick={() => setLightbox(2)}
              style={{ position: 'relative', overflow: 'hidden', cursor: 'zoom-in', background: '#1e293b' }}
            >
              <img
                src={photos[2]}
                alt={`${name} — foto 3`}
                loading="lazy"
                onError={e => mosaicOnError(e, 2)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* Overlay escuro com contagem de fotos restantes */}
              {validCount > 3 && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,.52)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ color: '#fff', fontWeight: '800', fontSize: '20px' }}>+{validCount - 3}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botão flutuante "Ver todas as fotos" */}
        <button
          onClick={() => setLightbox(0)}
          style={{
            position: 'absolute', bottom: '14px', right: '14px',
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(0,0,0,.1)', borderRadius: '8px',
            padding: '7px 14px', fontSize: '12px', fontWeight: '700',
            color: '#0f172a', cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(0,0,0,.25)',
          }}
        >
          🖼️ Ver todas as fotos ({validCount > 0 ? validCount : total})
        </button>
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────── */}
      {lightbox !== null && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <button
            style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: '28px', width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); setLightbox(l => l !== null ? nextValid(l, -1) : null); }}
          >‹</button>

          {/* Foto em tamanho natural — key força remount ao navegar para novo índice */}
          <img
            key={lightbox}
            src={lightboxUrlOverrides.get(lightbox) ?? photos[lightbox]}
            alt={`${name} — foto ${lightbox + 1}`}
            onError={() => lightboxOnError(lightbox)}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }}
          />

          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(l => l !== null ? nextValid(l, 1) : null); }}
            style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: '28px', width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer' }}
          >›</button>

          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: '20px', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer' }}
          >✕</button>

          <div style={{ position: 'absolute', bottom: '20px', color: 'rgba(255,255,255,.7)', fontSize: '13px' }}>
            {/* Posição sequencial entre fotos válidas (não pula números) */}
            {(() => {
              const validList = photos.map((_, i) => i).filter(i => !failedPhotos.has(i));
              const pos = validList.indexOf(lightbox) + 1;
              return `${pos > 0 ? pos : lightbox + 1} / ${validCount > 0 ? validCount : total}`;
            })()}
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sticky Section Nav
// ─────────────────────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: 'visao-geral',      label: 'Visão Geral'     },
  { id: 'caracteristicas',  label: 'Características' },
  { id: 'financeiro',       label: '💰 Financeiro'   },
  { id: 'tipologias',       label: 'Tipologias'      },
  { id: 'diferenciais',     label: 'Lazer'           },
  { id: 'empreendimento',   label: 'Empreendimento'  },
  { id: 'localizacao',      label: 'Localização'     },
  { id: 'relacionados',     label: 'Similares'       },
];
function StickyNav({ hasTypologies, hasAmenities, hasCaracteristicas }: { hasTypologies: boolean; hasAmenities: boolean; hasCaracteristicas: boolean }) {
  const [active, setActive] = useState('visao-geral');
  const sections = NAV_SECTIONS.filter(s =>
    (s.id !== 'tipologias'     || hasTypologies)     &&
    (s.id !== 'diferenciais'   || hasAmenities)      &&
    (s.id !== 'caracteristicas'|| hasCaracteristicas)
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
        <a href={`https://wa.me/5511933661403?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
          onClick={() => { import('@/lib/gtag').then(m => m.trackLead({ imovel: imovel?.name, bairro: imovel?.neighborhood })); }}
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
              <img
                src={t.photo} alt={t.type}
                style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
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
// Características do Imóvel — specs da unidade com labels legíveis
// ─────────────────────────────────────────────────────────────────────────────
function SecaoCaracteristicas({ imovel }: { imovel: ImovelDetalhe }) {
  const items = [
    imovel.area_min ? {
      icon: '▦', label: 'Área',
      value: imovel.area_max && imovel.area_max !== imovel.area_min
        ? `${imovel.area_min} – ${imovel.area_max} m²` : `${imovel.area_min} m²`,
    } : null,
    imovel.bedrooms_min !== null ? {
      icon: '🛏', label: 'Quartos',
      value: imovel.bedrooms_max && imovel.bedrooms_max !== imovel.bedrooms_min
        ? `${imovel.bedrooms_min} – ${imovel.bedrooms_max}` : `${imovel.bedrooms_min}`,
    } : null,
    imovel.bathrooms_min !== null ? {
      icon: '🚿', label: 'Banheiros',
      value: imovel.bathrooms_max && imovel.bathrooms_max !== imovel.bathrooms_min
        ? `${imovel.bathrooms_min} – ${imovel.bathrooms_max}` : `${imovel.bathrooms_min}`,
    } : null,
    imovel.vagas_min !== null ? {
      icon: '🚗', label: 'Vagas',
      value: imovel.vagas_max && imovel.vagas_max !== imovel.vagas_min
        ? `${imovel.vagas_min} – ${imovel.vagas_max}` : `${imovel.vagas_min}`,
    } : null,
  ].filter(Boolean) as { icon: string; label: string; value: string }[];

  if (!items.length) return null;
  return (
    <div id="caracteristicas" style={{ scrollMarginTop: '100px' }}>
      <SectionHeader title="Características do Imóvel" subtitle="Especificações da unidade" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
        {items.map(({ icon, label, value }) => (
          <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '26px', marginBottom: '8px' }}>{icon}</div>
            <p style={{ fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</p>
            <p style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)' }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sobre o Empreendimento — construtora + metadados do empreendimento
// ─────────────────────────────────────────────────────────────────────────────
function SecaoEmpreendimento({ imovel }: { imovel: ImovelDetalhe }) {
  const metaItems = [
    imovel.status        ? { icon: '📊', label: 'Estágio',             value: getStatus(imovel.status).label } : null,
    imovel.finality      ? { icon: '🏠', label: 'Finalidade',          value: imovel.finality               } : null,
    imovel.total_units   ? { icon: '🏢', label: 'Total de unidades',   value: String(imovel.total_units)    } : null,
    (imovel.stock !== null && imovel.stock !== undefined)
                         ? { icon: '🔑', label: 'Disponíveis',         value: String(imovel.stock)          } : null,
    imovel.number_of_floors ? { icon: '⬆️', label: 'Andares',         value: String(imovel.number_of_floors) } : null,
    (imovel.number_of_towers && imovel.number_of_towers > 1)
                         ? { icon: '🏗️', label: 'Torres',              value: String(imovel.number_of_towers) } : null,
    imovel.delivery_date ? { icon: '🗓️', label: 'Entrega prevista',   value: imovel.delivery_date          } : null,
    imovel.launch_date   ? { icon: '🚀', label: 'Lançamento',          value: imovel.launch_date            } : null,
  ].filter(Boolean) as { icon: string; label: string; value: string }[];

  if (!imovel.developer && !metaItems.length) return null;

  return (
    <div id="empreendimento" style={{ scrollMarginTop: '100px' }}>
      <SectionHeader title="Sobre o Empreendimento" />

      {/* Construtora / Incorporadora */}
      {imovel.developer && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '14px', padding: '16px', marginBottom: '16px',
        }}>
          {imovel.developer_logo && (
            <img
              src={imovel.developer_logo} alt={imovel.developer}
              style={{ height: '40px', objectFit: 'contain', flexShrink: 0 }}
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '3px' }}>
              Construtora / Incorporadora
            </p>
            <p style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text)', marginBottom: imovel.developer_website ? '4px' : 0 }}>
              {imovel.developer}
            </p>
            {imovel.developer_website && (
              <a href={imovel.developer_website} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
                🌐 Site da construtora →
              </a>
            )}
            {/* virtual_tour que não é tour 360° → mostra como link de apresentação,
                evitando expor como "Tour Virtual" (armadilha para o usuário) */}
            {imovel.virtual_tour
              && classifyTourUrl(imovel.virtual_tour) === 'site'
              && imovel.virtual_tour !== imovel.developer_website && (
              <a href={imovel.virtual_tour} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '600', textDecoration: 'none', marginLeft: imovel.developer_website ? '12px' : 0 }}>
                📋 Ver apresentação →
              </a>
            )}
          </div>
        </div>
      )}

      {/* Grid de metadados */}
      {metaItems.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '10px' }}>
          {metaItems.map(({ icon, label, value }) => (
            <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginBottom: '4px' }}>{icon} {label}</p>
              <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>{value}</p>
            </div>
          ))}
        </div>
      )}
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
// Distância em km entre dois pontos (Haversine)
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dL = (lat2 - lat1) * Math.PI / 180;
  const dG = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dL / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function SecaoRelacionados({
  neighborhood, currentId, minPrice, bedroomsMin, bedroomsMax, lat, lng,
}: {
  neighborhood: string;
  currentId: string;
  minPrice: number | null;
  bedroomsMin: number | null;
  bedroomsMax: number | null;
  lat: number | null;
  lng: number | null;
}) {
  const [relacionados, setRelacionados] = useState<RelatedImovel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!neighborhood) return;

    // Ponto de referência: coordenadas do imóvel atual ou centróide do bairro
    const originCoords = (lat && lng)
      ? { lat, lng }
      : lookupSPCoords(neighborhood, 'São Paulo');

    const params = new URLSearchParams({ all: '1' });

    // Faixa de preço ±20%
    if (minPrice) {
      params.set('min_price', String(Math.round(minPrice * 0.80)));
      params.set('max_price', String(Math.round(minPrice * 1.20)));
    }

    // Mesmos quartos — sem variação: o cliente quer 2 quartos, mostra 2 quartos
    if (bedroomsMin !== null) params.set('bedrooms_min', String(bedroomsMin));
    if (bedroomsMax !== null) params.set('bedrooms_max', String(bedroomsMax));

    fetch(`/api/orulo?${params}`)
      .then(r => r.json())
      .then((data: { buildings?: RelatedImovel[] }) => {
        const MAX_KM = 5; // raio máximo: 5km (cobre bairros vizinhos)

        const lista = (data.buildings || [])
          .filter(im => im.id !== currentId)
          .map(im => {
            // Coordenadas do imóvel candidato: usa as próprias ou centróide do bairro
            const candidateCoords = (im.lat && im.lng)
              ? { lat: im.lat, lng: im.lng }
              : lookupSPCoords(im.neighborhood, 'São Paulo');

            const distKm = (originCoords && candidateCoords)
              ? haversineKm(originCoords.lat, originCoords.lng, candidateCoords.lat, candidateCoords.lng)
              : 999;

            return { ...im, _distKm: distKm };
          })
          // Só mostra até 5km de distância
          .filter(im => im._distKm <= MAX_KM)
          // Ordena: mais próximos primeiro (mesmo bairro vem naturalmente no topo)
          .sort((a, b) => a._distKm - b._distKm)
          .slice(0, 6);

        setRelacionados(lista);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [neighborhood, currentId, minPrice, bedroomsMin, bedroomsMax, lat, lng]);

  if (loading) return null;
  if (!relacionados.length) return null;

  // Verifica se há resultados fora do bairro original (para ajustar o subtítulo)
  const temVizinhos = relacionados.some(
    im => (im.neighborhood || '').toLowerCase() !== neighborhood.toLowerCase()
  );

  return (
    <div id="relacionados" style={{ scrollMarginTop: '100px' }}>
      <SectionHeader
        title="Imóveis similares"
        subtitle={temVizinhos
          ? `Mesma faixa em ${neighborhood} e bairros próximos`
          : `Mais opções em ${neighborhood}`}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
        {relacionados.map(im => {
          const sc = getStatus(im.status || '');
          const isMesmoBairro = (im.neighborhood || '').toLowerCase() === neighborhood.toLowerCase();
          return (
            <Link key={im.id} href={`/imoveis/${im.id}`}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', textDecoration: 'none', display: 'block' }}>
              <div style={{ height: '140px', background: '#E2E8F0', position: 'relative', overflow: 'hidden' }}>
                {im.photo ? (
                  <img
                    src={im.photo} alt={im.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => {
                      e.currentTarget.style.display = 'none';
                      const p = e.currentTarget.parentElement;
                      if (p) { p.style.display = 'flex'; p.style.alignItems = 'center'; p.style.justifyContent = 'center'; p.innerHTML = '<span style="font-size:32px">🏢</span>'; }
                    }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>🏢</div>
                )}
                <div style={{ position: 'absolute', top: '10px', left: '10px', background: sc.bg, color: sc.cor, border: `1px solid ${sc.cor}33`, borderRadius: '20px', padding: '3px 10px', fontSize: '10px', fontWeight: '700' }}>
                  {sc.label}
                </div>
              </div>
              <div style={{ padding: '14px' }}>
                <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text)', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{im.name}</p>
                {im.developer && (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {im.developer}
                  </p>
                )}
                <p style={{ fontSize: '10px', color: !isMesmoBairro ? 'var(--primary)' : 'var(--text-faint)', fontWeight: !isMesmoBairro ? '600' : '400', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  📍 {[im.neighborhood, im.street || im.address_full].filter(Boolean).join(' · ')}
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {im.bedrooms_min !== null && (
                    <SpecChip icon="🛏" label={`${im.bedrooms_min}${im.bedrooms_min !== im.bedrooms_max && im.bedrooms_max ? `–${im.bedrooms_max}` : ''} qts`} />
                  )}
                  {im.area_min !== null && <SpecChip icon="▦" label={`${im.area_min}m²`} />}
                </div>
                {im.min_price && (
                  <p style={{ fontSize: '14px', fontWeight: '900', color: 'var(--primary)' }}>
                    {formatBRL(im.min_price)}
                    {im.max_price && im.max_price !== im.min_price && (
                      <span style={{ fontWeight: '400', color: 'var(--text-faint)', fontSize: '11px' }}> – {formatBRL(im.max_price)}</span>
                    )}
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
// Client Component
// ─────────────────────────────────────────────────────────────────────────────
export default function ImovelDetailClient({ id }: { id: string }) {
  const [imovel, setImovel] = useState<ImovelDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [copied, setCopied] = useState(false);
  const [bpLightbox, setBpLightbox] = useState<Blueprint | null>(null);
  const [bpImgError, setBpImgError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/orulo/${id}`);
        if (!res.ok) throw new Error('Não encontrado');
        const data: ImovelDetalhe = await res.json();
        setImovel(data);
        // Salva contexto completo para João consultor
        try {
          const ctx = {
            id: data.id,
            name: data.name,
            developer: data.developer,
            minPrice: data.min_price,
            maxPrice: data.max_price,
            status: data.status,
            neighborhood: data.neighborhood,
            city: data.city,
            deliveryDate: data.delivery_date,
            bedroomsMin: data.bedrooms_min,
            bedroomsMax: data.bedrooms_max,
            areaMin: data.area_min,
            areaMax: data.area_max,
            description: data.description?.slice(0, 400) || '',
            amenities: (data.amenities || []).slice(0, 15),
            typologies: (data.typologies || []).slice(0, 5).map((t) => ({
              type: t.type, bedrooms: t.bedrooms, area: t.area, price: t.price, vagas: t.vagas,
            })),
            totalUnits: data.total_units,
            stock: data.stock,
            numberOfFloors: data.number_of_floors,
          };
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
  // Chips de resumo rápido no header — apenas specs da unidade
  const specs = [
    faixaRange(imovel.area_min, imovel.area_max, 'm²')             && { icon: '▦',  label: faixaRange(imovel.area_min, imovel.area_max, 'm²')! },
    faixaRange(imovel.bedrooms_min, imovel.bedrooms_max, 'quartos') && { icon: '🛏', label: faixaRange(imovel.bedrooms_min, imovel.bedrooms_max, 'quartos')! },
    faixaRange(imovel.bathrooms_min, imovel.bathrooms_max, 'ban.')  && { icon: '🚿', label: faixaRange(imovel.bathrooms_min, imovel.bathrooms_max, 'ban.')! },
    faixaRange(imovel.vagas_min, imovel.vagas_max, 'vagas')         && { icon: '🚗', label: faixaRange(imovel.vagas_min, imovel.vagas_max, 'vagas')! },
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
      <StickyNav
        hasTypologies={imovel.typologies.length > 0}
        hasAmenities={imovel.amenities.length > 0}
        hasCaracteristicas={!!(imovel.area_min || imovel.bedrooms_min !== null || imovel.bathrooms_min !== null || imovel.vagas_min !== null)}
      />

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
              {/* Blueprints */}
              {imovel.blueprints.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '10px' }}>Plantas disponíveis</p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {imovel.blueprints.map((bp, i) => (
                      <button key={i}
                        onClick={() => { setBpImgError(false); setBpLightbox(bp); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                        📐 {bp.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Tour Virtual — só exibe se for plataforma de tour reconhecida */}
              {imovel.virtual_tour && classifyTourUrl(imovel.virtual_tour) === 'tour' && (
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

            <SecaoCaracteristicas imovel={imovel} />
            <SecaoTipologias typologies={imovel.typologies} />
            <SecaoDiferenciais amenities={imovel.amenities} />
            <SecaoEmpreendimento imovel={imovel} />
            <SecaoLocalizacao imovel={imovel} />
            <SecaoRelacionados
              neighborhood={imovel.neighborhood}
              currentId={imovel.id}
              minPrice={imovel.min_price}
              bedroomsMin={imovel.bedrooms_min}
              bedroomsMax={imovel.bedrooms_max}
              lat={imovel.latitude}
              lng={imovel.longitude}
            />
          </div>

          {/* ── RIGHT: sticky financial card ──────────────────────────── */}
          <div className="financeiro-desktop" style={{ position: 'sticky', top: 'calc(var(--header-h) + 52px + 24px)', maxHeight: 'calc(100vh - var(--header-h) - 100px)', overflowY: 'auto' }}>
            <BlocoFinanceiro imovel={imovel} />
          </div>
        </div>
      </div>

      {/* ── Blueprint lightbox ─────────────────────────────────────────── */}
      {bpLightbox && (
        <div onClick={() => setBpLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 1200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.6)' }}>
            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>📐 {bpLightbox.name}</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {!bpImgError && (
                  <a href={bpLightbox.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary)', textDecoration: 'none', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '5px 12px' }}>
                    ↗ Abrir em nova aba
                  </a>
                )}
                <button onClick={() => setBpLightbox(null)}
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '16px', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            </div>
            {/* Image area */}
            <div style={{ overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', minHeight: '200px' }}>
              {bpImgError ? (
                <div style={{ padding: '48px 32px', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📐</div>
                  <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '8px' }}>Planta não disponível</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>A imagem desta planta não está acessível no momento.</p>
                  <a href={bpLightbox.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '600' }}>
                    Tentar abrir diretamente →
                  </a>
                </div>
              ) : (
                <img
                  src={bpLightbox.url}
                  alt={bpLightbox.name}
                  onError={() => setBpImgError(true)}
                  style={{ maxWidth: '85vw', maxHeight: '75vh', objectFit: 'contain', display: 'block' }}
                />
              )}
            </div>
          </div>
        </div>
      )}

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
