'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Building {
  id: string; name: string; developer: string; description: string;
  min_price: number | null; max_price: number | null;
  bedrooms_min: number | null; bedrooms_max: number | null;
  area_min: number | null; area_max: number | null;
  bathrooms_min: number | null; bathrooms_max: number | null;
  vagas_min: number | null; vagas_max: number | null;
  neighborhood: string; city: string; state: string;
  street: string; number: string; address_full: string;
  status: string; sharing_url: string | null;
  images: string[];
  total_units: number | null; floors: number | null; delivery_date: string | null;
}

const STATUS_CFG: Record<string, { cor: string; bg: string; label: string }> = {
  'na planta':  { cor: '#2563eb', bg: 'rgba(37,99,235,.15)', label: 'Na Planta' },
  'lançamento': { cor: '#7c3aed', bg: 'rgba(124,58,237,.15)', label: 'Lançamento' },
  'em obras':   { cor: '#d97706', bg: 'rgba(217,119,6,.15)', label: 'Em Obras' },
  'pronto':     { cor: '#16a34a', bg: 'rgba(22,163,74,.15)', label: 'Pronto' },
  'entregue':   { cor: '#16a34a', bg: 'rgba(22,163,74,.15)', label: 'Entregue' },
};

function getStatusCfg(status: string) {
  const k = (status || '').toLowerCase().trim();
  if (STATUS_CFG[k]) return STATUS_CFG[k];
  if (k.includes('planta')) return STATUS_CFG['na planta'];
  if (k.includes('lança')) return STATUS_CFG['lançamento'];
  if (k.includes('constru') || k.includes('obra')) return STATUS_CFG['em obras'];
  if (k.includes('pronto') || k.includes('entreg')) return STATUS_CFG['pronto'];
  return { cor: '#475569', bg: 'rgba(71,85,105,.18)', label: status };
}

function fmtBRL(v: number | null) {
  if (!v) return 'Sob consulta';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function faixa(min: number | null, max: number | null, unit: string) {
  if (!min) return null;
  if (max && max !== min) return `${min}–${max} ${unit}`;
  return `${min} ${unit}`;
}

export default function ImovelPage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params.id as string;

  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [imgIdx, setImgIdx]     = useState(0);
  const [imgErr, setImgErr]     = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/orulo/building/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setBuilding(d.building);
      })
      .catch(() => setError('Erro ao carregar imóvel.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Carregando imóvel...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !building) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontSize: '48px' }}>🏚️</p>
      <p style={{ color: 'var(--text-muted)' }}>Imóvel não encontrado.</p>
      <button onClick={() => router.back()} style={{ padding: '10px 24px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
        ← Voltar
      </button>
    </div>
  );

  const statusCfg = getStatusCfg(building.status);
  const imgs = building.images.length > 0 ? building.images : [];
  const hasGallery = imgs.length > 1;

  const specs = [
    faixa(building.area_min, building.area_max, 'm²') && { icon: '▦', label: faixa(building.area_min, building.area_max, 'm²')! },
    faixa(building.bedrooms_min, building.bedrooms_max, building.bedrooms_min === 1 ? 'quarto' : 'quartos') && { icon: '🛏', label: faixa(building.bedrooms_min, building.bedrooms_max, building.bedrooms_min === 1 ? 'quarto' : 'quartos')! },
    faixa(building.bathrooms_min, building.bathrooms_max, 'ban.') && { icon: '🚿', label: faixa(building.bathrooms_min, building.bathrooms_max, 'ban.')! },
    faixa(building.vagas_min, building.vagas_max, building.vagas_min === 1 ? 'vaga' : 'vagas') && { icon: '🚗', label: faixa(building.vagas_min, building.vagas_max, building.vagas_min === 1 ? 'vaga' : 'vagas')! },
    building.total_units && { icon: '🏢', label: `${building.total_units} unidades` },
    building.floors && { icon: '⬆️', label: `${building.floors} andares` },
  ].filter(Boolean) as { icon: string; label: string }[];

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingTop: 'var(--header-h)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-faint)', marginBottom: '24px', flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--text-faint)', textDecoration: 'none' }}>Início</Link>
          <span>›</span>
          <Link href="/imoveis" style={{ color: 'var(--text-faint)', textDecoration: 'none' }}>Imóveis</Link>
          <span>›</span>
          <span style={{ color: 'var(--text-muted)' }}>{building.name}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: '32px', alignItems: 'start' }}>

          {/* Coluna esquerda */}
          <div>
            {/* Galeria */}
            <div style={{ borderRadius: '16px', overflow: 'hidden', background: '#0f2744', position: 'relative', marginBottom: '24px' }}>
              {imgs.length > 0 && !imgErr[imgIdx] ? (
                <img
                  src={imgs[imgIdx]}
                  alt={building.name}
                  onError={() => setImgErr(prev => ({ ...prev, [imgIdx]: true }))}
                  style={{ width: '100%', height: '420px', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', height: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '64px' }}>🏙️</span>
                </div>
              )}

              {/* Status badge */}
              {building.status && (
                <div style={{ position: 'absolute', top: '16px', left: '16px', background: statusCfg.bg, backdropFilter: 'blur(8px)', border: `1px solid ${statusCfg.cor}50`, color: statusCfg.cor, fontSize: '11px', fontWeight: '800', padding: '5px 12px', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  {statusCfg.label}
                </div>
              )}

              {/* Navegação da galeria */}
              {hasGallery && (
                <>
                  <button onClick={() => setImgIdx(i => (i - 1 + imgs.length) % imgs.length)}
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,.55)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ‹
                  </button>
                  <button onClick={() => setImgIdx(i => (i + 1) % imgs.length)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,.55)', border: 'none', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ›
                  </button>
                  <div style={{ position: 'absolute', bottom: '12px', right: '16px', background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '99px' }}>
                    {imgIdx + 1} / {imgs.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {hasGallery && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
                {imgs.slice(0, 8).map((url, i) => (
                  <div key={i} onClick={() => setImgIdx(i)}
                    style={{ width: '72px', height: '52px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: `2px solid ${imgIdx === i ? 'var(--primary)' : 'transparent'}`, flexShrink: 0 }}>
                    {!imgErr[i] ? (
                      <img src={url} alt="" onError={() => setImgErr(prev => ({ ...prev, [i]: true }))}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🏙️</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Descrição */}
            {building.description && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '12px', color: 'var(--text)' }}>Sobre o empreendimento</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.75', margin: 0, whiteSpace: 'pre-line' }}>{building.description}</p>
              </div>
            )}

            {/* Características */}
            {specs.length > 0 && (
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px', color: 'var(--text)' }}>Características</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                  {specs.map(({ icon, label }, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '18px' }}>{icon}</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Coluna direita — Card fixo */}
          <div style={{ position: 'sticky', top: 'calc(var(--header-h) + 24px)' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
              {building.developer && (
                <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>{building.developer}</p>
              )}
              <h1 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text)', lineHeight: 1.2, marginBottom: '8px' }}>{building.name}</h1>

              {(building.neighborhood || building.city) && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  📍 {[building.neighborhood, building.city, building.state].filter(Boolean).join(', ')}
                </p>
              )}

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-faint)', marginBottom: '4px' }}>Preço a partir de</p>
                <p style={{ fontSize: '24px', fontWeight: '900', color: 'var(--primary)', letterSpacing: '-0.5px' }}>{fmtBRL(building.min_price)}</p>
                {building.max_price && building.max_price !== building.min_price && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>até {fmtBRL(building.max_price)}</p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Link
                  href={`/simulador?preco_imovel=${building.min_price || ''}&nome_imovel=${encodeURIComponent(building.name)}`}
                  style={{ display: 'block', background: 'var(--primary)', color: '#fff', padding: '14px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', textAlign: 'center', textDecoration: 'none' }}>
                  💰 Simular financiamento
                </Link>
                <button onClick={() => router.back()}
                  style={{ display: 'block', background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text-muted)', padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', textAlign: 'center', cursor: 'pointer', width: '100%' }}>
                  ← Voltar à lista
                </button>
              </div>

              {building.address_full && (
                <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '16px', textAlign: 'center' }}>
                  {building.address_full}{building.city ? `, ${building.city}` : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
