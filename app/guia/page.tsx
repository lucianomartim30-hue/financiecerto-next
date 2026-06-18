import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Guia Completo de Financiamento Imobiliário | FinancieCerto',
  description: 'Tudo sobre MCMV, SBPE, crédito associativo, documentação, custos e o processo real da compra imobiliária no Brasil.',
};

// Capítulos em ORDEM DE JORNADA — etapa 1 (descobrir modalidade) até etapa 7 (FGTS),
// do momento em que o cliente decide comprar até a entrega das chaves.
const CAPITULOS = [
  {
    id: 'modalidades',
    etapa: 1,
    icon: '🏦',
    titulo: 'Descubra sua Modalidade',
    subtitulo: 'MCMV, SBPE ou SFI — antes de procurar imóvel',
    cor: 'var(--primary)',
    corLight: 'var(--primary-light)',
    topicos: [
      {
        pergunta: 'MCMV, SBPE ou SFI: qual a diferença?',
        resposta: `As três modalidades se dividem por renda e valor do imóvel: **MCMV** (renda até R$ 13.000, 4 faixas, taxas de 4% a 10,5% a.a., subsídio nas Faixas 1 e 2), **SBPE/SFH** (qualquer renda, imóvel até R$ 2,25 milhões, taxa a partir de 11,19% a.a.) e **SFI** (imóvel acima de R$ 2,25 milhões, taxa de mercado, sem FGTS).\n\nVeja o [comparativo completo, com taxas e tetos por faixa](/aprenda/mcmv-sbpe-sfi-qual-modalidade-escolher).`,
      },
    ],
  },
  {
    id: 'documentos',
    etapa: 2,
    icon: '📁',
    titulo: 'Organize sua Documentação',
    subtitulo: 'Separe antes da análise de crédito, que vem antes do contrato e do sinal',
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
    id: 'custos',
    etapa: 3,
    icon: '💰',
    titulo: 'Saiba Quanto Vai Custar',
    subtitulo: 'Entrada, ITBI, cartório e taxas — antes de fechar negócio',
    cor: 'var(--purple)',
    corLight: 'var(--purple-light)',
    topicos: [
      {
        pergunta: 'Quais são os custos além do imóvel?',
        resposta: `ITBI (3% em São Paulo, com isenções importantes no SFH e no MCMV), Registro de Imóveis (0,5% a 1%) e, se a compra for à vista, escritura pública. Reserve entre 2% e 5% do valor do imóvel.\n\nVeja o [detalhamento com exemplo real e a isenção de ITBI que pouca gente usa](/aprenda/custos-comprar-imovel-financiado-itbi-cartorio-taxas).`,
      },
    ],
  },
  {
    id: 'amortizacao',
    etapa: 4,
    icon: '📊',
    titulo: 'Escolha SAC ou Price',
    subtitulo: 'O sistema de amortização — decidido na contratação',
    cor: 'var(--accent)',
    corLight: 'var(--accent-light)',
    topicos: [
      {
        pergunta: 'Qual a diferença entre SAC e Tabela Price?',
        resposta: `No **SAC**, a amortização é fixa e a parcela começa mais alta, mas cai mês a mês. Na **Price**, a parcela é fixa do início ao fim, mas o custo total acaba sendo maior. São as duas modalidades de amortização de qualquer financiamento — MCMV, SBPE, com ou sem crédito associativo.\n\nVeja o [comparativo com exemplo real (1ª parcela, última parcela e total pago)](/aprenda/sac-ou-price-qual-sistema-amortizacao-escolher).`,
      },
    ],
  },
  {
    id: 'assinatura',
    etapa: 5,
    icon: '📋',
    titulo: 'Assine e Passe pela Análise de Crédito',
    subtitulo: 'Do contrato à aprovação do financiamento',
    cor: 'var(--warning)',
    corLight: 'var(--warning-light)',
    topicos: [
      {
        pergunta: 'Qual é o fluxo completo, da assinatura ao habite-se?',
        resposta: `Análise de crédito → contrato com a construtora (ou vendedor), com pagamento do sinal → contrato de financiamento com o banco → obra (se for na planta) → habite-se → financiamento no regime normal. A análise sempre vem antes da assinatura e do sinal — em venda séria, ninguém cobra sinal antes de analisar o crédito.\n\nVeja o [fluxo completo, com prazos e o que pode travar](/aprenda/credito-associativo-como-funciona-comprar-na-planta).`,
      },
      {
        pergunta: 'Quem recebe o quê: construtora x banco?',
        resposta: `No crédito associativo (MCMV), você paga em duas frentes: à **construtora** (ato, mensais, sinais/reforços, anuais e chaves) e ao **banco** (juros de evolução de obra, sobre o saldo já liberado). Já no SBPE, você paga só a construtora durante a obra — o contrato com o banco só é assinado depois da entrega das chaves.\n\nVeja a [comparação completa dos dois fluxos](/aprenda/credito-associativo-como-funciona-comprar-na-planta).`,
      },
    ],
  },
  {
    id: 'planta',
    etapa: 6,
    opcional: true,
    icon: '🏗️',
    titulo: 'Durante a Obra',
    subtitulo: 'Juros de evolução — só se você comprou na planta',
    cor: 'var(--accent)',
    corLight: 'var(--accent-light)',
    topicos: [
      {
        pergunta: 'O que são os juros de evolução de obra?',
        resposta: `Durante a obra, a Caixa Econômica Federal não entrega o valor financiado de uma vez para a construtora — ela libera aos poucos, conforme a obra avança. Você paga juros só sobre o que **já foi liberado**, não sobre o financiamento total.\n\n**Fórmula:** juros do mês = saldo já liberado × (taxa anual ÷ 12)\n\nPor isso a parcela começa baixa (quase nada liberado) e cresce mês a mês, até atingir o teto quando a obra é entregue (habite-se) — momento em que o financiamento entra no regime normal, com amortização. A taxa mensal equivalente varia por modalidade: Faixa 1 ≈ 0,33% a.m., Faixa 3 ≈ 0,64% a.m., SBPE ≈ 0,93% a.m.\n\nVeja o [exemplo completo, mês a mês, com valores reais](/aprenda/juros-evolucao-obra).`,
      },
    ],
  },
  {
    id: 'fgts',
    etapa: 7,
    icon: '💼',
    titulo: 'Use o FGTS a seu Favor',
    subtitulo: 'Na entrada, na amortização ou nas parcelas',
    cor: 'var(--orange)',
    corLight: 'var(--orange-light)',
    topicos: [
      {
        pergunta: 'Quando posso usar o FGTS e ele reduz a taxa de juros?',
        resposta: `Precisa de 3 anos de contribuição (elegibilidade), mas atenção: se já usou o FGTS numa compra antes, há um intervalo de 3 anos para usar de novo, e 2 anos entre amortizações no mesmo contrato. Imóvel precisa estar dentro do teto SFH (R$ 2,25 milhões). No MCMV, ser cotista reduz a taxa — mas o maior ganho é reduzir o valor financiado.\n\nVeja as [regras completas de carência e um exemplo real de quanto você economiza](/aprenda/como-usar-fgts-no-financiamento).`,
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
            As 7 etapas, em ordem, do momento em que você decide comprar até o dia em que assina
            o financiamento e recebe as chaves.
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
                {cap.icon} {cap.etapa}. {cap.titulo}
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
                <span style={{ fontSize: '11px', fontWeight: '800', color: cap.cor, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Etapa {cap.etapa}{cap.opcional ? ' · se for na planta' : ''}
                </span>
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
