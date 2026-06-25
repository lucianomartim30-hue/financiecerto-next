// lib/schema.ts — Configuração centralizada de Schema Markup (JSON-LD)
// Para adicionar em qualquer página: use o componente SchemaMarkup do /components

export const SITE_CONFIG = {
  domain: 'https://www.financiecerto.com.br',
  name: 'FinancieCerto',
  description: 'Plataforma inteligente de descoberta imobiliária baseada na realidade financeira do comprador.',
  foundingDate: '2026',
  logo: 'https://www.financiecerto.com.br/icons/icon-512.png',
  logoWidth: 512,
  logoHeight: 512,
  language: 'pt-BR',
};

export const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_CONFIG.domain}/#organization`,
  name: SITE_CONFIG.name,
  url: SITE_CONFIG.domain,
  logo: {
    '@type': 'ImageObject',
    url: SITE_CONFIG.logo,
    width: SITE_CONFIG.logoWidth,
    height: SITE_CONFIG.logoHeight,
  },
  description: SITE_CONFIG.description,
  foundingDate: SITE_CONFIG.foundingDate,
  inLanguage: SITE_CONFIG.language,
  sameAs: [
    // Adicionar links de redes sociais se disponível
    // 'https://instagram.com/financiecerto',
    // 'https://linkedin.com/company/financiecerto',
  ],
};

export const website = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_CONFIG.domain}/#website`,
  url: SITE_CONFIG.domain,
  name: SITE_CONFIG.name,
  description: SITE_CONFIG.description,
  inLanguage: SITE_CONFIG.language,
  publisher: { '@id': `${SITE_CONFIG.domain}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_CONFIG.domain}/imoveis?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

export function breadcrumb(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function article(params: {
  url: string;
  title: string;
  description: string;
  imageUrl?: string;
  publishedDate: string;
  modifiedDate: string;
  keywords?: string;
  wordCount?: number;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${params.url}#article`,
    headline: params.title,
    description: params.description,
    image: params.imageUrl
      ? {
          '@type': 'ImageObject',
          url: params.imageUrl,
          width: 1200,
          height: 630,
        }
      : undefined,
    datePublished: params.publishedDate,
    dateModified: params.modifiedDate,
    author: {
      '@type': 'Organization',
      '@id': `${SITE_CONFIG.domain}/#organization`,
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.domain,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_CONFIG.domain}/#organization`,
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.domain,
      logo: {
        '@type': 'ImageObject',
        url: SITE_CONFIG.logo,
      },
    },
    keywords: params.keywords,
    articleSection: 'Financiamento Imobiliário',
    inLanguage: SITE_CONFIG.language,
    mainEntityOfPage: params.url,
    wordCount: params.wordCount,
  };
}

export function faqPage(params: {
  url: string;
  title: string;
  description: string;
  questions: Array<{ name: string; answer: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${params.url}#faq`,
    name: params.title,
    description: params.description,
    url: params.url,
    inLanguage: SITE_CONFIG.language,
    publisher: { '@id': `${SITE_CONFIG.domain}/#organization` },
    mainEntity: params.questions.map(q => ({
      '@type': 'Question',
      name: q.name,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };
}

export function howTo(params: {
  url: string;
  title: string;
  description: string;
  steps: Array<{ position: number; name: string; text: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    '@id': `${params.url}#howto`,
    name: params.title,
    description: params.description,
    url: params.url,
    inLanguage: SITE_CONFIG.language,
    publisher: { '@id': `${SITE_CONFIG.domain}/#organization` },
    step: params.steps.map(s => ({
      '@type': 'HowToStep',
      position: s.position,
      name: s.name,
      text: s.text,
    })),
  };
}

export function collectionPage(params: {
  url: string;
  title: string;
  description: string;
  items: Array<{ url: string; headline: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${params.url}#page`,
    name: params.title,
    description: params.description,
    url: params.url,
    inLanguage: SITE_CONFIG.language,
    publisher: { '@id': `${SITE_CONFIG.domain}/#organization` },
    hasPart: params.items.map(item => ({
      '@type': 'Article',
      url: item.url,
      headline: item.headline,
    })),
  };
}

export function webApplication(params: {
  url: string;
  title: string;
  description: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${params.url}#app`,
    name: params.title,
    description: params.description,
    url: params.url,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BRL',
    },
    publisher: { '@id': `${SITE_CONFIG.domain}/#organization` },
    inLanguage: SITE_CONFIG.language,
  };
}

export function contactPage(params: { url: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    '@id': `${params.url}#page`,
    url: params.url,
    name: 'Contato — FinancieCerto',
    inLanguage: SITE_CONFIG.language,
    publisher: { '@id': `${SITE_CONFIG.domain}/#organization` },
  };
}

export function aboutPage(params: { url: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${params.url}#page`,
    url: params.url,
    name: 'Sobre o FinancieCerto',
    inLanguage: SITE_CONFIG.language,
    about: { '@id': `${SITE_CONFIG.domain}/#organization` },
  };
}

export function searchResultsPage(params: {
  url: string;
  title: string;
  description: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SearchResultsPage',
    '@id': `${params.url}#page`,
    url: params.url,
    name: params.title,
    description: params.description,
    inLanguage: SITE_CONFIG.language,
    publisher: { '@id': `${SITE_CONFIG.domain}/#organization` },
  };
}
