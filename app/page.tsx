import Link from 'next/link';
import SchemaMarkup from '@/components/SchemaMarkup';
import { website, organization, breadcrumb, SITE_CONFIG } from '@/lib/schema';
import { HomeEngagement } from './HomeEngagement';
import { getImoveisDestaque, getImoveisDestaqueLesteNorte, type ImovelDestaque } from '@/lib/imoveis-destaque';
import { formatPlantaPreco } from '@/lib/calculos';
import { getStatusCfg } from '@/lib/status';

// Sem isso a home fica presa no snapshot do catálogo do último deploy —
// imóvel vendido, preço mudado ou erro de cadastro corrigido na Orulo só
// apareceria aqui depois do próximo `git push`. Revalida a cada hora.
export const revalidate = 3600;

const STATS = [
  { value: '4.000+', label: 'Empreendimentos', href: '/imoveis' },
  { value: 'MCMV · SBPE · SFI', label: 'Todos os perfis de renda', href: '/simulador' },
  { value: '35 anos', label: 'Prazo máximo', href: '/simulador' },
  { value: 'R$ 190k a 34mi', label: 'Do econômico ao alto padrão', href: '/imoveis' },
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
    icon: '🏠',
    title: 'Imóveis Minha Casa Minha Vida',
    desc: 'Mais de 150 mil unidades dentro do teto do MCMV, da Faixa 1 à Faixa 4.',
    color: '#dcfce7',
    textColor: '#16a34a',
    href: '/imoveis/minha-casa-minha-vida',
    badge: 'Novo',
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
    desc: 'Mais de 4.000 empreendimentos da Órulo filtrados pelo seu perfil financeiro.',
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

// ── Vitrine de imóveis em destaque — reaproveitada pra Zona Sul/Oeste/Centro
// (foco principal) e Zona Leste/Norte (segunda vitrine) ───────────────────────
function DestaqueSection({
  label, titulo, subtitulo, imoveis, links, bordered,
}: {
  label: string; titulo: string; subtitulo: string;
  imoveis: ImovelDestaque[];
  links: { href: string; texto: string }[];
  bordered?: boolean;
}) {
  if (imoveis.length === 0) return null;
  return (
    <section style={{ padding: '80px 24px', background: '#ffffff', borderBottom: bordered ? '1px solid var(--border)' : undefined }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p className="section-label">{label}</p>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: '800', marginBottom: '12px', letterSpacing: '-0.5px' }}>
            {titulo}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '500px', margin: '0 auto' }}>
            {subtitulo}
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {imoveis.map(im => {
            const cfg = getStatusCfg(im.status_norm || '');
            return (
              <Link key={im.id} href={`/imoveis/${im.id}`} className="card card-hover" style={{ overflow: 'hidden', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', width: '100%', paddingTop: '62%', background: '#0f2744' }}>
                  {im.photo && (
                    <img src={im.photo} alt={im.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  <span style={{ position: 'absolute', top: '7px', left: '7px', background: cfg.cor, color: '#fff', fontSize: '9px', fontWeight: '800', padding: '3px 7px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    {cfg.label}
                  </span>
                </div>
                <div style={{ padding: '16px' }}>
                  <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {im.name}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-faint)', marginBottom: '10px' }}>
                    📍 {im.neighborhood}, São Paulo
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: '900', color: 'var(--primary)' }}>
                    {formatPlantaPreco(im.area_min, im.area_max, im.min_price)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
        <div style={{ textAlign: 'center', marginTop: '36px' }}>
          {links.map(l => (
            <Link key={l.href} href={l.href} className="btn-outline" style={{ marginRight: '12px', marginBottom: '8px' }}>{l.texto} →</Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function Home() {
  const [destaques, destaquesLesteNorte] = await Promise.all([
    getImoveisDestaque(12),
    getImoveisDestaqueLesteNorte(12),
  ]);
  const schemas = [
    website,
    organization,
    breadcrumb([
      { name: 'Início', url: SITE_CONFIG.domain },
    ]),
  ];

  return (
    <div style={{ background: 'var(--bg)' }}>
      <HomeEngagement />
      <SchemaMarkup schemas={schemas} />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)',
        borderBottom: '1px solid rgba(255,255,255,.08)',
        padding: '72px 24px 80px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: 'rgba(255,255,255,.1)',
            color: '#93c5fd',
            border: '1px solid rgba(255,255,255,.15)',
            borderRadius: '99px',
            padding: '6px 18px',
            fontSize: '12px',
            fontWeight: '700',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            marginBottom: '32px',
          }}>
            <span>🏠</span> Plataforma inteligente imobiliária · 2026
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 54px)',
            fontWeight: '900',
            lineHeight: '1.1',
            letterSpacing: '-1.5px',
            color: '#fff',
            marginBottom: '22px',
          }}>
            Descubra o imóvel certo{' '}
            <span style={{
              background: 'linear-gradient(135deg, #60a5fa, #34d399)',
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
            color: '#cbd5e1',
            lineHeight: '1.75',
            marginBottom: '44px',
            maxWidth: '580px',
            margin: '0 auto 44px',
          }}>
            Não é um portal comum. É um sistema que interpreta seu perfil, calcula sua
            capacidade real e recomenda apenas imóveis que você consegue financiar — de econômicos a médio e alto padrão.
          </p>

          {/* CTAs — dois caminhos com a mesma importância */}
          <div className="home-ctas" style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/simulador" className="btn-primary" data-track="simulador" style={{ fontSize: '16px', padding: '15px 32px' }}>
              Descobrir meu perfil →
            </Link>
            <Link href="/imoveis" className="btn-primary-green" data-track="imoveis" style={{ fontSize: '16px', padding: '15px 32px' }}>
              🏠 Ver imóveis disponíveis →
            </Link>
          </div>

          {/* Sub-opções do simulador */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '14px' }}>
            <Link href="/simulador/na-planta" className="btn-outline" style={{ fontSize: '14px', padding: '10px 20px' }}>
              📐 Simular na planta
            </Link>
            <Link href="/simulador" className="btn-outline" style={{ fontSize: '14px', padding: '10px 20px' }}>
              🏠 Simular pronto
            </Link>
          </div>

          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.5)', marginTop: '16px' }}>
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
            borderTop: '1px solid rgba(255,255,255,.1)',
          }}>
            {STATS.map((s) => (
              <Link key={s.label} href={s.href} style={{ textAlign: 'center', textDecoration: 'none' }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '900',
                  color: '#60a5fa',
                  letterSpacing: '-0.5px',
                  lineHeight: 1,
                  marginBottom: '4px',
                }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.5)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {s.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Imóveis em destaque (Zona Sul/Oeste/Centro) ───────────────────────── */}
      <DestaqueSection
        label="Selecionados pra você"
        titulo="Imóveis em destaque na Zona Sul, Oeste e Centro"
        subtitulo="Empreendimentos de São Paulo já com simulação de financiamento pronta."
        imoveis={destaques}
        bordered
        links={[
          { href: '/regiao/zona-sul-sp', texto: 'Ver mais na Zona Sul' },
          { href: '/regiao/zona-oeste-sp', texto: 'Ver mais na Zona Oeste' },
          { href: '/regiao/centro-sp', texto: 'Ver mais no Centro' },
          { href: '/imoveis/minha-casa-minha-vida', texto: 'Ver imóveis MCMV' },
        ]}
      />

      {/* ── Imóveis em destaque (Zona Leste/Norte) ────────────────────────────── */}
      <DestaqueSection
        label="Mais opções em SP"
        titulo="Imóveis em destaque na Zona Leste e Norte"
        subtitulo="Empreendimentos de São Paulo já com simulação de financiamento pronta."
        imoveis={destaquesLesteNorte}
        bordered
        links={[
          { href: '/regiao/zona-leste-sp', texto: 'Ver mais na Zona Leste' },
          { href: '/regiao/zona-norte-sp', texto: 'Ver mais na Zona Norte' },
        ]}
      />

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
            {FEATURES.map((f, i) => {
              const inner = (
                <>
                  {f.badge && (
                    <span style={{ position: 'absolute', top: '16px', right: '16px', background: f.textColor, color: '#fff', fontSize: '10px', fontWeight: '800', padding: '3px 9px', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      {f.badge}
                    </span>
                  )}
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
                </>
              );
              return f.href ? (
                <Link key={i} href={f.href} className="card card-hover" style={{ padding: '24px', textDecoration: 'none', color: 'inherit', display: 'block', position: 'relative' }}>
                  {inner}
                </Link>
              ) : (
                <div key={i} className="card card-hover" style={{ padding: '24px', position: 'relative' }}>
                  {inner}
                </div>
              );
            })}
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
            Pronto para <span className="gradient-text">começar?</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '36px', fontSize: '17px', lineHeight: '1.7' }}>
            Gratuito, sem cadastro e resultado em menos de 2 minutos.
            Descubra seu perfil financeiro ou já vá direto aos imóveis disponíveis.
          </p>
          <div className="home-ctas" style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/simulador" className="btn-primary" data-track="simulador" style={{ fontSize: '16px', padding: '16px 36px' }}>
              Descobrir meu perfil →
            </Link>
            <Link href="/imoveis" className="btn-primary-green" data-track="imoveis" style={{ fontSize: '16px', padding: '16px 36px' }}>
              🏠 Ver imóveis disponíveis →
            </Link>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '14px' }}>
            <Link href="/simulador/na-planta" className="btn-outline" style={{ fontSize: '14px', padding: '10px 20px' }}>
              📐 Simular na planta
            </Link>
            <Link href="/simulador" className="btn-outline" style={{ fontSize: '14px', padding: '10px 20px' }}>
              🏠 Simular pronto
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
