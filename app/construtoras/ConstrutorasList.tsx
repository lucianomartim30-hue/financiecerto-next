'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

interface ConstrutoraResumo {
  slug: string;
  nome: string;
  quantidade: number;
  cidades: string[];
  logo: string | null;
  destaque: 1 | 2 | 3 | null;
}
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Estilo do card por n\u00edvel de destaque \u2014 quanto maior o destaque, mais forte
// a borda/sombra e maior a logo. Sem destaque (null) fica como sempre foi.
const ESTILO_DESTAQUE: Record<1 | 2 | 3, { border: string; shadow: string; logoSize: string; selo: string | null; padding: string }> = {
  1: { border: '2px solid var(--primary)', shadow: '0 6px 18px rgba(15,23,42,.10)', logoSize: '60px', selo: '\u2605 Destaque', padding: '22px' },
  2: { border: '1.5px solid var(--primary)', shadow: '0 3px 12px rgba(15,23,42,.06)', logoSize: '56px', selo: 'Destaque', padding: '20px' },
  3: { border: '1px solid var(--primary)', shadow: '0 2px 8px rgba(15,23,42,.04)', logoSize: '52px', selo: null, padding: '18px' },
};

export default function ConstrutorasList({ construtoras }: { construtoras: ConstrutoraResumo[] }) {
  const [busca, setBusca] = useState('');
  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return construtoras;
    return construtoras.filter(c => normalizar(`${c.nome} ${c.cidades.join(' ')}`).includes(termo));
  }, [busca, construtoras]);

  return (
    <section aria-labelledby="lista-construtoras" style={{ marginTop: '28px' }}>
      <h2 id="lista-construtoras" style={{ fontSize: '22px', color: 'var(--text)', marginBottom: '14px' }}>
        Construtoras com imóveis disponíveis
      </h2>
      <label style={{ display: 'block', maxWidth: '520px', marginBottom: '20px' }}>
        <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '7px' }}>
          Busque pelo nome da construtora
        </span>
        <input
          type="search"
          value={busca}
          onChange={event => setBusca(event.target.value)}
          placeholder="Ex.: Cury"
          style={{ width: '100%', height: '46px', border: '1px solid var(--border)', borderRadius: '10px', padding: '0 14px', background: 'var(--bg-card)', color: 'var(--text)', font: 'inherit' }}
        />
      </label>

      {filtradas.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '14px' }}>
          {filtradas.map(construtora => {
            const nivel = construtora.destaque ? ESTILO_DESTAQUE[construtora.destaque] : null;
            return (
              <Link key={construtora.slug} href={`/construtoras/${construtora.slug}`} style={{ textDecoration: 'none' }}>
                <article style={{
                  position: 'relative',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  background: 'var(--bg-card)',
                  border: nivel?.border ?? '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: nivel?.padding ?? '18px',
                  boxShadow: nivel?.shadow ?? '0 2px 8px rgba(15,23,42,.04)',
                }}>
                  {nivel?.selo && (
                    <span style={{ position: 'absolute', top: '-10px', right: '14px', background: 'var(--primary)', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '999px' }}>
                      {nivel.selo}
                    </span>
                  )}
                  {construtora.logo ? (
                    <img src={construtora.logo} alt={`Logo da construtora ${construtora.nome}`}
                      style={{ width: nivel?.logoSize ?? '52px', height: nivel?.logoSize ?? '52px', borderRadius: '10px', objectFit: 'contain', background: 'var(--bg)', border: '1px solid var(--border)' }} />
                  ) : (
                    <div aria-hidden style={{ width: nivel?.logoSize ?? '52px', height: nivel?.logoSize ?? '52px', borderRadius: '10px', display: 'grid', placeItems: 'center', fontSize: '20px', border: '1px dashed var(--border)', color: 'var(--text-faint)' }}>🏢</div>
                  )}
                  <h3 style={{ fontSize: construtora.destaque === 1 ? '19px' : '17px', color: 'var(--text)', margin: 0 }}>{construtora.nome}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                    {construtora.quantidade} {construtora.quantidade === 1 ? 'empreendimento' : 'empreendimentos'}
                  </p>
                  <span style={{ color: 'var(--primary)', fontSize: '13px', fontWeight: 800 }}>Ver imóveis →</span>
                </article>
              </Link>
            );
          })}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', padding: '20px 0' }}>Nenhuma construtora encontrada com esse nome.</p>
      )}
    </section>
  );
}

