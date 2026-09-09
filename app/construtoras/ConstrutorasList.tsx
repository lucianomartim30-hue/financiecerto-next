'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

interface ConstrutoraResumo {
  slug: string;
  nome: string;
  quantidade: number;
  cidades: string[];
  logo: string | null;
}
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

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
          {filtradas.map(construtora => (
            <Link key={construtora.slug} href={`/construtoras/${construtora.slug}`} style={{ textDecoration: 'none' }}>
              <article style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', boxShadow: '0 2px 8px rgba(15,23,42,.04)' }}>
                {construtora.logo ? (
                  <img src={construtora.logo} alt={`Logo da construtora ${construtora.nome}`}
                    style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'contain', background: 'var(--bg)', border: '1px solid var(--border)' }} />
                ) : (
                  <div aria-hidden style={{ width: '52px', height: '52px', borderRadius: '10px', display: 'grid', placeItems: 'center', fontSize: '20px', border: '1px dashed var(--border)', color: 'var(--text-faint)' }}>🏢</div>
                )}
                <h3 style={{ fontSize: '17px', color: 'var(--text)', margin: 0 }}>{construtora.nome}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                  {construtora.quantidade} {construtora.quantidade === 1 ? 'empreendimento' : 'empreendimentos'}
                </p>
                <span style={{ color: 'var(--primary)', fontSize: '13px', fontWeight: 800 }}>Ver imóveis →</span>
              </article>
            </Link>
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', padding: '20px 0' }}>Nenhuma construtora encontrada com esse nome.</p>
      )}
    </section>
  );
}

