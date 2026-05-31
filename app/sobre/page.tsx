import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sobre nós — FinancieCerto',
  description: 'O FinancieCerto é a plataforma que coloca seu perfil financeiro antes do imóvel. Simulação, portal de imóveis, educação e IA — tudo integrado para a jornada completa do comprador.',
};

export default function SobrePage() {
  return (
    <main>

      {/* ── SEÇÃO 1 — HERO ─────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)',
        padding: '80px 24px 72px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 999,
            padding: '6px 18px',
            fontSize: 12,
            fontWeight: 700,
            color: '#93c5fd',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: 28,
          }}>
            Plataforma imobiliária educacional
          </div>

          <h1 style={{
            fontSize: 'clamp(26px, 5vw, 44px)',
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1.15,
            marginBottom: 24,
          }}>
            O mercado imobiliário tem muitos portais.<br />
            <span style={{ color: '#60a5fa' }}>Nenhum deles começa pela sua realidade financeira.</span>
          </h1>

          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)',
            color: '#cbd5e1',
            lineHeight: 1.8,
            maxWidth: 600,
            margin: '0 auto 40px',
          }}>
            O FinancieCerto é a plataforma que coloca seu perfil financeiro antes do imóvel —
            para que você compre com segurança, não com surpresas.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/simulador" style={{
              background: '#2563eb', color: '#fff',
              borderRadius: 12, padding: '14px 28px',
              fontSize: 15, fontWeight: 700, textDecoration: 'none',
              border: '2px solid #3b82f6',
            }}>
              Descobrir meu perfil →
            </Link>
            <Link href="/imoveis" style={{
              background: 'rgba(255,255,255,0.08)', color: '#fff',
              borderRadius: 12, padding: '14px 28px',
              fontSize: 15, fontWeight: 700, textDecoration: 'none',
              border: '2px solid rgba(255,255,255,0.2)',
            }}>
              Explorar imóveis →
            </Link>
          </div>
        </div>
      </section>

      {/* ── SEÇÃO 2 — ORIGEM ───────────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 16 }}>
            Por que existimos
          </div>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 900, color: 'var(--text)', lineHeight: 1.2, marginBottom: 28 }}>
            Nascemos de uma constatação incômoda.
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ fontSize: 16, color: 'var(--text-faint)', lineHeight: 1.85, margin: 0 }}>
              As melhores informações sobre financiamento imobiliário existiam dispersas: simuladores de banco
              com letras miúdas, planilhas complicadas, documentos técnicos da Caixa Econômica Federal que
              ninguém conseguia decifrar. Nenhuma delas era acessível, gratuita e — principalmente — <strong style={{ color: 'var(--text)' }}>neutra</strong>.
            </p>
            <p style={{ fontSize: 16, color: 'var(--text-faint)', lineHeight: 1.85, margin: 0 }}>
              Portais imobiliários têm interesse na transação. Bancos têm interesse no crédito.
              O FinancieCerto tem interesse em apenas uma coisa:
            </p>
            <div style={{
              borderLeft: '4px solid #2563eb',
              paddingLeft: 24,
              margin: '8px 0',
            }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>
                "Que você chegue à assinatura preparado."
              </p>
            </div>
            <p style={{ fontSize: 16, color: 'var(--text-faint)', lineHeight: 1.85, margin: 0 }}>
              Por isso construímos uma plataforma completa — com simuladores reais, portal de imóveis filtrado
              por perfil financeiro, guia educativo e um consultor de inteligência artificial disponível 24 horas.
              Tudo gratuito. Tudo sem cadastro. Tudo sem conflito de interesse.
            </p>
          </div>
        </div>
      </section>

      {/* ── SEÇÃO 3 — PROBLEMA ─────────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-card)', padding: '72px 24px', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 16 }}>
            O problema que resolvemos
          </div>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 900, color: 'var(--text)', lineHeight: 1.2, marginBottom: 16 }}>
            O financiamento é a decisão mais longa da vida financeira de uma família.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-faint)', lineHeight: 1.85, marginBottom: 40 }}>
            Um contrato de até 35 anos, que compromete mais de 30% da renda mensal, com custos que
            aparecem apenas na hora da assinatura. E mesmo assim, a maioria das pessoas começa essa
            jornada pelo lugar errado: <strong style={{ color: 'var(--text)' }}>pelo imóvel</strong>.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[
              {
                n: '01',
                titulo: 'Sem clareza sobre o perfil',
                texto: 'A maioria dos compradores não sabe em qual faixa do MCMV se enquadra, como compor renda com cônjuge ou quanto de FGTS pode usar na entrada.',
              },
              {
                n: '02',
                titulo: 'Parcela calculada errado',
                texto: 'A parcela real inclui juros, amortização, seguro obrigatório (MIP e DFI) e TAC. Simuladores de banco raramente mostram o custo total efetivo.',
              },
              {
                n: '03',
                titulo: 'Custos invisíveis',
                texto: 'ITBI (2%) e cartório (≈1%) não entram no financiamento. Somam entre 3% e 5% do valor do imóvel — e aparecem apenas no final do processo.',
              },
              {
                n: '04',
                titulo: 'Obra sem previsibilidade',
                texto: 'Na compra na planta, os encargos de evolução de obra crescem mês a mês antes de qualquer amortização. Poucos compradores sabem disso antes de assinar.',
              },
            ].map(({ n, titulo, texto }) => (
              <div key={n} style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '24px 20px',
              }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#dc2626', marginBottom: 10, opacity: 0.6 }}>{n}</div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>{titulo}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-faint)', lineHeight: 1.7, margin: 0 }}>{texto}</p>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 32, padding: '20px 24px',
            background: '#f0fdf4', border: '1.5px solid #86efac',
            borderRadius: 14, fontSize: 15, color: '#166534', lineHeight: 1.7,
          }}>
            <strong>O FinancieCerto não foi criado para assustar — foi criado para preparar.</strong>{' '}
            Conhecer esses pontos antes não impede a compra. Permite que ela seja feita com segurança.
          </div>
        </div>
      </section>

      {/* ── SEÇÃO 4 — COMO FUNCIONA ────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 16 }}>
              A jornada completa
            </div>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 900, color: 'var(--text)', lineHeight: 1.2, marginBottom: 16 }}>
              Como funciona o FinancieCerto
            </h2>
            <p style={{ fontSize: 16, color: 'var(--text-faint)', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
              Uma plataforma que acompanha toda a sua jornada — do primeiro cálculo até a decisão final.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              {
                n: '1',
                icon: '🧮',
                titulo: 'Descobrir o perfil',
                desc: 'Informe renda bruta familiar, FGTS disponível e entrada. O sistema calcula sua faixa MCMV ou SBPE, poder de compra real, comprometimento de renda e subsídio disponível.',
                link: '/simulador',
                label: 'Acessar simulador',
              },
              {
                n: '2',
                icon: '📊',
                titulo: 'Entender a capacidade financeira',
                desc: 'Simule MCMV Faixas 1 a 4, SBPE e crédito associativo na planta. Veja parcela estimada (SAC e Price), saldo devedor, juros evolutivos e custo total do financiamento.',
                link: '/simulador/na-planta',
                label: 'Simular na planta',
              },
              {
                n: '3',
                icon: '🏘️',
                titulo: 'Encontrar imóveis compatíveis',
                desc: 'Mais de 2.000 empreendimentos em São Paulo filtrados automaticamente pelo seu perfil — sem desperdiçar tempo com imóveis fora do seu alcance real.',
                link: '/imoveis',
                label: 'Ver imóveis',
              },
              {
                n: '4',
                icon: '📐',
                titulo: 'Comparar opções',
                desc: 'Simule o financiamento na planta com o cronograma real: ato, mensais à construtora, reforços, juros evolutivos mês a mês e parcelas pós-chaves.',
                link: '/simulador/na-planta',
                label: 'Comparar simulações',
              },
              {
                n: '5',
                icon: '💬',
                titulo: 'Tirar dúvidas',
                desc: 'O Guia completo cobre 5 capítulos: modalidades, processo de compra, documentação, FGTS e imóvel na planta. O Glossário explica mais de 25 termos em linguagem simples. O consultor João responde por IA a qualquer hora.',
                link: '/guia',
                label: 'Acessar o guia',
              },
              {
                n: '6',
                icon: '✅',
                titulo: 'Tomar a decisão',
                desc: 'Com simulações reais, imóveis compatíveis com seu orçamento e conhecimento suficiente sobre o processo, você chega à assinatura sabendo exatamente o que está comprando.',
                link: null,
                label: null,
              },
            ].map(({ n, icon, titulo, desc, link, label }, i, arr) => (
              <div key={n} style={{ display: 'flex', gap: 0, position: 'relative' }}>
                {/* Linha vertical conectora */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 56, flexShrink: 0 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: '#2563eb', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 900, flexShrink: 0, zIndex: 1,
                  }}>
                    {n}
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: '#e2e8f0', minHeight: 32, margin: '4px 0' }} />
                  )}
                </div>

                {/* Conteúdo */}
                <div style={{ paddingBottom: i < arr.length - 1 ? 32 : 0, paddingLeft: 20, flex: 1, paddingTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{icon}</span>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{titulo}</h3>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-faint)', lineHeight: 1.75, margin: 0, marginBottom: link ? 12 : 0 }}>
                    {desc}
                  </p>
                  {link && label && (
                    <Link href={link} style={{
                      fontSize: 13, fontWeight: 700, color: 'var(--primary)',
                      textDecoration: 'none',
                    }}>
                      {label} →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 48, padding: '20px 24px', textAlign: 'center',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14,
          }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              O FinancieCerto não é um portal de imóveis. Não é um simulador isolado.
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-faint)', margin: '6px 0 0' }}>
              É a plataforma que acompanha toda a jornada do comprador — da primeira dúvida até a assinatura.
            </p>
          </div>
        </div>
      </section>

      {/* ── SEÇÃO 5 — NÚMEROS ──────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
        padding: '72px 24px',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#60a5fa', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 16 }}>
              Em números
            </div>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 900, color: '#fff', margin: 0 }}>
              Uma plataforma construída com rigor.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
            {[
              { numero: '+2.000', desc: 'Empreendimentos catalogados em São Paulo' },
              { numero: '5', desc: 'Modalidades cobertas: MCMV F1, F2, F3, F4 e SBPE' },
              { numero: '5 capítulos', desc: 'No Guia completo de financiamento imobiliário' },
              { numero: '+25 termos', desc: 'Explicados no Glossário em linguagem simples' },
              { numero: 'Mensal', desc: 'Frequência de atualização das taxas e regras vigentes' },
            ].map(({ numero, desc }) => (
              <div key={numero} style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14, padding: '24px 20px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 900, color: '#60a5fa', marginBottom: 8 }}>
                  {numero}
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEÇÃO 6 — DIFERENCIAIS ─────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg)', padding: '72px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 16 }}>
              Diferenciação
            </div>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 900, color: 'var(--text)', lineHeight: 1.2, marginBottom: 16 }}>
              O que nos torna diferentes
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-faint)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
              A maioria das plataformas começa pelo imóvel. O FinancieCerto começa por você.
            </p>
          </div>

          {/* Tabela comparativa */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {['', 'Portais de anúncios', 'Sites de banco', 'FinancieCerto'].map((h, i) => (
                    <th key={h} style={{
                      padding: '14px 16px',
                      textAlign: i === 0 ? 'left' : 'center',
                      fontWeight: 800,
                      fontSize: 13,
                      color: i === 3 ? '#1d4ed8' : 'var(--text-faint)',
                      background: i === 3 ? '#EFF6FF' : 'var(--bg-card)',
                      borderBottom: '2px solid var(--border)',
                      borderRight: i < 3 ? '1px solid var(--border)' : 'none',
                      borderRadius: i === 3 ? '12px 12px 0 0' : 0,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Ponto de partida', 'O imóvel', 'O crédito', 'Seu perfil financeiro'],
                  ['Interesse na transação', 'Direto', 'Direto', 'Nenhum'],
                  ['Simulação MCMV e SBPE', '—', 'Parcial', '✅ Completa'],
                  ['Simulação na planta com juros evolutivos', '—', '—', '✅ Sim'],
                  ['Imóveis filtrados por perfil real', '—', '—', '✅ Sim'],
                  ['Guia educativo e glossário', '—', '—', '✅ Sim'],
                  ['Consultor por IA', '—', '—', '✅ Sim'],
                  ['Custo para o usuário', 'Gratuito', 'Gratuito', '✅ Gratuito'],
                ].map(([criterio, portal, banco, fc], ri) => (
                  <tr key={criterio} style={{ background: ri % 2 === 0 ? 'var(--bg)' : 'var(--bg-card)' }}>
                    <td style={{ padding: '13px 16px', fontWeight: 600, color: 'var(--text)', borderRight: '1px solid var(--border)' }}>{criterio}</td>
                    <td style={{ padding: '13px 16px', textAlign: 'center', color: 'var(--text-faint)', borderRight: '1px solid var(--border)' }}>{portal}</td>
                    <td style={{ padding: '13px 16px', textAlign: 'center', color: 'var(--text-faint)', borderRight: '1px solid var(--border)' }}>{banco}</td>
                    <td style={{ padding: '13px 16px', textAlign: 'center', fontWeight: 700, color: '#1d4ed8', background: '#EFF6FF' }}>{fc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── SEÇÃO 7 — VISÃO ────────────────────────────────────────────────── */}
      <section style={{ background: 'var(--bg-card)', padding: '72px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 16 }}>
            Nossa visão
          </div>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 900, color: 'var(--text)', lineHeight: 1.2, marginBottom: 32 }}>
            A compra de um imóvel não deveria ser uma aposta.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-faint)', lineHeight: 1.9, marginBottom: 24 }}>
            Ela deveria ser uma decisão informada — com simulações que refletem a realidade,
            imóveis que cabem no orçamento e informação suficiente para negociar com segurança.
          </p>
          <p style={{ fontSize: 16, color: 'var(--text-faint)', lineHeight: 1.9, marginBottom: 0 }}>
            Enquanto o mercado muda, o FinancieCerto continua: atualizando taxas mensalmente,
            expandindo o catálogo de imóveis e aprofundando as ferramentas para que cada família
            chegue à assinatura <strong style={{ color: 'var(--text)' }}>preparada</strong>.
          </p>
        </div>
      </section>

      {/* ── SEÇÃO 8 — CTA FINAL ────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
        padding: '80px 24px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 16 }}>
            Pronto para começar pela sua realidade financeira?
          </h2>
          <p style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.7, marginBottom: 40 }}>
            Descubra seu perfil, simule com precisão e encontre imóveis compatíveis com o seu orçamento real.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/simulador" style={{
              background: '#2563eb', color: '#fff',
              borderRadius: 12, padding: '15px 32px',
              fontSize: 15, fontWeight: 700, textDecoration: 'none',
              border: '2px solid #3b82f6',
            }}>
              Descobrir meu perfil financeiro →
            </Link>
            <Link href="/imoveis" style={{
              background: 'rgba(255,255,255,0.08)', color: '#fff',
              borderRadius: 12, padding: '15px 32px',
              fontSize: 15, fontWeight: 700, textDecoration: 'none',
              border: '2px solid rgba(255,255,255,0.2)',
            }}>
              Ver imóveis compatíveis →
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
