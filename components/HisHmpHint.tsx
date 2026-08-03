'use client';

import Link from 'next/link';

export function HisHmpHint() {
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      background: 'var(--bg-card)', border: '1.5px dashed var(--border)', borderRadius: 12,
      padding: '14px 16px', marginTop: 16, marginBottom: 4,
    }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>💡</span>
      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.55, margin: 0 }}>
        Empreendimentos nessa faixa de renda às vezes são classificados como <strong>HIS/HMP</strong> em São Paulo, com regras próprias de revenda e aluguel (inclusive Airbnb).{' '}
        <Link
          href="/aprenda/his-hmp-o-que-sao-quem-pode-comprar"
          onClick={() => import('@/lib/gtag').then(m => m.trackCtaClick({ origem: 'simulador_resultado_his_hmp', destino: '/aprenda/his-hmp-o-que-sao-quem-pode-comprar', texto: 'Entenda antes de escolher o imóvel' }))}
          style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}
        >
          Entenda antes de escolher o imóvel →
        </Link>
      </p>
    </div>
  );
}
