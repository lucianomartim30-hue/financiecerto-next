/**
 * Lista de links de imóveis renderizada no servidor (ver lib/imoveis-listagem-seo.ts).
 * Dá ao Google texto e links internos reais nas páginas de listagem client-side.
 */
import Link from 'next/link';
import type { CatalogEntry } from '@/lib/orulo-kv';
import { temPrecoReal } from '@/lib/filtro-breve-lancamento';
import { getStatusCfg } from '@/lib/status';
import type { HubLink } from '@/lib/imoveis-listagem-seo';

const caixa: React.CSSProperties = {
  maxWidth: '1120px',
  margin: '0 auto',
  padding: '8px 18px 40px',
};

const titulo: React.CSSProperties = {
  fontSize: '19px',
  fontWeight: 800,
  color: 'var(--text)',
  margin: '0 0 6px',
};

const sub: React.CSSProperties = { color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 14px', lineHeight: 1.6 };

function brl(v: number): string {
  return 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

export function ListaImoveisSEO({ titulo: t, intro, imoveis }: { titulo: string; intro?: string; imoveis: CatalogEntry[] }) {
  if (imoveis.length === 0) return null;
  return (
    <section aria-label={t} style={caixa}>
      <h2 style={titulo}>{t}</h2>
      {intro && <p style={sub}>{intro}</p>}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px 24px' }}>
        {imoveis.map(i => {
          const preco = temPrecoReal(i) ? i.min_price! : null;
          const status = getStatusCfg(i.status, i.min_price).label;
          return (
            <li key={i.id} style={{ fontSize: '14px', lineHeight: 1.5 }}>
              <Link href={`/imoveis/${i.id}`} style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>
                {i.name}
              </Link>
              <span style={{ color: 'var(--text-muted)' }}>
                {' — '}
                {[i.neighborhood, i.city].filter(Boolean).join(', ')}
                {status ? ` · ${status}` : ''}
                {preco ? ` · a partir de ${brl(preco)}` : ''}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ListaHubsSEO({ titulo: t, intro, links }: { titulo: string; intro?: string; links: HubLink[] }) {
  if (links.length === 0) return null;
  return (
    <section aria-label={t} style={caixa}>
      <h2 style={titulo}>{t}</h2>
      {intro && <p style={sub}>{intro}</p>}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
        {links.map(l => (
          <li key={l.href} style={{ fontSize: '14px' }}>
            <Link href={l.href} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>{l.texto}</Link>
            <span style={{ color: 'var(--text-muted)' }}>{` (${l.qtd})`}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
