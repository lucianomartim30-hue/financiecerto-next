'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatBRL } from '@/lib/calculos';
import { getStatusCfg } from '@/lib/status';
import { getFavoritoIds, onFavoritosChange } from '@/lib/favoritos';
import FavoritoButton from '@/components/FavoritoButton';

interface Imovel {
  id: string; name: string; developer: string;
  min_price: number | null;
  bedrooms_min: number | null; bedrooms_max: number | null;
  area_min: number | null;
  neighborhood: string; city: string;
  photo: string | null; status: string; status_norm: string;
}

function fmtRange(min: number | null, max: number | null, unit: string) {
  if (!min) return null;
  if (max && max !== min) return `${min}–${max} ${unit}`;
  return `${min} ${unit}`;
}

export default function FavoritosContent() {
  const [ids, setIds] = useState<string[] | null>(null); // null = ainda não leu localStorage
  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIds(getFavoritoIds());
    return onFavoritosChange(() => setIds(getFavoritoIds()));
  }, []);

  useEffect(() => {
    if (ids === null) return;
    if (ids.length === 0) { setImoveis([]); setLoading(false); return; }
    setLoading(true);
    fetch('/api/orulo?all=1')
      .then(r => r.json())
      .then(data => {
        const all: Imovel[] = data.buildings || [];
        const idSet = new Set(ids);
        // Preserva a ordem dos favoritos (mais recente primeiro), não a ordem do catálogo.
        const porId = new Map(all.map(b => [b.id, b]));
        setImoveis(ids.map(id => porId.get(id)).filter((b): b is Imovel => !!b && idSet.has(b.id)));
      })
      .catch(() => setImoveis([]))
      .finally(() => setLoading(false));
  }, [ids]);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px 64px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>❤️ Meus Favoritos</h1>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '28px' }}>
        Salvos neste navegador — {ids?.length ?? 0} imóvel{ids?.length === 1 ? '' : 'is'}
      </p>

      {loading && (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Carregando...</p>
      )}

      {!loading && ids !== null && ids.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '16px' }}>
          <p style={{ fontSize: '32px', marginBottom: '10px' }}>🤍</p>
          <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>Nenhum favorito ainda</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Clique no coração de qualquer imóvel para salvá-lo aqui.
          </p>
          <Link href="/imoveis" className="btn-primary" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            Ver imóveis →
          </Link>
        </div>
      )}

      {!loading && imoveis.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
          {imoveis.map(im => {
            const sc = getStatusCfg(im.status_norm || im.status || '');
            return (
              <Link key={im.id} href={`/imoveis/${im.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '130px', background: '#E2E8F0', position: 'relative', overflow: 'hidden' }}>
                    {im.photo
                      ? <img src={im.photo} alt={im.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: '#94a3b8' }}>🏢</div>
                    }
                    <span style={{ position: 'absolute', top: '7px', left: '7px', background: sc.cor, color: '#fff', fontSize: '9px', fontWeight: '800', padding: '3px 7px', borderRadius: '6px', textTransform: 'uppercase' }}>
                      {sc.label}
                    </span>
                    <FavoritoButton id={im.id} nome={im.name} size="sm" style={{ position: 'absolute', top: '5px', right: '5px', width: '26px', height: '26px', fontSize: '13px' }} />
                  </div>
                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', lineHeight: '1.35', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{im.name}</p>
                    <p style={{ fontSize: '10px', color: 'var(--text-faint)' }}>📍 {im.neighborhood || im.city}</p>
                    <p style={{ fontSize: '14px', fontWeight: '900', color: 'var(--primary)', marginTop: '2px' }}>{im.min_price && im.min_price >= 100 ? formatBRL(im.min_price) : 'Consultar'}</p>
                    {fmtRange(im.bedrooms_min, im.bedrooms_max, 'qts') && (
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '5px', padding: '1px 4px', width: 'fit-content' }}>
                        🛏 {fmtRange(im.bedrooms_min, im.bedrooms_max, 'qts')}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
