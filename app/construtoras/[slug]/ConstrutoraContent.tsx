'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { ImovelConstrutora } from '@/lib/construtoras-catalogo';
import { getStatusCfg } from '@/lib/status';

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function faixa(min: number | null, max: number | null, sufixo: string): string | null {
  if (!min) return null;
  return max && max !== min ? `${min}–${max} ${sufixo}` : `${min} ${sufixo}`;
}
export default function ConstrutoraContent({ nome, imoveis, cidades }: { nome: string; imoveis: ImovelConstrutora[]; cidades: string[] }) {
  const [cidade, setCidade] = useState('');
  const [ordem, setOrdem] = useState<'relevancia' | 'menor-preco' | 'maior-preco'>('relevancia');
  const [limite, setLimite] = useState(12);

  const filtrados = useMemo(() => {
    const lista = cidade ? imoveis.filter(imovel => imovel.city === cidade) : [...imoveis];
    if (ordem === 'menor-preco') lista.sort((a, b) => (a.min_price && a.min_price >= 100 ? a.min_price : Number.MAX_SAFE_INTEGER) - (b.min_price && b.min_price >= 100 ? b.min_price : Number.MAX_SAFE_INTEGER));
    if (ordem === 'maior-preco') lista.sort((a, b) => (b.min_price ?? 0) - (a.min_price ?? 0));
    return lista;
  }, [cidade, imoveis, ordem]);

  return (
    <section aria-labelledby="imoveis-disponiveis" style={{ marginTop: '30px' }}>
      <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', marginBottom: '18px' }}>
        <div>
          <h2 id="imoveis-disponiveis" style={{ fontSize: '23px', color: 'var(--text)', marginBottom: '4px' }}>Imóveis disponíveis</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{filtrados.length} {filtrados.length === 1 ? 'empreendimento encontrado' : 'empreendimentos encontrados'}</p>
        </div>
        <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap' }}>
          {cidades.length > 1 && (
            <select value={cidade} onChange={event => { setCidade(event.target.value); setLimite(12); }} aria-label="Filtrar por cidade" style={{ height: '40px', border: '1px solid var(--border)', borderRadius: '9px', padding: '0 10px', background: 'var(--bg-card)', color: 'var(--text)' }}>
              <option value="">Todas as cidades</option>
              {cidades.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          )}
          <select value={ordem} onChange={event => setOrdem(event.target.value as typeof ordem)} aria-label="Ordenar imóveis" style={{ height: '40px', border: '1px solid var(--border)', borderRadius: '9px', padding: '0 10px', background: 'var(--bg-card)', color: 'var(--text)' }}>
            <option value="relevancia">Relevância</option>
            <option value="menor-preco">Menor preço</option>
            <option value="maior-preco">Maior preço</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(245px, 1fr))', gap: '15px' }}>
        {filtrados.slice(0, limite).map(imovel => {
          const status = getStatusCfg(imovel.status_norm || imovel.status, imovel.min_price);
          const specs = [faixa(imovel.bedrooms_min, imovel.bedrooms_max, 'qts'), imovel.area_min ? `${imovel.area_min}m²` : null, faixa(imovel.vagas_min, imovel.vagas_max, 'vaga')].filter(Boolean);
          const promos = imovel.promocoes_destaque;
          const temPromo = promos.length > 0;
          return (
            <Link key={imovel.id} href={`/imoveis/${imovel.id}`} style={{ textDecoration: 'none', display: 'block' }}>
              <article style={{ height: '100%', overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '13px', boxShadow: '0 2px 10px rgba(15,23,42,.04)' }}>
                <div style={{ height: '160px', background: '#e2e8f0', position: 'relative', overflow: 'hidden' }}>
                  {imovel.photo
                    ? <img src={imovel.photo} alt={`${imovel.name}, imóvel da ${nome}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { const t = e.currentTarget; t.style.display = 'none'; const p = t.parentElement; if (p) { p.style.display = 'flex'; p.style.alignItems = 'center'; p.style.justifyContent = 'center'; p.innerHTML = '<span style="font-size:34px">🏢</span>'; } }} />
                    : <div style={{ height: '100%', display: 'grid', placeItems: 'center', fontSize: '34px' }}>🏢</div>}
                  <span style={{ position: 'absolute', left: '9px', top: '9px', borderRadius: '6px', padding: '4px 7px', color: '#fff', background: status.cor, fontSize: '9px', fontWeight: 800, textTransform: 'uppercase' }}>{status.label || 'Disponível'}</span>
                  {temPromo && (
                    <span style={{ position: 'absolute', top: '9px', right: '9px', background: '#dc2626', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '4px 7px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      🔥 Promoção
                    </span>
                  )}
                </div>
                <div style={{ padding: '13px' }}>
                  <h3 style={{ fontSize: '15px', color: 'var(--text)', lineHeight: 1.35, marginBottom: '5px' }}>{imovel.name}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '9px' }}>📍 {[imovel.neighborhood, imovel.city, imovel.street].filter(Boolean).join(' · ')}</p>

                  {temPromo ? (
                    <div style={{ padding: '7px 9px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: specs.length ? '8px' : 0 }}>
                      <p style={{ fontSize: '9px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: '3px' }}>
                        {promos.length > 1 ? `🔥 ${promos.length} unidades em promoção` : '🔥 Unidade em promoção'}
                      </p>
                      {promos.length > 1 ? (
                        <p style={{ fontSize: '15px', fontWeight: 900, color: '#dc2626' }}>
                          A partir de {moeda.format(Math.min(...promos.map(p => p.precoPromocional)))}
                        </p>
                      ) : (() => {
                        const p = promos[0];
                        const temDesconto = !!(p.precoOriginal && p.precoOriginal > p.precoPromocional);
                        return (
                          <>
                            <p style={{ fontSize: '15px', fontWeight: 900, color: '#dc2626' }}>
                              {temDesconto && <span style={{ fontSize: '11px', fontWeight: 600, color: '#991b1b', textDecoration: 'line-through', marginRight: '5px' }}>{moeda.format(p.precoOriginal!)}</span>}
                              {moeda.format(p.precoPromocional)}
                            </p>
                            {p.beneficio && <p style={{ fontSize: '10px', color: '#b91c1c', fontWeight: 600, marginTop: '2px' }}>🎁 {p.beneficio}</p>}
                            {p.ultimaUnidade && <p style={{ fontSize: '10px', color: '#b91c1c', fontWeight: 700, marginTop: '2px' }}>🏁 Última unidade disponível dessa característica!</p>}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <p style={{ fontSize: '17px', color: 'var(--primary)', fontWeight: 900, marginBottom: specs.length ? '8px' : 0 }}>{imovel.min_price && imovel.min_price >= 100 ? `A partir de ${moeda.format(imovel.min_price)}` : 'Consultar'}</p>
                  )}

                  {specs.length > 0 && <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{specs.join(' · ')}</p>}
                </div>
              </article>
            </Link>
          );
        })}
      </div>

      {limite < filtrados.length && (
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button onClick={() => setLimite(valor => valor + 12)} style={{ height: '44px', padding: '0 22px', border: '1.5px solid var(--primary)', borderRadius: '10px', background: 'var(--bg-card)', color: 'var(--primary)', fontWeight: 800, cursor: 'pointer' }}>Ver mais imóveis</button>
        </div>
      )}
    </section>
  );
}

