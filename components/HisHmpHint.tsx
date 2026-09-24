'use client';

import Link from 'next/link';

/**
 * Aviso pós-simulação: NÃO afirma que a pessoa "é" HIS, HMP ou R2V — essa
 * classificação é do EMPREENDIMENTO (definida pela Prefeitura de SP), não da
 * renda de quem compra. O simulador só diz que o perfil pode se enquadrar em
 * qualquer uma delas, conforme o empreendimento escolhido.
 */
export function HisHmpHint() {
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      background: 'var(--bg-card)', border: '1.5px dashed var(--border)', borderRadius: 12,
      padding: '14px 16px', marginTop: 16, marginBottom: 4,
    }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>💡</span>
      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.55, margin: 0 }}>
        Em São Paulo, cada empreendimento tem uma classificação da Prefeitura — <strong>HIS, HMP ou R2V</strong> — e é ela que define preço-teto, renda exigida e regras de revenda e aluguel (inclusive Airbnb). Seu perfil pode se enquadrar em qualquer uma delas, <strong>dependendo do empreendimento que você escolher</strong>: confirme a classificação dele antes de fechar.{' '}
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
