import type { Metadata } from 'next';
import Link from 'next/link';
import SchemaMarkup from '@/components/SchemaMarkup';
import { getConstrutoras } from '@/lib/construtoras-catalogo';
import { breadcrumb, SITE_CONFIG } from '@/lib/schema';
import ConstrutorasList from './ConstrutorasList';

const URL = `${SITE_CONFIG.domain}/construtoras`;
const TITLE = 'Construtoras com Imóveis à Venda | FinancieCerto';
const DESCRIPTION = 'Encontre imóveis por construtora, compare empreendimentos disponíveis e simule seu financiamento no FinancieCerto.';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: URL },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: URL,
    siteName: SITE_CONFIG.name,
    locale: 'pt_BR',
    type: 'website',
  },
};

export default async function ConstrutorasPage() {
  const construtoras = (await getConstrutoras()).filter(c => c.indexavel);
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${URL}#page`,
      name: TITLE,
      description: DESCRIPTION,
      url: URL,
      inLanguage: SITE_CONFIG.language,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: construtoras.length,
        itemListElement: construtoras.map((c, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: c.nome,
          url: `${URL}/${c.slug}`,
        })),
      },
    },
    breadcrumb([
      { name: 'Início', url: SITE_CONFIG.domain },
      { name: 'Construtoras', url: URL },
    ]),
  ];

  return (
    <main style={{ minHeight: '70vh', background: 'var(--bg)', padding: '40px 18px 64px' }}>
      <SchemaMarkup schemas={schemas} />
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: '12px', marginBottom: '20px' }}>
          <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Início</Link>
          <span style={{ color: 'var(--text-faint)', margin: '0 7px' }}>›</span>
          <span style={{ color: 'var(--text-muted)' }}>Construtoras</span>
        </nav>
        <header style={{ maxWidth: '760px' }}>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', lineHeight: 1.12, color: 'var(--text)', marginBottom: '14px' }}>
            Encontre imóveis por construtora
          </h1>
          <p style={{ fontSize: '17px', lineHeight: 1.65, color: 'var(--text-muted)' }}>
            Veja os empreendimentos disponíveis de cada construtora, compare localização, tamanho e preço e encontre o imóvel que combina com o seu perfil.
          </p>
        </header>
        <ConstrutorasList construtoras={construtoras.map(c => ({ slug: c.slug, nome: c.nome, quantidade: c.imoveis.length, cidades: c.cidades, logo: c.logo, destaque: c.destaque }))} />
      </div>
    </main>
  );
}
