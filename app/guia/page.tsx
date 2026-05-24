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
        pergunta: 'O que é o Minha Casa Minha Vida (MCMV)?',
        resposta: `O MCMV é o programa habitacional do governo federal, operado principalmente pela Caixa Econômica Federal e pelo Banco do Brasil. Ele é dividido em 4 faixas conforme a renda familiar bruta:\n\n• **Faixa 1** (até R$ 3.200/mês): taxa a partir de 4,00% a.a. + TR. Subsídio de até R$ 55.000. Teto do imóvel em São Paulo: R$ 275.000.\n• **Faixa 2** (até R$ 5.000/mês): taxa de 4,75% a 7,00% a.a. + TR. Subsídio de até R$ 29.000. Teto: R$ 275.000 (SP).\n• **Faixa 3** (até R$ 9.600/mês): taxa de 7,66% a 8,16% a.a. + TR. Sem subsídio. Teto: R$ 400.000 (SP).\n• **Faixa 4** (até R$ 13.000/mês): taxa de 9,00% a 10,50% a.a. + TR. Sem subsídio. Teto: R$ 600.000 (SP).\n\nRenda acima de R$ 13.000: use SBPE.`,
      },
      {
        pergunta: 'O que é o SBPE / SFH?',
        resposta: `O SBPE (Sistema Brasileiro de Poupança e Empréstimo) financia imóveis com recursos das cadernetas de poupança. Dentro do SBPE, o SFH (Sistema Financeiro de Habitação) cobre imóveis até R$ 1,5 milhão, com taxa média de 10,5% a.a. Para imóveis acima desse valor, aplica-se o SFI (Sistema Financeiro Imobiliário), com taxas um pouco mais elevadas.\n\nNo SBPE/SFH você pode usar FGTS para amortizar o saldo devedor, reduzindo parcelas ou prazo.`,
      },
      {
        pergunta: 'Qual a diferença entre SAC e Tabela Price?',
        resposta: `**SAC (Sistema de Amortização Constante):** a amortização do saldo é fixa todo mês. Com isso, os juros diminuem progressivamente e a parcela começa mais alta, mas vai caindo ao longo do tempo. É a modalidade mais comum no mercado brasileiro.\n\n**Tabela Price:** a parcela é sempre a mesma do início ao fim. Porém, no início a maior parte é juros e uma fatia pequena é amortização. Isso significa que o saldo devedor cai mais devagar no começo. Vantagem: previsibilidade; desvantagem: custo total tende a ser maior.`,
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
        resposta: `No crédito associativo (principal modelo MCMV/HIS), o financiamento é assinado **antes ou durante a obra**. A Caixa Econômica Federal Econômica Federal libera recursos conforme medições de avanço da obra.\n\nO comprador paga os chamados **juros de evolução de obra** mensalmente, sobre o saldo liberado pela Caixa Econômica Federal até aquele momento. Quanto mais avançada a obra, maior o saldo liberado e, portanto, maior a parcela de evolução.\n\nAo término da obra (habite-se), o financiamento entra em seu regime normal de amortização.`,
      },
      {
        pergunta: 'O que são os juros de evolução de obra?',
        resposta: `São os juros pagos mensalmente sobre o saldo já liberado pela Caixa Econômica Federal para a construtora. Funciona assim:\n\n• Obra 0% → saldo liberado = 0 → evolução = R$ 0\n• Obra 30% → saldo liberado ≈ R$ 60.000 → evolução ≈ R$ 370/mês (MCMV F1)\n• Obra 70% → saldo liberado ≈ R$ 140.000 → evolução ≈ R$ 870/mês\n• Obra 100% → financiamento entra em regime normal\n\nA taxa varia: Faixa 1 ≈ 0,4% a.m., Faixa 3 ≈ 0,62% a.m., SBPE ≈ 0,83% a.m.`,
      },
      {
        pergunta: 'Qual é o fluxo de pagamento típico da construtora?',
        resposta: `A construtora normalmente estrutura o pagamento durante a obra assim:\n\n• **Ato:** valor pago na assinatura do contrato (geralmente 5% a 10%)\n• **Mensais:** parcelas fixas mensais durante a obra\n• **Sinais/Reforços:** pagamentos em datas específicas (ex: a cada 6 meses)\n• **Anuais:** parcelas anuais mais pesadas\n• **Chaves:** parcela maior na entrega, antes do financiamento bancário entrar\n• **Evolução de obra:** pago ao banco (Caixa Econômica Federal), não à construtora\n\nO saldo restante na entrega das chaves é financiado pela Caixa Econômica Federal no prazo escolhido.`,
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
        resposta: `**1. SICAQ (análise de crédito):** A construtora submete os dados do comprador para análise pela Caixa Econômica Federal. O comprador descobre sua capacidade de crédito aprovada.\n\n**2. Assinatura do Contrato de Compra e Venda:** entre comprador e construtora, definindo o imóvel, valor e condições.\n\n**3. Assinatura do Contrato de Financiamento:** entre comprador e Caixa Econômica Federal. O financiamento está formalmente contratado.\n\n**4. Início da obra + evolução:** Caixa Econômica Federal libera recursos conforme medições. Comprador paga juros de evolução mensalmente.\n\n**5. Habite-se + entrega:** obra concluída, comprador recebe as chaves e o financiamento entra em regime normal.`,
      },
      {
        pergunta: 'Quando o banco faz a análise de crédito?',
        resposta: `No MCMV, a análise é feita antes mesmo da assinatura do contrato, via SICAQ. Isso garante que o comprador já sabe que está aprovado antes de se comprometer.\n\nNo SBPE com imóvel pronto, a análise ocorre quando o comprador apresenta a proposta ao banco. É preciso ter os documentos em ordem: renda comprovada, certidões negativas, sem restrições no CPF.`,
      },
      {
        pergunta: 'Quais são os custos além do imóvel?',
        resposta: `Ao comprar um imóvel, você precisa reservar:\n\n• **ITBI (Imposto sobre Transmissão de Bens Imóveis):** 2% do valor do imóvel em São Paulo (pode variar por município). No MCMV, pode ter isenção ou redução.\n• **Cartório (escritura + registro):** aproximadamente 1% do valor do imóvel (inclui emolumentos e registro)\n• **Correspondente bancário/despachante:** R$ 1.000 a R$ 3.000 (opcional mas comum)\n• **Seguros MIP e DFI:** obrigatórios no financiamento, cobrados mensalmente na parcela\n• **Taxa administrativa:** R$ 25/mês cobrada na parcela\n\nTotal de custos de aquisição: reserve entre 3% e 5% do valor do imóvel.`,
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
        pergunta: 'Quais documentos o trabalhador CLT precisa?',
        resposta: `Para trabalhador com carteira assinada:\n\n**Pessoais:**\n• RG e CPF (ou CNH)\n• Comprovante de estado civil (certidão de nascimento ou casamento)\n• Comprovante de endereço (últimos 90 dias)\n\n**De renda:**\n• Holerite dos últimos 3 meses\n• Declaração de IR (último exercício)\n• Extrato do FGTS (se for usar)\n\n**Do imóvel (para imóvel pronto):**\n• Matrícula atualizada do imóvel\n• IPTU\n• Cópia do compromisso de compra e venda`,
      },
      {
        pergunta: 'E para autônomo ou MEI?',
        resposta: `Para autônomo:\n• Declaração de IR dos últimos 2 anos\n• Extrato bancário dos últimos 6 meses\n• Decore (Declaração Comprobatória de Percepção de Rendimentos) assinada por contador\n\nPara MEI:\n• CNPJ ativo há pelo menos 2 anos\n• Declaração Anual do MEI (DASN)\n• Extrato bancário PJ dos últimos 6 meses\n• Declaração de IR PF\n\nImportante: bancos costumam aceitar 70% a 80% da renda do autônomo para fins de comprometimento.`,
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
        background: 'linear-gradient(160deg, #eff6ff 0%, #fafaf9 60%, #f0fdf4 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '64px 24px 72px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <p className="section-label">Educação Financeira</p>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: '900', letterSpacing: '-1px', marginBottom: '16px' }}>
            Guia Completo de Financiamento
          </h1>
          <p style={{ fontSize: '17px', color: 'var(--text-muted)', lineHeight: '1.7', maxWidth: '540px', margin: '0 auto 32px' }}>
            Tudo que você precisa saber sobre o processo real da compra imobiliária no Brasil —
            do MCMV ao habite-se.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/simulador" className="btn-primary">
              Simular agora →
            </Link>
            <Link href="/glossario" className="btn-outline">
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
                    {topico.resposta.replace(/\*\*(.*?)\*\*/g, '**$1**').split('\n').map((line, li) => {
                      const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
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
