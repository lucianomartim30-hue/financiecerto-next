import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArtigo, getArtigos, ARTIGOS, type BlocoArtigo } from '@/lib/artigos';

const BASE = 'https://www.financiecerto.com.br';

// ── Pré-renderiza todos os artigos (estático = rápido + ótimo p/ SEO) ──────────
export function generateStaticParams() {
  return ARTIGOS.map(a => ({ slug: a.slug }));
}

// ── Metadata por artigo (título, descrição, canonical, Open Graph) ─────────────
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const artigo = getArtigo(slug);
  if (!artigo) return { title: 'Artigo não encontrado — FinancieCerto' };

  const url = `${BASE}/aprenda/${artigo.slug}`;
  return {
    title: artigo.tituloSEO,
    description: artigo.metaDescription,
    keywords: artigo.keyword,
    alternates: { canonical: url },
    openGraph: {
      title: artigo.tituloSEO,
      description: artigo.metaDescription,
      url,
      siteName: 'FinancieCerto',
      locale: 'pt_BR',
      type: 'article',
      publishedTime: artigo.publicado,
      modifiedTime: artigo.atualizado,
    },
  };
}

// ── Markup inline mínimo: **negrito** → <strong> (conteúdo é nosso, seguro) ────
function inline(texto: string): string {
  return texto.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function Bloco({ b }: { b: BlocoArtigo }) {
  switch (b.tipo) {
    case 'p':
      return <p style={{ fontSize: 17, lineHeight: 1.75, color: 'var(--text)', margin: '0 0 18px' }}
        dangerouslySetInnerHTML={{ __html: inline(b.texto) }} />;
    case 'lista':
      return (
        <ul style={{ margin: '0 0 18px', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {b.itens.map((it, i) => (
            <li key={i} style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--text)' }}
              dangerouslySetInnerHTML={{ __html: inline(it) }} />
          ))}
        </ul>
      );
    case 'destaque':
      return (
        <div style={{
          background: 'var(--primary-light)', borderLeft: '4px solid var(--primary)',
          borderRadius: '0 10px 10px 0', padding: '16px 20px', margin: '0 0 24px',
          fontSize: 16, lineHeight: 1.65, color: 'var(--text)',
        }} dangerouslySetInnerHTML={{ __html: inline(b.texto) }} />
      );
    case 'tabela':
      return (
        <div style={{ overflowX: 'auto', margin: '0 0 24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
            <thead>
              <tr>
                {b.cabecalho.map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '10px 14px', background: 'var(--bg-card2)', color: 'var(--primary)', fontWeight: 800, borderBottom: '2px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.linhas.map((linha, i) => (
                <tr key={i}>
                  {linha.map((cel, j) => (
                    <td key={j} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>{cel}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

export default async function ArtigoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const artigo = getArtigo(slug);
  if (!artigo) notFound();

  const url = `${BASE}/aprenda/${artigo.slug}`;
  const relacionados = artigo.relacionados
    .map(s => getArtigos().find(a => a.slug === s))
    .filter(Boolean) as ReturnType<typeof getArtigos>;

  // ── Dados estruturados (Article + FAQ + Breadcrumb) ──────────────────────────
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: artigo.titulo,
        description: artigo.metaDescription,
        datePublished: artigo.publicado,
        dateModified: artigo.atualizado,
        author: { '@type': 'Organization', name: 'FinancieCerto' },
        publisher: { '@type': 'Organization', name: 'FinancieCerto', url: BASE },
        mainEntityOfPage: url,
        inLanguage: 'pt-BR',
      },
      {
        '@type': 'FAQPage',
        mainEntity: artigo.faq.map(f => ({
          '@type': 'Question',
          name: f.pergunta,
          acceptedAnswer: { '@type': 'Answer', text: f.resposta },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: BASE },
          { '@type': 'ListItem', position: 2, name: 'Aprenda', item: `${BASE}/aprenda` },
          { '@type': 'ListItem', position: 3, name: artigo.titulo, item: url },
        ],
      },
    ],
  };

  return (
    <div style={{ background: 'var(--bg)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)',
        padding: '64px 24px 56px', textAlign: 'center',
      }}>
        <div className="container" style={{ maxWidth: 760 }}>
          <Link href="/aprenda" style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd', textDecoration: 'none', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            ← Aprenda
          </Link>
          <h1 style={{ fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 800, color: '#fff', lineHeight: 1.2, margin: '14px 0 16px' }}>
            {artigo.titulo}
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>
            Atualizado em {new Date(artigo.atualizado).toLocaleDateString('pt-BR')} · {artigo.leituraMin} min de leitura
          </p>
        </div>
      </section>

      {/* Conteúdo */}
      <article className="container" style={{ maxWidth: 760, padding: '48px 24px 24px' }}>
        <p style={{ fontSize: 19, lineHeight: 1.7, color: 'var(--text-muted)', fontWeight: 500, margin: '0 0 36px' }}>
          {artigo.resumo}
        </p>

        {artigo.secoes.map((sec, i) => (
          <section key={i} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 'clamp(21px, 3.5vw, 26px)', fontWeight: 800, color: 'var(--text)', margin: '0 0 16px', letterSpacing: '-0.3px' }}>
              {sec.titulo}
            </h2>
            {sec.blocos.map((b, j) => <Bloco key={j} b={b} />)}
          </section>
        ))}

        {/* CTA Simulador */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f, #2563eb)', borderRadius: 16,
          padding: '28px 24px', textAlign: 'center', margin: '8px 0 40px',
        }}>
          <p style={{ fontSize: 19, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
            Quer ver os seus números?
          </p>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.75)', margin: '0 0 18px' }}>
            Simule com a sua renda e o seu imóvel — gratuito, em menos de 2 minutos.
          </p>
          <Link href={artigo.ctaSimulador.href} className="btn-primary" style={{ background: '#fff', color: '#1e3a5f' }}>
            {artigo.ctaSimulador.texto} →
          </Link>
        </div>

        {/* CTA João */}
        <div style={{
          background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 14,
          padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 40,
        }}>
          <img src="/avatar-joao.png" alt="João" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 2px' }}>Ficou com alguma dúvida?</p>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
              Clique no <strong>João</strong> (canto inferior direito) e pergunte — ele já sabe sobre este assunto.
            </p>
          </div>
        </div>

        {/* FAQ */}
        {artigo.faq.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 'clamp(21px, 3.5vw, 26px)', fontWeight: 800, color: 'var(--text)', margin: '0 0 20px' }}>
              Perguntas frequentes
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {artigo.faq.map((f, i) => (
                <details key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
                  <summary style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', cursor: 'pointer' }}>{f.pergunta}</summary>
                  <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--text-muted)', margin: '10px 0 0' }}>{f.resposta}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Relacionados */}
        {relacionados.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: '0 0 14px' }}>Leia também</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {relacionados.map(r => (
                <Link key={r.slug} href={`/aprenda/${r.slug}`} style={{ fontSize: 16, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
                  → {r.titulo}
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
