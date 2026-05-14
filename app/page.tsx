import Link from 'next/link';

export default function Home() {
  return (
    <div style={{ background: 'var(--bg)' }}>

      {/* Hero */}
      <section style={{
        padding: '80px 24px 96px',
        textAlign: 'center',
        maxWidth: '760px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'inline-block',
          background: 'var(--primary-light)',
          color: 'var(--primary)',
          fontSize: '13px',
          fontWeight: '600',
          padding: '4px 14px',
          borderRadius: '99px',
          marginBottom: '24px',
          letterSpacing: '0.3px',
        }}>
          Inteligência financeira para comprar imóvel
        </div>

        <h1 style={{
          fontSize: 'clamp(32px, 5vw, 52px)',
          fontWeight: '700',
          lineHeight: '1.15',
          letterSpacing: '-1px',
          color: 'var(--text)',
          marginBottom: '20px',
        }}>
          Descubra o imóvel certo<br />
          <span style={{ color: 'var(--primary)' }}>para sua realidade financeira</span>
        </h1>

        <p style={{
          fontSize: '18px',
          color: 'var(--text-muted)',
          lineHeight: '1.7',
          marginBottom: '40px',
          maxWidth: '560px',
          margin: '0 auto 40px',
        }}>
          Não é um portal de imóveis comum. É um sistema que interpreta seu perfil,
          calcula sua capacidade real e recomenda apenas imóveis que você consegue financiar.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/simulador" style={{ textDecoration: 'none' }}>
            <button style={{
              background: '#2563eb', color: '#ffffff', border: 'none',
              borderRadius: '12px', padding: '14px 28px', fontSize: '16px',
              fontWeight: '600', cursor: 'pointer', display: 'inline-block',
            }}>
              Descobrir meu perfil →
            </button>
          </Link>
          <Link href="/imoveis" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'transparent', color: '#2563eb',
              border: '1.5px solid #2563eb', borderRadius: '12px',
              padding: '13px 28px', fontSize: '16px', fontWeight: '600',
              cursor: 'pointer', display: 'inline-block',
            }}>
              Ver imóveis
            </button>
          </Link>
        </div>
      </section>

      {/* Como funciona */}
      <section style={{
        padding: '80px 24px',
        background: '#ffffff',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container">
          <p style={{
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--primary)',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}>Como funciona</p>
          <h2 style={{
            textAlign: 'center',
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '56px',
            color: 'var(--text)',
          }}>
            Da renda ao imóvel ideal em minutos
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '32px',
          }}>
            {[
              { num: '01', title: 'Informe sua renda', desc: 'Renda bruta, FGTS disponível e valor de entrada.' },
              { num: '02', title: 'Entenda seu perfil', desc: 'Calculamos quanto banco aprova e qual programa se encaixa.' },
              { num: '03', title: 'Escolha o cenário', desc: 'MCMV ou SBPE, pronto ou na planta — você decide.' },
              { num: '04', title: 'Veja imóveis compatíveis', desc: 'Só aparecem imóveis dentro da sua capacidade real.' },
            ].map((item) => (
              <div key={item.num} style={{ textAlign: 'center' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'var(--primary-light)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  fontSize: '15px',
                  fontWeight: '700',
                  color: 'var(--primary)',
                }}>{item.num}</div>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: 'var(--text)' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '16px', color: 'var(--text)' }}>
          Pronto para descobrir seu perfil?
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '16px' }}>
          Gratuito, sem cadastro, resultado em menos de 2 minutos.
        </p>
        <Link href="/simulador" style={{ textDecoration: 'none' }}>
          <button style={{
            background: '#2563eb', color: '#ffffff', border: 'none',
            borderRadius: '12px', padding: '14px 32px', fontSize: '16px',
            fontWeight: '600', cursor: 'pointer', display: 'inline-block',
          }}>
            Começar agora →
          </button>
        </Link>
      </section>

    </div>
  );
}
