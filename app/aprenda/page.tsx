import type { Metadata } from 'next';
import Link from 'next/link';
import { getArtigos } from '@/lib/artigos';

const BASE = 'https://www.financiecerto.com.br';

export const metadata: Metadata = {
  title: 'Aprenda — Guia de Financiamento Imobiliário, MCMV e Imóvel na Planta',
  description:
    'Artigos didáticos sobre MCMV, crédito associativo, imóvel na planta, juros de obra, FGTS e como comprar seu imóvel. Entenda antes de assinar.',
  alternates: { canonical: `${BASE}/aprenda` },
  openGraph: {
    title: 'Aprenda — FinancieCerto',
    description: 'Artigos didáticos sobre financiamento imobiliário, MCMV e imóvel na planta.',
    url: `${BASE}/aprenda`,
    siteName: 'FinancieCerto',
    locale: 'pt_BR',
    type: 'website',
  },
};

export default function AprendaIndex() {
  const artigos = getArtigos();

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)',
        padding: '72px 24px 64px', textAlign: 'center',
      }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <span style={{ display: 'inline-block', background: 'rgba(255,255,255,.1)', borderRadius: 99, padding: '5px 14px', fontSize: 12, fontWeight: 700, color: '#93c5fd', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 18 }}>
            Aprenda
          </span>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, color: '#fff', lineHeight: 1.2, margin: '0 0 16px' }}>
            Entenda o financiamento antes de assinar
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,.7)', lineHeight: 1.6 }}>
            Artigos diretos e didáticos sobre MCMV, imóvel na planta, juros de obra, FGTS e tudo que você precisa saber para comprar com segurança.
          </p>
        </div>
      </section>

      {/* Outros formatos: Guia (jornada) e Glossário (dicionário) */}
      <div className="container" style={{ maxWidth: 820, padding: '40px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <Link href="/guia" className="card card-hover" style={{ padding: '20px 22px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 28 }}>📘</span>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px' }}>Guia passo a passo</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>As 7 etapas, em ordem, até as chaves</p>
            </div>
          </Link>
          <Link href="/glossario" className="card card-hover" style={{ padding: '20px 22px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 28 }}>🔤</span>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: '0 0 4px' }}>Glossário</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Termos do financiamento, de A a Z</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Lista de artigos */}
      <div className="container" style={{ maxWidth: 820, padding: '40px 24px 80px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 16 }}>
          Artigos completos
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {artigos.map(a => (
            <Link key={a.slug} href={`/aprenda/${a.slug}`} className="card card-hover" style={{
              padding: '24px 26px', textDecoration: 'none', display: 'block',
            }}>
              <h2 style={{ fontSize: 21, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
                {a.titulo}
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text-muted)', margin: '0 0 12px' }}>
                {a.metaDescription}
              </p>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                Ler artigo → <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>· {a.leituraMin} min</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
