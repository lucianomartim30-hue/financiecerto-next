import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Guia Completo de Financiamento Imobiliário | FinancieCerto',
  description: 'Tudo sobre MCMV, SBPE, crédito associativo, documentação, custos e o processo real da compra imobiliária no Brasil.',
};

const CAPITULOS = [
  {
    id: 'modalidades',
    icon: '🏦',
    titulo: 'Modalidades de Financiamento',
    subtitulo: 'MCMV vs SBPE vs SFI',
    cor: 'var(--primary)',
    corLight: 'var(--primary-light)',
    topicos: [
      {
        pergunta: 'MCMV, SBPE ou SFI: qual a diferença?',
        resposta: `As três modalidades se dividem por renda e valor do imóvel: **MCMV** (renda até R$ 13.000, 4 faixas, taxas de 4% a 10,5% a.a., subsídio nas Faixas 1 e 2), **SBPE/SFH** (qualquer renda, imóvel até R$ 2,25 milhões, taxa a partir de 11,19% a.a.) e **SFI** (imóvel acima de R$ 2,25 milhões, taxa de mercado, sem FGTS).\n\nVeja o [comparativo completo, com taxas e tetos por faixa](/aprenda/mcmv-sbpe-sfi-qual-modalidade-escolher).`,
      },
      {
        pergunta: 'Qual a diferença entre SAC e Tabela Price?',
        resposta: `No **SAC**, a amortização é fixa e a parcela começa mais alta, mas cai mês a mês. Na **Price**, a parcela é fixa do início ao fim, mas o custo total acaba sendo maior. O MCMV usa SAC por padrão; no SBPE você pode escolher.\n\nVeja o [comparativo com exemplo real (1ª parcela, última parcela e total pago)](/aprenda/sac-ou-price-qual-sistema-amortizacao-escolher).`,
      },
    ],
  },
  {
    id: 'planta',
    icon: '🏗️',
    titulo: 'Imóvel na Planta',
    subtitulo: 'Crédito Associativo e evolução de obra',
    cor: 'var(--accent)',
    corLight: 'var(--accent-light)',
    topicos: [
      {
        pergunta: 'Como funciona o crédito associativo?',
        resposta: `É o modelo em que o financiamento é assinado **antes ou durante a obra** (padrão no MCMV, também existe no SBPE). A Caixa libera recursos à construtora conforme a obra avança, e o comprador paga juros sobre o saldo já liberado até o habite-se — quando o financiamento entra no regime normal.\n\nVeja o [fluxo completo, da assinatura ao habite-se](/aprenda/credito-associativo-como-funciona-comprar-na-planta).`,
      },
      {
        pergunta: 'O que são os juros de evolução de obra?',
        resposta: `Durante a obra, a Caixa Econômica Federal não entrega o valor financiado de uma vez para a construtora — ela libera aos poucos, conforme a obra avança. Você paga juros só sobre o que **já foi liberado**, não sobre o financiamento total.\n\n**Fórmula:** juros do mês = saldo já liberado × (taxa anual ÷ 12)\n\nPor isso a parcela começa baixa (quase nada liberado) e cresce mês a mês, até atingir o teto quando a obra é entregue (habite-se) — momento em que o financiamento entra no regime normal, com amortização. A taxa mensal equivalente varia por modalidade: Faixa 1 ≈ 0,33% a.m., Faixa 3 ≈ 0,64% a.m., SBPE ≈ 0,93% a.m.\n\nVeja o [exemplo completo, mês a mês, com valores reais](/aprenda/juros-evolucao-obra).`,
      },
      {
        pergunta: 'Qual é o fluxo de pagamento típico da construtora?',
        resposta: `Durante a obra, você paga em duas frentes: à **construtora** (ato, mensais, sinais/reforços, anuais e chaves) e ao **banco** (juros de evolução de obra, sobre o saldo já liberado). O saldo restante na entrega das chaves entra no financiamento bancário definitivo.\n\nVeja a [tabela completa de quem recebe o quê e quando](/aprenda/credito-associativo-como-funciona-comprar-na-planta).`,
      },
    ],
  },
  {
    id: 'processo',
    icon: '📋',
    titulo: 'Processo de Compra',
    subtitulo: 'Do SICAQ ao habite-se',
    cor: 'var(--purple)',
    corLight: 'var(--purple-light)',
    topicos: [
      {
        pergunta: 'Quais são as etapas do processo MCMV/HIS?',
        resposta: `Resumo: contrato com a construtora → SICAQ (análise de crédito) → contrato de financiamento com a Caixa → obra com juros de evolução → habite-se → financiamento entra no regime normal.\n\nVeja o [fluxo completo, com prazos e o que pode travar](/aprenda/credito-associativo-como-funciona-comprar-na-planta).`,
      },
      {
        pergunta: 'Quando o banco faz a análise de crédito?',
        resposta: `No MCMV/planta, a análise é feita antes da assinatura, via SICAQ. Em imóvel pronto ou revenda, a análise ocorre quando a proposta chega ao banco, já com o preço negociado.\n\nVeja a [comparação completa entre os dois casos](/aprenda/custos-comprar-imovel-financiado-itbi-cartorio-taxas).`,
      },
      {
        pergunta: 'Quais são os custos além do imóvel?',
        resposta: `ITBI (3% em São Paulo, com isenções importantes no SFH e no MCMV), Registro de Imóveis (0,5% a 1%) e, se a compra for à vista, escritura pública. Reserve entre 2% e 5% do valor do imóvel.\n\nVeja o [detalhamento com exemplo real e a isenção de ITBI que pouca gente usa](/aprenda/custos-comprar-imovel-financiado-itbi-cartorio-taxas).`,
      },
    ],
  },
  {
    id: 'documentos',
    icon: '📁',
    titulo: 'Documentação',
    subtitulo: 'O que você precisa separar',
    cor: 'var(--warning)',
    corLight: 'var(--warning-light)',
    topicos: [
      {
        pergunta: 'Quais documentos preciso separar?',
        resposta: `Documentos pessoais (todo mundo): RG/CPF ou CNH, comprovante de estado civil, comprovante de endereço. De renda, varia por vínculo: CLT usa holerites; autônomo usa extrato bancário + Decore; MEI usa CNPJ ativo + DASN-SIMEI.\n\nVeja o [checklist completo por tipo de renda — CLT, autônomo e MEI](/aprenda/documentos-financiar-imovel-clt-autonomo-mei).`,
      },
    ],
  },
  {
    id: 'fgts',
    icon: '💼',
    titulo: 'FGTS no Financiamento',
    subtitulo: 'Como e quando usar',
    cor: 'var(--orange)',
    corLight: 'var(--orange-light)',
    topicos: [
      {
        pergunta: 'Quando posso usar o FGTS?',
        resposta: `Você pode usar o FGTS para compra de imóvel residencial quando:\n\n• Tem saldo de pelo menos 3 anos de contribuição (não precisa ser contínuo)\n• O imóvel é residencial e para moradia do titular\n• Não possui outro imóvel financiado pelo SFH no Brasil\n• O imóvel está no município onde trabalha, reside há 1 ano ou é sede da empresa empregadora\n\nO FGTS pode ser usado para complementar a entrada (abater do valor do imóvel) ou para amortizar o saldo devedor periodicamente ao longo do financiamento.`,
      },
      {
        pergunta: 'O FGTS reduz a taxa de juros?',
        resposta: `No MCMV, usar o FGTS geralmente garante acesso à menor taxa da faixa. Por exemplo, na Faixa 3 sem FGTS a taxa é 7,66% a.a.; com FGTS pode cair para 7,16% a.a.\n\nAlém disso, quanto maior o valor de entrada (FGTS + recursos próprios), menor o saldo a financiar e, consequentemente, menores a parcela e o total de juros pagos ao longo do contrato.`,
      },
    ],
  },
];

export default function GuiaPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '80px' }}>

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)',
        borderBottom: '1px solid rgba(255,255,255,.08)',
        padding: '64px 24px 72px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,.1)',
            border: '1px solid rgba(255,255,255,.15)',
            borderRadius: 999,
            padding: '5px 16px',
            fontSize: 12, fontWeight: 700,
            color: '#93c5fd',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: 20,
          }}>
            Educação Financeira
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: '900', letterSpacing: '-1px', marginBottom: '16px', color: '#fff' }}>
            Guia Completo de Financiamento
          </h1>
          <p style={{ fontSize: '17px', color: '#cbd5e1', lineHeight: '1.7', maxWidth: '540px', margin: '0 auto 32px' }}>
            Tudo que você precisa saber sobre o processo real da compra imobiliária no Brasil —
            do MCMV ao habite-se.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/simulador" style={{
              background: '#2563eb', color: '#fff', borderRadius: 10,
              padding: '13px 26px', fontSize: 15, fontWeight: 700, textDecoration: 'none',
            }}>
              Simular agora →
            </Link>
            <Link href="/glossario" style={{
              background: 'rgba(255,255,255,.1)', color: '#fff',
              border: '1px solid rgba(255,255,255,.2)',
              borderRadius: 10, padding: '13px 26px', fontSize: 15, fontWeight: 700, textDecoration: 'none',
            }}>
              🔤 Ver glossário
            </Link>
          </div>
        </div>
      </section>

      {/* Índice rápido */}
      <section style={{ padding: '32px 24px', background: '#fff', borderBottom: '1px solid var(--border)' }}>
        <div className="container-md">
          <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px' }}>
            Neste guia
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {CAPITULOS.map((cap) => (
              <a
                key={cap.id}
                href={`#${cap.id}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px',
                  background: cap.corLight,
                  borderRadius: '99px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: cap.cor,
                  textDecoration: 'none',
                  transition: 'opacity 0.15s',
                }}
              >
                {cap.icon} {cap.titulo}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Capítulos */}
      <div className="container-md" style={{ padding: '56px 24px 0' }}>
        {CAPITULOS.map((cap) => (
          <section key={cap.id} id={cap.id} className="scroll-anchor" style={{ marginBottom: '64px' }}>
            {/* Cap header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '20px 24px',
              background: cap.corLight,
              borderRadius: '16px 16px 0 0',
              borderBottom: `2px solid ${cap.cor}20`,
              marginBottom: '2px',
            }}>
              <span style={{ fontSize: '28px' }}>{cap.icon}</span>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: cap.cor, marginBottom: '2px' }}>
                  {cap.titulo}
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{cap.subtitulo}</p>
              </div>
            </div>

            {/* Tópicos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {cap.topicos.map((topico, i) => (
                <details
                  key={i}
                  style={{
                    background: '#fff',
                    border: '1px solid var(--border)',
                    borderTop: i === 0 ? 'none' : undefined,
                    borderRadius: i === cap.topicos.length - 1 ? '0 0 16px 16px' : '0',
                  }}
                >
                  <summary style={{
                    padding: '18px 22px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '15px',
                    color: 'var(--text)',
                    listStyle: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    userSelect: 'none',
                  }}>
                    {topico.pergunta}
                    <span style={{ fontSize: '18px', color: 'var(--text-faint)', flexShrink: 0, marginLeft: '12px' }}>+</span>
                  </summary>
                  <div style={{
                    padding: '4px 22px 20px',
                    fontSize: '14px',
                    color: 'var(--text-muted)',
                    lineHeight: '1.8',
                    borderTop: '1px solid var(--border)',
                    marginTop: '0',
                    paddingTop: '16px',
                    whiteSpace: 'pre-line',
                  }}>
                    {topico.resposta.split('\n').map((line, li) => {
                      const boldLine = line
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color:var(--primary);font-weight:600;">$1</a>');
                      return (
                        <p key={li} style={{ marginBottom: line === '' ? '8px' : '4px' }}
                          dangerouslySetInnerHTML={{ __html: boldLine }} />
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        {/* CTA final */}
        <div style={{
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          borderRadius: '20px',
          padding: '40px 32px',
          textAlign: 'center',
          marginBottom: '32px',
        }}>
          <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '800', marginBottom: '12px' }}>
            Pronto para simular?
          </h2>
          <p style={{ color: 'rgba(255,255,255,.85)', marginBottom: '24px', fontSize: '15px' }}>
            Use nosso simulador e descubra sua capacidade real de financiamento.
          </p>
          <Link href="/simulador" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: '#fff',
            color: 'var(--primary)',
            padding: '13px 28px',
            borderRadius: '12px',
            fontWeight: '700',
            fontSize: '15px',
            textDecoration: 'none',
          }}>
            Simular agora →
          </Link>
        </div>
      </div>
    </div>
  );
}
