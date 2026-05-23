import Link from 'next/link';

const STATS = [
  { value: '2.000+', label: 'Empreendimentos', href: '/imoveis' },
  { value: 'MCMV · SBPE · SFI', label: 'Todos os perfis de renda', href: '/simulador' },
  { value: '35 anos', label: 'Prazo máximo', href: '/simulador' },
  { value: 'R$ 55k', label: 'Subsídio MCMV máximo', href: '/guia' },
];

const STEPS = [
  {
    num: '01',
    icon: '💰',
    title: 'Informe sua renda',
    desc: 'Renda bruta, FGTS disponível e valor que você tem para entrada.',
  },
  {
    num: '02',
    icon: '🧮',
    title: 'Calculamos seu perfil',
    desc: 'Identificamos seu perfil por renda: MCMV (Faixas 1–4), SBPE ou SFI. Calculamos taxa real, teto e parcela.',
  },
  {
    num: '03',
    icon: '📊',
    title: 'Cenários comparados',
    desc: 'MCMV, SBPE e SFI — pronto ou na planta — com taxas reais 2026 e comparativo Price × SAC.',
  },
  {
    num: '04',
    icon: '🏘️',
    title: 'Imóveis compatíveis',
    desc: 'Exibimos apenas empreendimentos dentro da sua capacidade financeira real.',
  },
];

const FEATURES = [
  {
    icon: '🏠',
    title: 'Simulador de Financiamento 2026',
    desc: 'Do MCMV (Faixas 1–4 · taxas subsidiadas) ao SBPE (11,19% + TR) e SFI — para todos os perfis.',
    color: 'var(--primary-light)',
    textColor: 'var(--primary)',
  },
  {
    icon: '🏗️',
    title: 'Simulador na Planta',
    desc: 'Reproduz o fluxo real da construtora: ato, mensais, reforços e evolução de obra.',
    color: 'var(--accent-light)',
    textColor: 'var(--accent)',
  },
  {
    icon: '🏢',
    title: 'Portal de Imóveis',
    desc: 'Mais de 2.000 empreendimentos da Órulo filtrados pelo seu perfil financeiro.',
    color: 'var(--purple-light)',
    textColor: 'var(--purple)',
  },
  {
    icon: '🤖',
    title: 'Consultor João',
    desc: 'IA especialista em financiamento imobiliário que responde suas dúvidas em segundos.',
    color: 'var(--warning-light)',
    textColor: 'var(--warning)',
  },
  {
    icon: '📘',
    title: 'Guia Completo',
    desc: 'Do processo até o habite-se: documentação, custos, análise de crédito e muito mais.',
    color: 'var(--orange-light)',
    textColor: 'var(--orange)',
  },
  {
    icon: '🔤',
    title: 'Glossário',
    desc: 'ITBI, INCC, MIP, DFI, SFH, SFI — todos os termos explicados de forma simples.',
    color: '#f5f3ff',
    textColor: '#6d28d9',
  },
];

export default function Home() {
  return (
    <div style={{ background: 'var(--bg)' }}>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(160deg, #eff6ff 0%, #fafaf9 55%, #f0fdf4 100%)',
        borderBottom: '1px solid var(--border)',
        padding: 'calc(var(--header-h) + 72px) 24px 80px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: 'rgba(255,255,255,.9)',
            color: 'var(--primary)',
            border: '1px solid rgba(37,99,235,.18)',
            borderRadius: '99px',
            padding: '6px 18px',
            fontSize: '12px',
            fontWeight: '700',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            marginBottom: '32px',
            boxShadow: '0 2px 12px rgba(37,99,235,.08)',
          }}>
            <span>🏠</span> Plataforma inteligente imobiliária · 2026
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 54px)',
            fontWeight: '900',
            lineHeight: '1.1',
            letterSpacing: '-1.5px',
            color: 'var(--text)',
            marginBottom: '22px',
          }}>
            Descubra o imóvel certo{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              display: 'block',
            }}>
              para sua realidade financeira
            </span>
          </h1>

          {/* Subtítulo */}
          <p style={{
            fontSize: '18px',
            color: 'var(--text-muted)',
            lineHeight: '1.75',
            marginBottom: '44px',
            maxWidth: '580px',
            margin: '0 auto 44px',
          }}>
            Não é um portal comum. É um sistema que interpreta seu perfil, calcula sua
            capacidade real e recomenda apenas imóveis que você consegue financiar.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/simulador" className="btn-primary" style={{ fontSize: '16px', padding: '15px 32px' }}>
              Descobrir meu perfil →
            </Link>
            <Link href="/simulador/na-planta" className="btn-outline" style={{ fontSize: '16px', padding: '14px 26px' }}>
              🌱 Simular na planta
            </Link>
            <Link href="/simulador" className="btn-outline" style={{ fontSize: '16px', padding: '14px 26px' }}>
              🏠 Simular pronto
            </Link>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-faint)', marginTop: '16px' }}>
            Gratuito · Sem cadastro · Resultado em menos de 2 minutos
          </p>

          {/* Stats */}
          <div style={{
            display: 'flex',
            gap: '40px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: '56px',
            paddingTop: '40px',
            borderTop: '1px solid rgba(0,0,0,.07)',
          }}>
            {STATS.map((s) => (
              <Link key={s.label} href={s.href} style={{ textAlign: 'center', textDecoration: 'none' }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '900',
                  color: 'var(--primary)',
                  letterSpacing: '-0.5px',
                  lineHeight: 1,
                  marginBottom: '4px',
                }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-faint)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {s.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ───────────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 24px',
        background: '#ffffff',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p className="section-label">Como funciona</p>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: '800', marginBottom: '12px', letterSpacing: '-0.5px' }}>
              Da renda ao imóvel ideal em minutos
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
              Um processo guiado que digitaliza a lógica real da compra imobiliária brasileira.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '32px' }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '8px 4px' }}>
                <div style={{
                  width: '56px', height: '56px',
                  background: 'var(--primary-light)',
                  borderRadius: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 18px',
                  fontSize: '22px',
                }}>
                  {step.icon}
                </div>
                <div style={{
                  fontSize: '11px', fontWeight: '700', color: 'var(--primary)',
                  letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px',
                }}>
                  PASSO {step.num}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: 'var(--text)' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.65' }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: 'var(--bg)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p className="section-label">Tudo em um lugar</p>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: '800', marginBottom: '12px', letterSpacing: '-0.5px' }}>
              Uma plataforma completa
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
              FinancieCerto não é um simulador. É um ecossistema que cobre toda a jornada da compra imobiliária.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="card card-hover" style={{ padding: '24px' }}>
                <div style={{
                  width: '48px', height: '48px',
                  background: f.color,
                  borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px',
                  marginBottom: '16px',
                  overflow: 'hidden',
                }}>
                  {f.title === 'Consultor João'
                    ? <img src="/avatar-joao.png" alt="João" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : f.icon}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: 'var(--text)' }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.65' }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Por que diferente ─────────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 24px',
        background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container-md">
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p className="section-label">Diferencial</p>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: '800', letterSpacing: '-0.5px' }}>
              Por que o FinancieCerto é diferente?
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
            {[
              {
                icon: '🎯',
                title: 'Baseado na realidade',
                desc: 'Taxas reais: MCMV 2026 (subsidiadas), SBPE Caixa (11,19% a.a. + TR) e SFI — não estimativas genéricas.',
              },
              {
                icon: '🏗️',
                title: 'Lógica de construtora',
                desc: 'Reproduzimos o fluxo real da entrada na planta: ato, mensais, sinal, chaves e evolução de obra.',
              },
              {
                icon: '🤖',
                title: 'IA contextual',
                desc: 'O consultor João entende seu perfil e responde com base nos dados da sua simulação.',
              },
            ].map((item, i) => (
              <div key={i} style={{
                background: 'white',
                borderRadius: '16px',
                padding: '28px',
                border: '1px solid rgba(37,99,235,.12)',
                boxShadow: '0 2px 12px rgba(37,99,235,.06)',
              }}>
                <div style={{ fontSize: '28px', marginBottom: '14px', width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.title === 'IA contextual'
                    ? <img src="/avatar-joao.png" alt="João" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : item.icon}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>{item.title}</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.65' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p className="section-label">Comece agora</p>
          <h2 style={{
            fontSize: 'clamp(26px, 3.5vw, 40px)',
            fontWeight: '900',
            letterSpacing: '-1px',
            marginBottom: '16px',
          }}>
            Pronto para descobrir{' '}
            <span className="gradient-text">seu perfil?</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '36px', fontSize: '17px', lineHeight: '1.7' }}>
            Gratuito, sem cadastro e resultado em menos de 2 minutos.
            Nossa inteligência financeira analisa seu perfil e encontra os melhores caminhos.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/simulador" className="btn-primary" style={{ fontSize: '16px', padding: '16px 36px' }}>
              Descobrir meu perfil →
            </Link>
            <Link href="/simulador/na-planta" className="btn-outline" style={{ fontSize: '16px', padding: '15px 24px' }}>
              🌱 Simular na planta
            </Link>
            <Link href="/simulador" className="btn-outline" style={{ fontSize: '16px', padding: '15px 24px' }}>
              🏠 Simular pronto
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
