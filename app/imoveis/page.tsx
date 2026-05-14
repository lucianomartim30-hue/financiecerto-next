'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatBRL } from '@/lib/calculos';

interface Imovel {
  id: string;
  name: string;
  developer: string;
  min_price: number | null;
  max_price: number | null;
  bedrooms_min: number | null;
  bedrooms_max: number | null;
  neighborhood: string;
  city: string;
  state: string;
  photo: string | null;
  orulo_url: string | null;
  status: string;
}

function ImoveisContent() {
  const searchParams = useSearchParams();
  const minParam = searchParams.get('min');
  const maxParam = searchParams.get('max');

  const [imoveis, setImoveis] = useState<Imovel[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [erro, setErro] = useState('');

  // Filtros
  const [minPrice, setMinPrice] = useState(minParam || '');
  const [maxPrice, setMaxPrice] = useState(maxParam || '');

  const buscar = useCallback(async (p = 1, append = false) => {
    setLoading(true);
    setErro('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('city', 'São Paulo');
      params.set('state', 'SP');
      if (minPrice) params.set('min_price', minPrice);
      if (maxPrice) params.set('max_price', maxPrice);

      const res = await fetch(`/api/orulo?${params}`);
      if (!res.ok) throw new Error('Erro ao buscar imóveis');
      const data = await res.json();

      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setPage(p);

      if (append) {
        setImoveis(prev => [...prev, ...(data.buildings || [])]);
      } else {
        setImoveis(data.buildings || []);
      }
    } catch (e) {
      setErro('Não foi possível carregar os imóveis. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [minPrice, maxPrice]);

  useEffect(() => {
    buscar(1);
  }, []);

  const temFiltro = minParam || maxParam;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* Header da página */}
      <div style={{
        background: '#ffffff', borderBottom: '1px solid #e7e5e4',
        padding: '32px 24px',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1c1917', marginBottom: '4px' }}>
            {temFiltro ? 'Imóveis compatíveis com seu perfil' : 'Imóveis disponíveis'}
          </h1>
          {temFiltro && (
            <p style={{ color: '#78716c', fontSize: '14px' }}>
              Filtrados entre {minPrice ? formatBRL(Number(minPrice)) : '—'} e {maxPrice ? formatBRL(Number(maxPrice)) : '—'}
            </p>
          )}

          {/* Filtros */}
          <div style={{
            display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap', alignItems: 'flex-end',
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#78716c', marginBottom: '4px' }}>
                PREÇO MÍNIMO
              </label>
              <input
                type="number"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                placeholder="Ex: 200000"
                style={{
                  padding: '8px 12px', border: '1.5px solid #e7e5e4', borderRadius: '8px',
                  fontSize: '14px', width: '160px', outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#78716c', marginBottom: '4px' }}>
                PREÇO MÁXIMO
              </label>
              <input
                type="number"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                placeholder="Ex: 500000"
                style={{
                  padding: '8px 12px', border: '1.5px solid #e7e5e4', borderRadius: '8px',
                  fontSize: '14px', width: '160px', outline: 'none',
                }}
              />
            </div>
            <button
              onClick={() => buscar(1)}
              style={{
                background: '#2563eb', color: '#fff', border: 'none',
                borderRadius: '8px', padding: '9px 20px', fontSize: '14px',
                fontWeight: '600', cursor: 'pointer',
              }}
            >
              Buscar
            </button>
            {(minPrice || maxPrice) && (
              <button
                onClick={() => { setMinPrice(''); setMaxPrice(''); }}
                style={{
                  background: 'transparent', color: '#78716c', border: '1px solid #e7e5e4',
                  borderRadius: '8px', padding: '9px 16px', fontSize: '14px', cursor: 'pointer',
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        {erro && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
            {erro}
          </div>
        )}

        {!loading && !erro && (
          <p style={{ color: '#78716c', fontSize: '14px', marginBottom: '24px' }}>
            {total > 0 ? `${total} empreendimento${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}` : 'Nenhum imóvel encontrado com esses filtros.'}
          </p>
        )}

        {/* Grid de cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}>
          {imoveis.map(b => (
            <CardImovel key={b.id} imovel={b} />
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px', color: '#78716c' }}>
            Carregando imóveis...
          </div>
        )}

        {/* Ver mais */}
        {!loading && page < pages && (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => buscar(page + 1, true)}
              style={{
                background: 'transparent', color: '#2563eb',
                border: '1.5px solid #2563eb', borderRadius: '10px',
                padding: '10px 28px', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
              }}
            >
              Ver mais imóveis
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CardImovel({ imovel: b }: { imovel: Imovel }) {
  const preco = b.min_price ? formatBRL(b.min_price) : 'Consultar';
  const quartos = b.bedrooms_min
    ? b.bedrooms_max && b.bedrooms_max !== b.bedrooms_min
      ? `${b.bedrooms_min}–${b.bedrooms_max} quartos`
      : `${b.bedrooms_min} quarto${b.bedrooms_min > 1 ? 's' : ''}`
    : null;

  const waMsg = encodeURIComponent(
    `Olá Luciano! Vi o imóvel *${b.name}* no FinancieCerto e quero mais informações.${b.orulo_url ? ' Segue o link: ' + b.orulo_url : ''}`
  );

  return (
    <div style={{
      background: '#ffffff', borderRadius: '16px',
      border: '1px solid #e7e5e4', overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Foto */}
      <div style={{
        height: '180px', background: '#f5f5f4', overflow: 'hidden',
        position: 'relative',
      }}>
        {b.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.photo} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#a8a29e', fontSize: '13px',
          }}>
            Sem foto
          </div>
        )}
        {b.status && (
          <span style={{
            position: 'absolute', top: '10px', left: '10px',
            background: 'rgba(0,0,0,0.6)', color: '#fff',
            fontSize: '11px', fontWeight: '600', padding: '3px 8px',
            borderRadius: '6px', textTransform: 'uppercase',
          }}>
            {b.status}
          </span>
        )}
      </div>

      {/* Conteúdo */}
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontSize: '13px', color: '#78716c', marginBottom: '4px' }}>
          {b.neighborhood || b.city}
        </p>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1c1917', marginBottom: '4px', lineHeight: '1.4' }}>
          {b.name}
        </h3>
        {b.developer && (
          <p style={{ fontSize: '12px', color: '#a8a29e', marginBottom: '8px' }}>{b.developer}</p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #f5f5f4' }}>
          <div>
            <p style={{ fontSize: '18px', fontWeight: '700', color: '#1c1917' }}>{preco}</p>
            {quartos && <p style={{ fontSize: '12px', color: '#78716c' }}>{quartos}</p>}
          </div>
          <a
            href={`https://wa.me/5511999999999?text=${waMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: '#25D366', color: '#fff', textDecoration: 'none',
              fontSize: '13px', fontWeight: '600', padding: '7px 14px',
              borderRadius: '8px', whiteSpace: 'nowrap',
            }}
          >
            Falar
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ImoveisPage() {
  return (
    <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: '#78716c' }}>Carregando...</div>}>
      <ImoveisContent />
    </Suspense>
  );
}
