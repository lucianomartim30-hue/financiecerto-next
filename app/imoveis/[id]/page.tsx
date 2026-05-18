'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { formatBRL, simular } from '@/lib/calculos';

function parseMoeda(v: string): number {
  return Number(v.replace(/\./g, '').replace(',', '.')) || 0;
}

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
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
  photo: string | null;
  blueprint: string | null;
}

interface Blueprint {
  name: string;
  url: string;
}

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
  description: string;
  photos: string[];
  blueprints: Blueprint[];
  amenities: string[];
  typologies: Tipologia[];
  sharing_url: string | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function fmtInput(raw: string) {
  const d = raw.replace(/\D/g, '');
  return d ? Number(d).toLocaleString('pt-BR') : '';
}

function faixa(min: number | null, max: number | null, unit: string) {
  if (!min) return null;
  if (max && max !== min) return `${min}–${max} ${unit}`;
  return `${min} ${unit}`;
}

const STATUS_CFG: Record<string, { cor: string; bg: string; label: string }> = {
  'na planta':      { cor: '#2563eb', bg: 'rgba(37,99,235,.15)',  label: 'Na Planta' },
  'planta':         { cor: '#2563eb', bg: 'rgba(37,99,235,.15)',  label: 'Na Planta' },
  'pre-lançamento': { cor: '#2563eb', bg: 'rgba(37,99,235,.15)',  label: 'Pré-Lançamento' },
  'pre lançamento': { cor: '#2563eb', bg: 'rgba(37,99,235,.15)',  label: 'Pré-Lançamento' },
  'lançamento':     { cor: '#7c3aed', bg: 'rgba(124,58,237,.15)', label: 'Lançamento' },
  'lancamento':     { cor: '#7c3aed', bg: 'rgba(124,58,237,.15)', label: 'Lançamento' },
  'em obras':       { cor: '#d97706', bg: 'rgba(217,119,6,.15)',  label: 'Em Obras' },
  'em construção':  { cor: '#d97706', bg: 'rgba(217,119,6,.15)',  label: 'Em Construção' },
  'em construcao':  { cor: '#d97706', bg: 'rgba(217,119,6,.15)',  label: 'Em Construção' },
  'construção':     { cor: '#d97706', bg: 'rgba(217,119,6,.15)',  label: 'Em Construção' },
  'em andamento':   { cor: '#d97706', bg: 'rgba(217,119,6,.15)',  label: 'Em Andamento' },
  'pronto':         { cor: '#16a34a', bg: 'rgba(22,163,74,.15)',  label: 'Pronto' },
  'pronto novo':    { cor: '#16a34a', bg: 'rgba(22,163,74,.15)',  label: 'Pronto Novo' },
  'entregue':       { cor: '#16a34a', bg: 'rgba(22,163,74,.15)',  label: 'Entregue' },
  'concluído':      { cor: '#16a34a', bg: 'rgba(22,163,74,.15)',  label: 'Concluído' },
  'concluido':      { cor: '#16a34a', bg: 'rgba(22,163,74,.15)',  label: 'Concluído' },
};
function getStatus(s: string) {
  const key = s.toLowerCase().trim();
  if (STATUS_CFG[key]) return STATUS_CFG[key];
  if (key.includes('planta'))    return STATUS_CFG['na planta'];
  if (key.includes('lança'))     return STATUS_CFG['lançamento'];
  if (key.includes('constru') || key.includes('obra') || key.includes('andamento'))
                                 return STATUS_CFG['em obras'];
  if (key.includes('pronto') || key.includes('entreg') || key.includes('conclui'))
                                 return STATUS_CFG['pronto'];
  return { cor: '#475569', bg: 'rgba(71,85,105,.18)', label: s };
}

// ──────────────────────────────────────────────────────────────────────────────
// Simulador embutido
// ──────────────────────────────────────────────────────────────────────────────
function SimuladorEmbutido({ valorImovel }: { valorImovel: number }) {
  const [renda, setRenda] = useState('');
  const [entrada, setEntrada] = useState(
    valorImovel ? fmtInput(String(Math.round(valorImovel * 0.2))) : ''
  );
  const [prazo, setPrazo] = useState('30');
  const [resultado, setResultado] = useState<ReturnType<typeof simular> | null>(null);
  const [erro, setErro] = useState('');

  function calcular() {
    const r = parseMoeda(renda);
    const e = parseMoeda(entrada);
    if (!r || r < 800) { setErro('Informe uma renda mensal válida.'); return; }
    if (!valorImovel) { setErro('Valor do imóvel não disponível.'); return; }
    if (e >= valorImovel) { setErro('A entrada não pode ser maior que o valor do imóvel.'); return; }
    setErro('');
    const res = simular({
      rendaBruta: r, entrada: e, fgts: 0,
      valorImovel, prazoAnos: parseInt(prazo),
      naPlanta: false, prazoObraAnos: 0,
    });
    setResultado(res);
  }

  const parcela = resultado?.parcelaPrimeiro ?? 0;
  const comprometimento = resultado ? Math.round((parcela / parseMoeda(renda)) * 100) : 0;
  const alerta = comprometimento > 30;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '16px', padding: '24px', marginTop: '32px',
    }}>
      <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text)', marginBottom: '4px' }}>
        Simulador de Financiamento
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
        Calcule parcelas para este imóvel com seu perfil.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Valor do imóvel</p>
          <div style={{ padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '15px', fontWeight: '700', color: 'var(--text)', background: 'var(--bg)' }}>
            {formatBRL(valorImovel)}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { label: 'Renda familiar bruta', val: renda, set: (v: string) => { setRenda(fmtInput(v)); setErro(''); }, ph: '3.000' },
            { label: 'Entrada disponível', val: entrada, set: (v: string) => setEntrada(fmtInput(v)), ph: '20% do valor' },
          ].map(({ label, val, set, ph }) => (
            <div key={label}>
              <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>{label}</p>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', fontSize: '13px', fontWeight: '600' }}>R$</span>
                <input
                  type="text" inputMode="numeric" value={val}
                  onChange={e => set(e.target.value)} placeholder={ph}
                  style={{ width: '100%', padding: '11px 12px 11px 34px', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '14px', fontWeight: '600', outline: 'none', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          ))}
        </div>

        <div>
          <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>Prazo</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['20','25','30','35'].map(v => (
              <button key={v} onClick={() => setPrazo(v)} style={{ flex: 1, padding: '9px 0', borderRadius: '10px', fontSize: '13px', fontWeight: prazo === v ? '800' : '500', border: `2px solid ${prazo === v ? 'var(--primary)' : 'var(--border)'}`, background: prazo === v ? 'var(--primary-light)' : 'var(--bg)', color: prazo === v ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s' }}>
                {v} anos
              </button>
            ))}
          </div>
        </div>

        {erro && <p style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: '8px' }}>⚠️ {erro}</p>}

        <button onClick={calcular} style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#fff', border: 'none', borderRadius: '12px', padding: '13px', fontSize: '14px', fontWeight: '800', cursor: 'pointer', width: '100%', boxShadow: '0 4px 16px rgba(37,99,235,.3)', transition: 'opacity 0.15s' }}>
          Calcular parcelas →
        </button>

        {resultado && (
          <div style={{ background: alerta ? 'rgba(239,68,68,.06)' : 'rgba(22,163,74,.06)', border: `1px solid ${alerta ? 'rgba(239,68,68,.25)' : 'rgba(22,163,74,.25)'}`, borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>1ª Parcela</p>
                <p style={{ fontSize: '22px', fontWeight: '900', color: alerta ? '#dc2626' : 'var(--primary)' }}>{formatBRL(parcela)}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Compromete</p>
                <p style={{ fontSize: '22px', fontWeight: '900', color: alerta ? '#dc2626' : '#16a34a' }}>{comprometimento}%</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <span>📋 {resultado.modalidade}</span>
              <span>·</span>
              <span>🏦 {resultado.taxaAnual.toFixed(2)}% a.a. + TR</span>
              <span>·</span>
              <span>💰 Financia {formatBRL(resultado.valorFinanciado)}</span>
            </div>
            {alerta && <p style={{ fontSize: '11px', color: '#dc2626', textAlign: 'center', marginTop: '10px' }}>⚠️ Comprometimento acima de 30% — o banco pode exigir codevedor ou entrada maior.</p>}
            <Link
              href={`/simulador?valorImovel=${resultado.valorImovel}&entrada=${parseMoeda(entrada)}&renda=${parseMoeda(renda)}&prazo=${prazo}`}
              style={{ display: 'block', textAlign: 'center', marginTop: '12px', fontSize: '12px', fontWeight: '700', color: 'var(--primary)', textDecoration: 'none' }}
            >
              Ver simulação completa no FinancieCerto →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Gallery com lightbox
// ──────────────────────────────────────────────────────────────────────────────
function Gallery({ photos, name }: { photos: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [imgErr, setImgErr] = useState<Record<number, boolean>>({});
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowLeft') setActive(p => Math.max(0, p - 1));
      if (e.key === 'ArrowRight') setActive(p => Math.min(photos.length - 1, p + 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, photos.length]);

  if (!photos.length) {
    return (
      <div style={{ height: '380px', borderRadius: '16px', background: 'linear-gradient(145deg, #1e3a5f 0%, #0f2744 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <span style={{ fontSize: '56px' }}>🏙️</span>
        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,.4)' }}>Sem fotos disponíveis</span>
      </div>
    );
  }

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => setLightbox(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%', width: '44px', height: '44px', color: '#fff', fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <span style={{ position: 'absolute', top: '24px', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,.6)', fontSize: '13px', fontWeight: '600' }}>{active + 1} / {photos.length}</span>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[active]} alt={`${name} - foto ${active + 1}`} style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px', display: 'block' }} />
            {photos.length > 1 && (
              <>
                <button onClick={e => { e.stopPropagation(); setActive(p => Math.max(0, p - 1)); }} disabled={active === 0} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,.55)', border: 'none', borderRadius: '50%', width: '42px', height: '42px', color: '#fff', fontSize: '20px', cursor: active === 0 ? 'default' : 'pointer', opacity: active === 0 ? 0.25 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                <button onClick={e => { e.stopPropagation(); setActive(p => Math.min(photos.length - 1, p + 1)); }} disabled={active === photos.length - 1} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,.55)', border: 'none', borderRadius: '50%', width: '42px', height: '42px', color: '#fff', fontSize: '20px', cursor: active === photos.length - 1 ? 'default' : 'pointer', opacity: active === photos.length - 1 ? 0.25 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
              </>
            )}
          </div>
          {photos.length > 1 && (
            <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', overflowX: 'auto', maxWidth: '90vw', paddingBottom: '4px' }}>
              {photos.map((p, i) => (
                <button key={i} onClick={() => setActive(i)} style={{ flexShrink: 0, width: '60px', height: '42px', borderRadius: '6px', overflow: 'hidden', border: `2px solid ${i === active ? '#fff' : 'transparent'}`, padding: 0, cursor: 'pointer', background: '#1e293b', opacity: i === active ? 1 : 0.55, transition: 'all 0.15s' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Foto principal */}
      <div onClick={() => setLightbox(true)} style={{ height: '380px', borderRadius: '16px', overflow: 'hidden', position: 'relative', background: '#0f172a', cursor: 'zoom-in' }}>
        {!imgErr[active] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photos[active]} alt={`${name} - foto ${active + 1}`} onError={() => setImgErr(p => ({ ...p, [active]: true }))} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #1e3a5f, #0f2744)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '48px' }}>🏙️</span>
          </div>
        )}
        <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '99px' }}>
          ⛶ Ver todas as fotos
        </span>
        {photos.length > 1 && (
          <span style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(6px)', color: '#fff', fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '99px' }}>
            {active + 1} / {photos.length}
          </span>
        )}
        {photos.length > 1 && (
          <>
            <button onClick={e => { e.stopPropagation(); setActive(p => Math.max(0, p - 1)); }} disabled={active === 0} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,.45)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '16px', cursor: active === 0 ? 'default' : 'pointer', opacity: active === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <button onClick={e => { e.stopPropagation(); setActive(p => Math.min(photos.length - 1, p + 1)); }} disabled={active === photos.length - 1} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,.45)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '16px', cursor: active === photos.length - 1 ? 'default' : 'pointer', opacity: active === photos.length - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          </>
        )}
      </div>

      {/* Miniaturas */}
      {photos.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          {photos.map((p, i) => (
            <button key={i} onClick={() => setActive(i)} style={{ flexShrink: 0, width: '72px', height: '50px', borderRadius: '8px', overflow: 'hidden', border: `2px solid ${i === active ? 'var(--primary)' : 'transparent'}`, padding: 0, cursor: 'pointer', background: '#0f172a' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Section Title
// ──────────────────────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', marginBottom: '14px' }}>
      {children}
    </h2>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────
export default function ImovelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [imovel, setImovel] = useState<ImovelDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/orulo/${id}`);
        if (!res.ok) throw new Error('Não encontrado');
        setImovel(await res.json());
      } catch {
        setErro('Imóvel não encontrado ou indisponível.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return (
    <div style={{ padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
      <p style={{ color: 'var(--text-muted)' }}>Carregando imóvel...</p>
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
  const waMsg = encodeURIComponent(
    `Olá! Vi o imóvel *${imovel.name}* no FinancieCerto e gostaria de mais informações.${imovel.sharing_url ? ' Link: ' + imovel.sharing_url : ''}`
  );

  const specs = [
    faixa(imovel.area_min, imovel.area_max, 'm²')             && { icon: '▦',  label: faixa(imovel.area_min, imovel.area_max, 'm²')! },
    faixa(imovel.bedrooms_min, imovel.bedrooms_max, 'quartos') && { icon: '🛏', label: faixa(imovel.bedrooms_min, imovel.bedrooms_max, 'quartos')! },
    faixa(imovel.bathrooms_min, imovel.bathrooms_max, 'ban.')  && { icon: '🚿', label: faixa(imovel.bathrooms_min, imovel.bathrooms_max, 'ban.')! },
    faixa(imovel.vagas_min, imovel.vagas_max, 'vagas')         && { icon: '🚗', label: faixa(imovel.vagas_min, imovel.vagas_max, 'vagas')! },
  ].filter(Boolean) as { icon: string; label: string }[];

  // Colunas da tabela de tipologias
  const hasPrivate = imovel.typologies.some(t => t.private_area);
  const hasTotal   = imovel.typologies.some(t => t.total_area);
  const hasVagas   = imovel.typologies.some(t => t.vagas !== null);
  const hasSuites  = imovel.typologies.some(t => t.suites !== null);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* Breadcrumb */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 24px 0', fontSize: '12px', color: 'var(--text-faint)' }}>
        <Link href="/imoveis" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>← Imóveis</Link>
        <span style={{ margin: '0 8px' }}>·</span>
        <span>{imovel.name}</span>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '32px', alignItems: 'start' }}>

          {/* ── Coluna esquerda ─────────────────────────────────────────────── */}
          <div>
            <Gallery photos={imovel.photos} name={imovel.name} />

            {/* Título + status */}
            <div style={{ marginTop: '24px' }}>
              {imovel.developer && (
                <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }}>
                  {imovel.developer}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <h1 style={{ fontSize: 'clamp(22px, 3vw, 28px)', fontWeight: '900', color: 'var(--text)', lineHeight: 1.2 }}>
                  {imovel.name}
                </h1>
                {imovel.status && (
                  <span style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.cor}50`, color: statusCfg.cor, fontSize: '10px', fontWeight: '800', padding: '3px 10px', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                    {statusCfg.label}
                  </span>
                )}
                {imovel.delivery_date && (
                  <span style={{ background: 'rgba(100,116,139,.1)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '99px' }}>
                    📅 Entrega: {imovel.delivery_date}
                  </span>
                )}
              </div>
              {(imovel.neighborhood || imovel.city) && (
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  📍 {[imovel.neighborhood, imovel.city, imovel.state].filter(Boolean).join(', ')}
                </p>
              )}
              {imovel.address_full && (
                <p style={{ fontSize: '12px', color: 'var(--text-faint)' }}>{imovel.address_full}{imovel.zipcode ? ` — CEP ${imovel.zipcode}` : ''}</p>
              )}
            </div>

            {/* Specs */}
            {specs.length > 0 && (
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', padding: '18px 0', margin: '20px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                {specs.map(({ icon, label }, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '20px' }}>{icon}</span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>{label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Descrição */}
            {imovel.description && (
              <div style={{ marginBottom: '28px' }}>
                <SectionTitle>Sobre o empreendimento</SectionTitle>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.75 }}>{imovel.description}</p>
              </div>
            )}

            {/* Amenidades */}
            {imovel.amenities.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <SectionTitle>Área de lazer e diferenciais</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
                  {imovel.amenities.map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '9px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                      <span style={{ color: 'var(--primary)', fontSize: '14px' }}>✓</span> {a}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quadro de tipologias */}
            {imovel.typologies.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <SectionTitle>Quadro de áreas e tipologias</SectionTitle>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        {[
                          'Tipo',
                          imovel.typologies.some(t