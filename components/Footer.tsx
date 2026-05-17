import Link from 'next/link';

const LINKS = {
  Simuladores: [
    { label: 'Descobrir meu perfil', href: '/simulador' },
    { label: 'Simular imóvel na planta', href: '/simulador/na-planta' },
  ],
  Plataforma: [
    { label: 'Imóveis compatíveis', href: '/imoveis' },
    { label: 'Guia completo', href: '/guia' },
    { label: 'Glossário', href: '/glossario' },
  ],
};

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--bg-card)',
      borderTop: '1px solid var(--border)',
      padding: '48px 24px 32px',
    }}>
      <div className="container" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '40px',
        marginBottom: '40px',
      }}>
        {/* Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '12px' }}>
            <div style={{
              width: '32px', height: '32px',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '15px',
            }}>🏠</div>
            <span style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text)' }}>
              Financie<span style={{ color: 'var(--primary)' }}>Certo</span>
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.7', maxWidth: '240px' }}>
            Plataforma inteligente de descoberta imobiliária baseada na realidade financeira do comprador.
          </p>
        </div>

        {/* Links */}
        {Object.entries(LINKS).map(([title, links]) => (
          <div key={title}>
            <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '14px' }}>
              {title}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{ fontSize: '14px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div style={{
        borderTop: '1px solid var(--border)',
        paddingTop: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <p style={{ fontSize: '13px', color: 'var(--text-faint)' }}>
          © {new Date().getFullYear()} FinancieCerto. Simulações com fins informativos. Não substituem análise bancária.
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-faint)' }}>
          MCMV · SBPE · Crédito Associativo · 2026
        </p>
      </div>
    </footer>
  );
}
