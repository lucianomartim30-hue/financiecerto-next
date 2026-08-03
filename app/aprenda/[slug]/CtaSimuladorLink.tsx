'use client';

import Link from 'next/link';

export function CtaSimuladorLink({ slug, href, texto }: { slug: string; href: string; texto: string }) {
  return (
    <Link
      href={href}
      className="btn-primary"
      style={{ background: '#fff', color: '#1e3a5f' }}
      onClick={() => import('@/lib/gtag').then(m => m.trackCtaClick({ origem: `artigo:${slug}`, destino: href, texto }))}
    >
      {texto} →
    </Link>
  );
}
