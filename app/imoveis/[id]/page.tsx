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
interface ImovelDetalhe {
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
  address_full: string;
  status: string;
  description: string;
  photos: string[];
  amenities: string[];
  typologies: { type: string; area: string; price: string }[];
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
  'na planta':  { cor: '#2563eb', bg: 'rgba(37,99,235,.12)',  label: 'Na Planta' },
  'lançamento': { cor: '#7c3aed', bg: 'rgba(124,58,237,.12)', label: 'Lançamento' },
  'em obras':   { cor: '#d97706', bg: 'rgba(217,119,6,.12)',   label: 'Em Obras' },
  'pronto':     { cor: '#16a34a', bg: 'rgba(22,163,74,.12)',   label: 'Pronto' },
};
function getStatus(s: string) {
  return STATUS_CFG[s.toLowerCase()] ?? { cor: '#64748b', bg: 'rgba(100,116,139,.12)', label: s };
}

// ──────────────────────────────────────────────────────────────────────────────
// Simulador embutido (pré-preenchido com valor do imóvel)
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
        {/* Valor do imóvel (fixo) */}
        <div>
          <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
            Valor do imóvel
          </p>
          <div style={{
            padding: '11px 14px', border: '1.5px solid var(--border)',
            borderRadius: '10px', fontSize: '15px', fontWeight: '700',
            color: 'var(--text)', background: 'var(--bg)',
          }}>
            {formatBRL(valorImovel)}
          </div>
        </div>

        {/* Renda + Entrada lado a lado */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
              Renda familiar bruta
            </p>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', fontSize: '13px', fontWeight: '600' }}>R$</span>
              <input
                type="text" inputMode="numeric"
                value={renda}
                onChange={e => { setRenda(fmtInput(e.target.value)); setErro(''); }}
                placeholder="3.000"
                style={{
                  width: '100%', padding: '11px 12px 11px 34px',
                  border: '1.5px solid var(--border)', borderRadius: '10px',
                  fontSize: '14px', fontWeight: '600', outline: 'none',
                  background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
              Entrada disponível
            </p>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', fontSize: '13px', fontWeight: '600' }}>R$</span>
              <input
                type="text" inputMode="numeric"
                value={entrada}
                onChange={e => setEntrada(fmtInput(e.target.value))}
                placeholder="20% do valor"
                style={{
                  width: '100%', padding: '11px 12px 11px 34px',
                  border: '1.5px solid var(--border)', borderRadius: '10px',
                  fontSize: '14px', fontWeight: '600', outline: 'none',
                  background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </div>

        {/* Prazo */}
        <div>
          <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
            Prazo
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['20','25','30','35'].map(v => (
              <button
                key={v}
                onClick={() => setPrazo(v)}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: '10px',
                  fontSize: '13px', fontWeight: prazo === v ? '800' : '500',
                  border: `2px solid ${prazo === v ? 'var(--primary)' : 'var(--border)'}`,
                  background: prazo === v ? 'var(--primary-light)' : 'var(--bg)',
                  color: prazo === v ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {v} anos
              </button>
            ))}
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <p style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: '8px' }}>
            ⚠️ {erro}
          </p>
        )}

        {/* Calcular */}
        <button
          onClick={calcular}
          style={{
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            color: '#fff', border: 'none', borderRadius: '12px',
            padding: '13px', fontSize: '14px', fontWeight: '800',
            cursor: 'pointer', width: '100%',
            boxShadow: '0 4px 16px rgba(37,99,235,.3)',
            transition: 'opacity 0.15s',
          }}
        >
          Calcular parcelas →
        </button>

        {/* Resultado */}
        {resultado && (
          <div style={{
            background: alerta ? 'rgba(239,68,68,.06)' : 'rgba(22,163,74,.06)',
            border: `1px solid ${alerta ? 'rgba(239,68,68,.25)' : 'rgba(22,163,74,.25)'}`,
            borderRadius: '12px', padding: '16px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>1ª Parcela</p>
                <p style={{ fontSize: '22px', fontWeight: '900', color: alerta ? '#dc2626' : 'var(--primary)' }}>
                  {formatBRL(parcela)}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Compromete</p>
                <p style={{ fontSize: '22px', fontWeight: '900', color: alerta ? '#dc2626' : '#16a34a' }}>
                  {comprometimento}%
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <span>📋 {resultado.modalidade}</span>
              <span>·</span>
              <span>🏦 {resultado.taxaAnual.toFixed(2)}% a.a. + TR</span>
              <span>·</span>
              <span>💰 Financia {formatBRL(resultado.valorFinanciado)}</span>
            </div>
            {alerta && (
              <p style={{ fontSize: '11px', color: '#dc2626', textAlign: 'center', marginTop: '10px' }}>
                ⚠️ Comprometimento acima de 30% — o banco pode exigir codevedor ou entrada maior.
              </p>
            )}
            <Link
              href={`/simulador?valorImovel=${resultado.valorImovel}&entrada=${parseMoeda(entrada)}&renda=${parseMoeda(renda)}&prazo=${prazo}`}
              style={{
                display: 'block', textAlign: 'center', marginTop: '12px',
                fontSize: '12px', fontWeight: '700', color: 'var(--primary)',
                textDecoration: 'none',
              }}
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
// Gallery
// ──────────────────────────────────────────────────────────────────────────────
function Gallery({ photos, name }: { photos: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [imgErr, setImgErr] = useState<Record<number, boolean>>({});

  if (!photos.length) {
    return (
      <div style={{
        height: '380px', borderRadius: '16px',
        background: 'linear-gradient(145deg, #1e3a5f 0%, #0f2744 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '12px',
      }}>
        <span style={{ fontSize: '56px' }}>🏙️</span>
        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,.4)' }}>Sem fotos disponíveis</span>
      </div>
    );
  }

  return (
    <div>
      {/* Foto principal */}
      <div style={{ height: '380px', borderRadius: '16px', overflow: 'hidden', position: 'relative', background: '#0f172a' }}>
        {!imgErr[active] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photos[active]}
            alt={`${name} - foto ${active + 1}`}
            onError={() => setImgErr(p => ({ ...p, [active]: true }))}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(145deg, #1e3a5f, #0f2744)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '48px' }}>🏙️</span>
          </div>
        )}
        {/* Contador */}
        {photos.length > 1 && (
          <span style={{
            position: 'absolute', bottom: '12px', right: '12px',
            background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(6px)',
            color: '#fff', fontSize: '11px', fontWeight: '700',
            padding: '4px 10px', borderRadius: '99px',
          }}>
            {active + 1} / {photos.length}
          </span>
        )}
        {/* Nav arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={() => setActive(p => Math.max(0, p - 1))}
              disabled={active === 0}
              style={{
                position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,.45)', border: 'none', borderRadius: '50%',
                width: '36px', height: '36px', color: '#fff', fontSize: '16px',
                cursor: active === 0 ? 'default' : 'pointer',
                opacity: active === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >‹</button>
            <button
              onClick={() => setActive(p => Math.min(photos.length - 1, p + 1))}
              disabled={active === photos.length - 1}
              style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,.45)', border: 'none', borderRadius: '50%',
                width: '36px', height: '36px', color: '#fff', fontSize: '16px',
                cursor: active === photos.length - 1 ? 'default' : 'pointer',
                opacity: active === photos.length - 1 ? 0.3 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >›</button>
          </>
        )}
      </div>

      {/* Miniaturas */}
      {photos.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          {photos.map((p, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                flexShrink: 0, width: '72px', height: '50px',
                borderRadius: '8px', overflow: 'hidden',
                border: `2px solid ${i === active ? 'var(--primary)' : 'transparent'}`,
                padding: 0, cursor: 'pointer', background: '#0f172a',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
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
  const link = imovel.sharing_url || '#';
  const waMsg = encodeURIComponent(
    `Olá! Vi o imóvel *${imovel.name}* no FinancieCerto e gostaria de mais informações.${link !== '#' ? ' Link: ' + link : ''}`
  );

  const specs = [
    faixa(imovel.area_min, imovel.area_max, 'm²')         && { icon: '▦',  label: faixa(imovel.area_min, imovel.area_max, 'm²')! },
    faixa(imovel.bedrooms_min, imovel.bedrooms_max, 'qts') && { icon: '🛏', label: faixa(imovel.bedrooms_min, imovel.bedrooms_max, 'qts')! },
    faixa(imovel.bathrooms_min, imovel.bathrooms_max, 'ban.') && { icon: '🚿', label: faixa(imovel.bathrooms_min, imovel.bathrooms_max, 'ban.')! },
    faixa(imovel.vagas_min, imovel.vagas_max, 'vagas')    && { icon: '🚗', label: faixa(imovel.vagas_min, imovel.vagas_max, 'vagas')! },
  ].filter(Boolean) as { icon: string; label: string }[];

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* Breadcrumb */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 24px 0', fontSize: '12px', color: 'var(--text-faint)' }}>
        <Link href="/imoveis" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}>
          ← Imóveis
        </Link>
        <span style={{ margin: '0 8px' }}>·</span>
        <span>{imovel.name}</span>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 24px 80px' }}>

        {/* ── Layout 2 colunas em desktop ───────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: '32px',
          alignItems: 'start',
        }}>
          {/* ── Coluna esquerda ─────────────────────────────────────────────── */}
          <div>
            {/* Gallery */}
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
                  <span style={{
                    background: statusCfg.bg, border: `1px solid ${statusCfg.cor}50`,
                    color: statusCfg.cor, fontSize: '10px', fontWeight: '800',
                    padding: '3px 10px', borderRadius: '99px',
                    textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap',
                  }}>
                    {statusCfg.label}
                  </span>
                )}
              </div>
              {(imovel.neighborhood || imovel.city) && (
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  📍 {[imovel.neighborhood, imovel.city, imovel.state].filter(Boolean).join(', ')}
                </p>
              )}
              {imovel.address_full && (
                <p style={{ fontSize: '12px', color: 'var(--text-faint)' }}>{imovel.address_full}</p>
              )}
            </div>

            {/* Specs */}
            {specs.length > 0 && (
              <div style={{
                display: 'flex', gap: '20px', flexWrap: 'wrap',
                padding: '18px 0', margin: '20px 0',
                borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
              }}>
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
                <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', marginBottom: '10px' }}>
                  Sobre o empreendimento
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.75 }}>
                  {imovel.description}
                </p>
              </div>
            )}

            {/* Amenidades */}
            {imovel.amenities.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', marginBottom: '14px' }}>
                  Área de lazer e diferenciais
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px' }}>
                  {imovel.amenities.map((a, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 10px',
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: '9px', fontSize: '13px', color: 'var(--text-muted)',
                      fontWeight: '600',
                    }}>
                      <span style={{ color: 'var(--primary)', fontSize: '14px' }}>✓</span> {a}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quadro de tipologias */}
            {imovel.typologies.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', marginBottom: '14px' }}>
                  Tipologias disponíveis
                </h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        {['Tipo', 'Área', 'Preço'].map(h => (
                          <th key={h} style={{
                            textAlign: 'left', padding: '10px 14px',
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)',
                            textTransform: 'uppercase', letterSpacing: '0.6px',
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {imovel.typologies.map((t, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-card)' }}>
                          <td style={{ padding: '10px 14px', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: '600' }}>{t.type}</td>
                          <td style={{ padding: '10px 14px', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>{t.area}</td>
                          <td style={{ padding: '10px 14px', border: '1px solid var(--border)', color: 'var(--primary)', fontWeight: '700' }}>{t.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ── Coluna direita: preço + CTAs + simulador ─────────────────────── */}
          <div style={{ position: 'sticky', top: '80px' }}>
            {/* Card de preço */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '16px', padding: '24px',
            }}>
              <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginBottom: '4px' }}>
                A partir de
              </p>
              <p style={{
                fontSize: '28px', fontWeight: '900', color: 'var(--text)',
                fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: '4px',
              }}>
                {imovel.min_price ? formatBRL(imovel.min_price) : 'Consultar'}
              </p>
              {imovel.max_price && imovel.max_price !== imovel.min_price && (
                <p style={{ fontSize: '13px', color: 'var(--text-faint)', marginBottom: '16px' }}>
                  até {formatBRL(imovel.max_price)}
                </p>
              )}

              {/* CTAs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                <a
                  href={`https://wa.me/5511933661403?text=${waMsg}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: '#25D366', color: '#fff',
                    textDecoration: 'none', fontSize: '14px', fontWeight: '800',
                    padding: '13px', borderRadius: '12px',
                    boxShadow: '0 4px 16px rgba(37,211,102,.3)',
                  }}
                >
                  💬 Falar com corretor
                </a>
                {link !== '#' && (
                  <a
                    href={link}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      border: '1.5px solid var(--border)', color: 'var(--text-muted)',
                      textDecoration: 'none', fontSize: '13px', fontWeight: '600',
                      padding: '11px', borderRadius: '12px',
                      background: 'var(--bg)',
                    }}
                  >
                    Ver no site da incorporadora ↗
                  </a>
                )}
              </div>
            </div>

            {/* Simulador embutido */}
            {imovel.min_price && (
              <SimuladorEmbutido valorImovel={imovel.min_price} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
