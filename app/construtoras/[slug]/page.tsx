import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import SchemaMarkup from '@/components/SchemaMarkup';
import { getConstrutora } from '@/lib/construtoras-catalogo';
import { breadcrumb, searchResultsPage, SITE_CONFIG } from '@/lib/schema';
import ConstrutoraContent from './ConstrutoraContent';

export const revalidate = 3600;

const carregarConstrutora = cache((slug: string) => getConstrutora(slug));

function descricao(nome: string, quantidade: number, cidades: string[]): string {
  const local = cidades.length ? ` em ${cidades.slice(0, 3).join(', ')}` : '';
  return `Veja ${quantidade} ${quantidade === 1 ? 'imóvel disponível' : 'imóveis disponíveis'} da Construtora ${nome}${local}. Compare preços, localização e condições de financiamento.`;
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const construtora = await carregarConstrutora(slug);
  if (!construtora) return { title: 'Construtora não encontrada | FinancieCerto', robots: { index: false, follow: true } };
  const url = `${SITE_CONFIG.domain}/construtoras/${construtora.slug}`;
  const title = `Imóveis da Construtora ${construtora.nome} | FinancieCerto`;
  const description = descricao(construtora.nome, construtora.imoveis.length, construtora.cidades);
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: construtora.indexavel, follow: true },
    openGraph: { title, description, url, siteName: SITE_CONFIG.name, locale: 'pt_BR', type: 'website' },
  };
}

export default async function ConstrutoraPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const construtora = await carregarConstrutora(slug);
  if (!construtora) notFound();

  const url = `${SITE_CONFIG.domain}/construtoras/${construtora.slug}`;
  const title = `Imóveis da Construtora ${construtora.nome}`;
  const description = descricao(construtora.nome, construtora.imoveis.length, construtora.cidades);
  const schemas = [
    searchResultsPage({ url, title, description }),
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      '@id': `${url}#imoveis`,
      name: title,
      numberOfItems: construtora.imoveis.length,
      itemListElement: construtora.imoveis.slice(0, 50).map((imovel, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: imovel.name,
        url: `${SITE_CONFIG.domain}/imoveis/${imovel.id}`,
      })),
    },
    breadcrumb([
      { name: 'Início', url: SITE_CONFIG.domain },
      { name: 'Construtoras', url: `${SITE_CONFIG.domain}/construtoras` },
      { name: construtora.nome, url },
    ]),
  ];

  return (
    <main style={{ minHeight: '70vh', background: 'var(--bg)', padding: '32px 18px 64px' }}>
      <SchemaMarkup schemas={schemas} />
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: '12px', marginBottom: '20px' }}>
          <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Início</Link>
          <span style={{ color: 'var(--text-faint)', margin: '0 7px' }}>›</span>
          <Link href="/construtoras" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Construtoras</Link>
          <span style={{ color: 'var(--text-faint)', margin: '0 7px' }}>›</span>
          <span style={{ color: 'var(--text-muted)' }}>{construtora.nome}</span>
        </nav>

        <header style={{ maxWidth: '850px' }}>
          <p style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '7px' }}>Construtora</p>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', lineHeight: 1.12, color: 'var(--text)', marginBottom: '13px' }}>Imóveis da Construtora {construtora.nome}</h1>
          <p style={{ fontSize: '16px', lineHeight: 1.65, color: 'var(--text-muted)' }}>{description}</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
            <span style={{ padding: '6px 10px', borderRadius: '999px', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: '12px', fontWeight: 800 }}>{construtora.imoveis.length} imóveis</span>
            {construtora.cidades.slice(0, 4).map(cidade => <span key={cidade} style={{ padding: '6px 10px', borderRadius: '999px', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '12px' }}>{cidade}</span>)}
          </div>
        </header>

        <ConstrutoraContent nome={construtora.nome} imoveis={construtora.imoveis} cidades={construtora.cidades} />

        <section style={{ marginTop: '38px', padding: '22px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '20px', color: 'var(--text)', marginBottom: '8px' }}>Quer saber quanto pode financiar?</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '14px' }}>Use o simulador gratuito para descobrir seu poder de compra antes de escolher o empreendimento.</p>
          <Link href="/simulador" style={{ display: 'inline-block', padding: '11px 17px', borderRadius: '9px', background: 'var(--primary)', color: '#fff', fontWeight: 800, textDecoration: 'none' }}>Simular financiamento</Link>
        </section>
      </div>
    </main>
  );
}

