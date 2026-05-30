import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sobre nós — FinancieCerto',
  description: 'Conheça o FinancieCerto: plataforma educativa gratuita sobre financiamento imobiliário criada para ajudar famílias a comprar com informação.',
};

const DIFERENCIAIS = [
  {
    icon: '📊',
    titulo: 'Dados reais, não estimativas vagas',
    texto: 'Nossas simulações usam as taxas e regras reais da Caixa Econômica Federal, Banco do Brasil e demais bancos — atualizadas mensalmente.',
  },
  {
    icon: '🎓',
    titulo: 'Educação antes da decisão',
    texto: 'O financiamento é um dos contratos mais longos da vida financeira de uma família. Acreditamos que compreender o processo antes de assinar é um direito — não um privilégio.',
  },
  {
    icon: '🔓',
    titulo: '100% gratuito, sem cadastro',
    texto: 'Nenhum dado pessoal é exigido para simular. Resultado em menos de 2 minutos, sem anúncios e sem compromisso.',
  },
  {
    icon: '🏙️',
    titulo: '+2.000 empreendimentos em SP',
    texto: 'Portal de imóveis com lançamentos reais filtrados pelo seu perfil financeiro — para você comparar opções antes de visitar um estande.',
  },
];

const PROBLEMAS = [
  'Não sabem qual faixa do MCMV se enquadram ou como compor renda com cônjuge',
  'Não sabem como a parcela é calculada nem o que inclui além dos juros',
  'Não preveem ITBI, cartório e outros custos que não entram no financiamento',
  'Não entendem que os encargos crescem mês a mês durante a obra',
];

export default function SobrePage() {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 16px 80px' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text)', marginBottom: 12, lineHeight: 1.2 }}>
          Comprar com informação<br />é comprar com inteligência
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-faint)', lineHeight: 1.8, maxWidth: 580, margin: '0 auto' }}>
          O FinancieCerto é uma plataforma educativa sobre financiamento imobiliário —
          criada para quem quer entender o processo <strong>antes</strong> de tomar qualquer decisão.
        </p>
      </div>

      {/* O problema */}
      <section style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
          Por que criamos o FinancieCerto?
        </h2>
        <p style={{ fontSize: 15, color: 'var(--text-faint)', lineHeight: 1.8, marginBottom: 20 }}>
          A maioria das pessoas busca imóveis sem nenhuma informação sobre financiamento.
          Compradores chegam à assinatura sem entender pontos fundamentais:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PROBLEMAS.map((p, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 12, padding: '14px 16px',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>❌</span>
              <span style={{ fontSize: 14, color: '#7F1D1D', lineHeight: 1.6 }}>{p}</span>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 20, padding: '16px 20px',
          background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 12,
          fontSize: 14, color: '#166534', lineHeight: 1.7,
        }}>
          <strong>O FinancieCerto não foi criado para assustar — foi criado para preparar.</strong>{' '}
          Conhecer esses pontos antes não impede a compra — permite que ela seja feita com segurança.
        </div>
      </section>

      {/* Diferenciais */}
      <section style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 20 }}>
          O que nos diferencia
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {DIFERENCIAIS.map(({ icon, titulo, texto }) => (
            <div key={titulo} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '20px 22px',
            }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>{titulo}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-faint)', lineHeight: 1.7, margin: 0 }}>{texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Missão */}
      <section style={{
        background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
        border: '1.5px solid #BFDBFE', borderRadius: 16, padding: '32px 28px', marginBottom: 56,
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1E40AF', marginBottom: 12 }}>
          Nossa missão
        </h2>
        <p style={{ fontSize: 15, color: '#1D4ED8', lineHeight: 1.85, margin: 0 }}>
          Traduzir o processo complexo do financiamento imobiliário de forma simples —
          sem perder a precisão técnica. As informações do FinancieCerto foram desenvolvidas
          com base em <strong>contratos reais de financiamento</strong>, diretrizes da
          Caixa Econômica Federal e análise prática do crédito associativo.
        </p>
        <p style={{ fontSize: 13, color: '#3B82F6', marginTop: 16, marginBottom: 0 }}>
          ⚠️ Todas as simulações são estimativas educativas — confirme sempre com a Caixa,
          Banco do Brasil ou um correspondente bancário.
        </p>
      </section>

      {/* O que oferecemos */}
      <section style={{ marginBottom: 56 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 20 }}>
          O que o site oferece
        </h2>
        {[
          { href: '/simulador',          icon: '🧮', titulo: 'Simulador de Perfil',       desc: 'Descubra sua faixa MCMV ou SBPE, poder de compra, parcela e comprometimento de renda.' },
          { href: '/simulador/na-planta', icon: '📐', titulo: 'Simulador na Planta',       desc: 'Simule o fluxo completo da compra na planta: ato, mensais, juros evolutivos e chaves.' },
          { href: '/imoveis',             icon: '🏘️', titulo: 'Portal de Imóveis',         desc: '+2.000 empreendimentos em São Paulo filtrados pelo seu perfil financeiro.' },
          { href: '/guia',                icon: '📘', titulo: 'Guia de Financiamento',     desc: 'Conteúdo educativo em 5 capítulos: modalidades, processo, documentação e FGTS.' },
          { href: '/glossario',           icon: '🔤', titulo: 'Glossário',                 desc: '25+ termos explicados em linguagem simples: TR, SAC, LTV, MIP, ITBI e muito mais.' },
          { href: '/contato',             icon: '✉️', titulo: 'Fale Conosco',              desc: 'Dúvidas, sugestões ou parcerias — respondemos em até 2 dias úteis.' },
        ].map(({ href, icon, titulo, desc }) => (
          <Link key={href} href={href} style={{
            display: 'flex', alignItems: 'flex-start', gap: 14,
            padding: '16px 0', borderBottom: '1px solid var(--border)',
            textDecoration: 'none',
          }}>
            <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)', marginBottom: 3 }}>{titulo} →</div>
              <div style={{ fontSize: 13, color: 'var(--text-faint)', lineHeight: 1.6 }}>{desc}</div>
            </div>
          </Link>
        ))}
      </section>

      {/* CTA */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 15, color: 'var(--text-faint)', marginBottom: 20 }}>
          Pronto para entender seu perfil de compra?
        </p>
        <Link href="/simulador" style={{
          display: 'inline-block', background: 'var(--primary)', color: '#fff',
          borderRadius: 12, padding: '14px 32px', fontSize: 16, fontWeight: 700,
          textDecoration: 'none',
        }}>
          Descobrir meu perfil →
        </Link>
      </div>

    </main>
  );
}
