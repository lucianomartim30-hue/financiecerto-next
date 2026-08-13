'use client';

import Link from 'next/link';

export function CtaImoveisLink({ slug, texto, variant = 'primary' }: { slug: string; texto: string; variant?: 'primary' | 'outline' }) {
  const style = variant === 'primary'
    ? { background: '#fff', color: '#1e3a5f' }
    : { background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,.5)' };
  return (
    <Link
      href="/imoveis"
      className={variant === 'primary' ? 'btn-primary' : ''}
      style={style}
      onClick={() => import('@/lib/gtag').then(m => m.trackCtaClick({ origem: `artigo:${slug}`, destino: '/imoveis', texto }))}
    >
      {texto} →
    </Link>
  );
}
