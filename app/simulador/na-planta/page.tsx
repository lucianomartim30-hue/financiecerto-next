'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatBRL, parcelaPrice, calcularSeguros, TAXA_SBPE_ANUAL, detectarFaixaMCMV } from '@/lib/calculos';
import Link from 'next/link';

type Modo = 'basico' | 'intermediario' | 'completo';

function p(s: string): number { return Number(s.replace(/\D/g, '')) || 0; }
function f(s: string): string { const n = s.replace(/\D/g, ''); return n ? Number(n).toLocaleString('pt-BR') : ''; }

function NaPlantaContent() {
  const sp = useSearchParams();

  // ── Perfil vindo do simulador principal ────────────────────────────────────
  const renda         = Number(sp.get('renda')    || 0);
  const maxFinMcmv    = Number(sp.get('mcmv')     || 0);   // max financiamento MCMV pelo perfil
  const maxFinSbpe    = Number(sp.get('sbpe')     || 0);   // max financiamento SBPE pelo perfil
  const fgts          = Number(sp.get('fgts')     || 0);
  const proprios      = Number(sp.get('proprios') || 0);
  const recursosTotal = fgts + proprios;

  // ── Valor do imóvel (o cliente digita após ver a tabela da construtora) ────
  const [valorRaw, setValorRaw] = useState('');
  const valor = p(valorRaw);

  // ── Financiamento e entrada ─────────────────────────────────────────────────
  // O banco aprova o financiamento com base na renda (já calculado no simulador).
  // A entrada é o que sobra: valor do imóvel − financiamento aprovado.
  const faixaRenda  = detectarFaixaMCMV(renda);
  const isMCMV      = faixaRenda !== null && valor > 0 && valor <= faixaRenda.teto;
  const maxFin      = isMCMV ? maxFinMcmv : maxFinSbpe;
  // Financiamento não pode ultrapassar valor do imóvel nem o limite aprovado
  const financiado  = Math.min(maxFin, Math.max(0, valor * 0.9));
  const entradaNecessaria = Math.max(0, valor - financiado);
  const temRecursos       = recursosTotal >= entradaNecessaria;
  const faltaRecursos     = Math.max(0, entradaNecessaria - recursosTotal);

  // ── Modo: estrutura de pagamento da entrada ─────────────────────────────────
  const [modo, setModo] = useState<Modo>('basico');

  // Componentes em R$ (valores exatos da tabela da construtora)
  const [atoRaw,      setAtoRaw]      = useState('');
  const [iniciaisRaw, setIniciaisRaw] = useState('');
  const [qtdIniciais, setQtdIniciais] = useState(2);
  const [mensalRaw,   setMensalRaw]   = useState('');
  const [qtdMensais,  setQtdMensais]  = useState(36);
  const [anuaisRaw,   setAnuaisRaw]   = useState('');
  const [qtdAnuais,   setQtdAnuais]   = useState(2);
  const [unicaRaw,    setUnicaRaw]    = useState('');

  // Totais de cada componente
  const ato          = p(atoRaw);
  const iniciais     = p(iniciaisRaw) * (modo !== 'basico' ? qtdIniciais : 0);
  const mensalUnit   = p(mensalRaw);
  const totalMensais = mensalUnit * qtdMensais;
  const anuaisUnit   = p(anuaisRaw);
  const totalAnuais  = anuaisUnit * (modo !== 'basico' ? qtdAnuais : 0);
  const unica        = p(unicaRaw) * (modo === 'completo' ? 1 : 0);

  const totalEstruturaEntrada = ato + iniciais + totalMensais + totalAnuais + unica;
  const diferenca             = totalEstruturaEntrada - entradaNecessaria; // + = excesso, - = falta
  const estruturaOk           = entradaNecessaria > 0 && Math.abs(diferenca) < entradaNecessaria * 0.05; // tolerância 5%

  // ── Juros evolutivos MCMV e limite de 30% ──────────────────────────────────
  const taxa      = isMCMV && faixaRenda ? faixaRenda.taxaRef : TAXA_SBPE_ANUAL;
  const seguros   = calcularSeguros(financiado);
  const parcelaFin = parcelaPrice(financiado, taxa, 35 * 12);
  const jurosEvo  = isMCMV && financiado > 0
    ? Math.round(parcelaFin * 0.655 + seguros.total) : 0;
  const limite30  = renda * 0.30;
  const burden    = mensalUnit + jurosEvo;
  const ok30      = burden <= limite30 || mensalUnit === 0;

  const saldoAposAto   = entradaNecessaria - ato;
  const saldoNaEntrega = Math.max(0, entradaNecessaria - ato - iniciais - totalMensais - totalAnuais);
  const valido = valor > 0 && renda > 0 && ato > 0 && mensalUnit > 0;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Link href="/simulador" style={{ color: '#78716c', fontSize: '13px', textDecoration: 'none' }}>
            ← Voltar ao simulador
          </Link>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1c1917', marginTop: '12px', marginBottom: '4px' }}>
            🏗️ Simulador de Imóvel Na Planta
          </h1>
          <p style={{ color: '#78716c', fontSize: '14px' }}>
            Seu financiamento já foi aprovado pelo perfil. Agora veja como estruturar a entrada durante a obra.
          </p>
        </div>

        {/* ── PRÉ-ANÁLISE (financiamento aprovado pelo perfil) ─────────────── */}
        {renda > 0 && (
          <div style={{
            background: '#fff', borderRadius: '14px',
            border: '1px solid #e7e5e4', padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '20px',
          }}>
            <p style={{ fontSize: '12px', fontWeight: '700', color: '#2563eb', letterSpacing: '0.5px', marginBottom: '12px' }}>
              SUA PRÉ-ANÁLISE BANCÁRIA
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {maxFinMcmv > 0 && (
                <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '12px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a', marginBottom: '4px' }}>MCMV (até R$ 350 mil)</p>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: '#1c1917' }}>{formatBRL(maxFinMcmv)}</p>
                  <p style={{ fontSize: '11px', color: '#78716c' }}>financiamento aprovado · {faixaRenda ? `${faixaRenda.taxaMin.toFixed(2).replace('.', ',')}–${faixaRenda.taxaMax.toFixed(2).replace('.', ',')}% a.a. + TR (${faixaRenda.label})` : 'MCMV'}</p>
                </div>
              )}
              {maxFinSbpe > 0 && (
                <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '12px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', marginBottom: '4px' }}>SBPE (acima de R$ 350 mil)</p>
                  <p style={{ fontSize: '18px', fontWeight: '700', color: '#1c1917' }}>{formatBRL(maxFinSbpe)}</p>
                  <p style={{ fontSize: '11px', color: '#78716c' }}>financiamento aprovado · 10,5% a.a.</p>
                </div>
              )}
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#78716c' }}>
                <strong>Renda:</strong> {formatBRL(renda)}/mês
              </span>
              {recursosTotal > 0 && (
                <span style={{ fontSize: '12px', color: '#78716c' }}>
                  <strong>Recursos disponíveis (FGTS + próprios):</strong> {formatBRL(recursosTotal)}
                </span>
              )}
              <span style={{ fontSize: '12px', color: '#78716c' }}>
                <strong>Limite mensal obras (30%):</strong> {formatBRL(limite30)}/mês
              </span>
            </div>
          </div>
        )}

        {/* ── VALOR DO IMÓVEL + ENTRADA CALCULADA ─────────────────────────── */}
        <div style={{
          background: '#fff', borderRadius: '16px',
          border: '1px solid #e7e5e4', padding: '28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '20px',
        }}>

          <div style={{ marginBottom: '20px' }}>
            <label style={lbl}>Valor do imóvel (conforme tabela da construtora)</label>
            <InputBRL value={valorRaw} onChange={v => setValorRaw(f(v))} placeholder="350.000" />
            {valor > 0 && (
              <p style={{ fontSize: '12px', color: isMCMV ? '#16a34a' : '#2563eb', marginTop: '4px' }}>
                {isMCMV ? '✓ MCMV — Crédito Associativo (7,66% a.a.)' : '✓ SBPE / Mercado (10,5% a.a.)'}
              </p>
            )}
          </div>

          {/* Resumo financeiro */}
          {valor > 0 && maxFin > 0 && (
            <div style={{
              background: '#fafaf9', borderRadius: '12px',
              border: '1px solid #e7e5e4', padding: '16px', marginBottom: '24px',
            }}>
              <p style={{ fontSize: '12px', fontWeight: '700', color: '#78716c', marginBottom: '10px', letterSpacing: '0.5px' }}>
                COMPOSIÇÃO DO PAGAMENTO
              </p>
              <Resumo label="Valor do imóvel"        valor={formatBRL(valor)} />
              <Resumo label={`Financiamento aprovado (${isMCMV ? 'MCMV' : 'SBPE'})`} valor={`− ${formatBRL(financiado)}`} cor="#16a34a" />
              <div style={{ borderTop: '1.5px solid #e7e5e4', marginTop: '8px', paddingTop: '8px' }}>
                <Resumo
                  label="Entrada necessária (paga durante a obra)"
                  valor={formatBRL(entradaNecessaria)}
                  cor="#1c1917"
                  negrito
                />
              </div>
              {recursosTotal > 0 && (
                <div style={{
                  marginTop: '8px', padding: '8px 10px', borderRadius: '8px',
                  background: temRecursos ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${temRecursos ? '#bbf7d0' : '#fecaca'}`,
                }}>
                  <p style={{ fontSize: '12px', color: temRecursos ? '#15803d' : '#dc2626' }}>
                    {temRecursos
                      ? `✅ Você tem ${formatBRL(recursosTotal)} disponíveis — cobre a entrada`
                      : `⚠️ Faltam ${formatBRL(faltaRecursos)} para cobrir a entrada`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── ESTRUTURA DE PAGAMENTO DA ENTRADA ─────────────────────────── */}
          {valor > 0 && entradaNecessaria > 0 && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#1c1917', marginBottom: '4px' }}>
                  Como a entrada será paga durante a obra?
                </p>
                <p style={{ fontSize: '12px', color: '#78716c', marginBottom: '10px' }}>
                  Informe os valores exatos da tabela da construtora. O total deve fechar com a entrada de {formatBRL(entradaNecessaria)}.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {([
                    { key: 'basico',        label: 'Ato + Mensais',       desc: 'Ex: MRV, Econ' },
                    { key: 'intermediario', label: '+ Iniciais + Anuais', desc: 'Ex: Kallas, Trisul' },
                    { key: 'completo',      label: '+ Única FD',          desc: 'Ex: Mitre, Bay' },
                  ] as { key: Modo; label: string; desc: string }[]).map(({ key, label, desc }) => (
                    <button key={key} onClick={() => setModo(key)} style={{
                      padding: '10px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: '600',
                      cursor: 'pointer', border: '1.5px solid', textAlign: 'center',
                      borderColor: modo === key ? '#2563eb' : '#e7e5e4',
                      background:  modo === key ? '#eff6ff' : '#fff',
                      color:       modo === key ? '#2563eb' : '#78716c',
                    }}>
                      <div style={{ marginBottom: '2px' }}>{label}</div>
                      <div style={{ fontSize: '10px', fontWeight: '400', color: '#a8a29e' }}>{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ATO */}
              <LinhaForm numero="1" label="Ato" hint="Valor pago na assinatura do contrato (uma única vez)">
                <InputBRL value={atoRaw} onChange={v => setAtoRaw(f(v))} placeholder="14.000" />
              </LinhaForm>

              {/* PARCELAS INICIAIS */}
              {modo !== 'basico' && (
                <LinhaForm numero="2" label="Parcelas Iniciais / Complementos" hint="Pagamentos nos primeiros meses após o ato">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                    <InputBRL value={iniciaisRaw} onChange={v => setIniciaisRaw(f(v))} placeholder="10.000" />
                    <select value={qtdIniciais} onChange={e => setQtdIniciais(Number(e.target.value))} style={selSm}>
                      {[2,3,4,5,6].map(n => <option key={n} value={n}>× {n}</option>)}
                    </select>
                  </div>
                  {p(iniciaisRaw) > 0 && <p style={hint11}>Total: {formatBRL(p(iniciaisRaw) * qtdIniciais)}</p>}
                </LinhaForm>
              )}

              {/* MENSAIS */}
              <LinhaForm
                numero={modo === 'basico' ? '2' : '3'}
                label="Mensais"
                hint="Valor de cada parcela mensal paga à construtora durante a obra"
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', alignItems: 'center' }}>
                  <InputBRL value={mensalRaw} onChange={v => setMensalRaw(f(v))} placeholder="1.900" />
                  <span style={{ fontSize: '12px', color: '#78716c', whiteSpace: 'nowrap' }}>/mês ×</span>
                  <select value={qtdMensais} onChange={e => setQtdMensais(Number(e.target.value))} style={selSm}>
                    {[24,26,28,30,36,40,43,48].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                {mensalUnit > 0 && <p style={hint11}>Total: {formatBRL(totalMensais)}</p>}
              </LinhaForm>

              {/* ANUAIS */}
              {modo !== 'basico' && (
                <LinhaForm
                  numero="4"
                  label="Anuais / Semestrais"
                  hint="Reforços periódicos maiores conforme tabela"
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                    <InputBRL value={anuaisRaw} onChange={v => setAnuaisRaw(f(v))} placeholder="13.000" />
                    <select value={qtdAnuais} onChange={e => setQtdAnuais(Number(e.target.value))} style={selSm}>
                      {[1,2,3,4,6,8].map(n => <option key={n} value={n}>× {n}</option>)}
                    </select>
                  </div>
                  {p(anuaisRaw) > 0 && <p style={hint11}>Total: {formatBRL(totalAnuais)}</p>}
                </LinhaForm>
              )}

              {/* ÚNICA */}
              {modo === 'completo' && (
                <LinhaForm
                  numero="5"
                  label="Parcela Única (antes das chaves)"
                  hint="Pagamento pontual maior próximo à entrega"
                >
                  <InputBRL value={unicaRaw} onChange={v => setUnicaRaw(f(v))} placeholder="23.000" />
                </LinhaForm>
              )}

              {/* Verificador de fechamento */}
              {(ato > 0 || mensalUnit > 0) && (
                <div style={{
                  borderRadius: '12px', padding: '14px 16px',
                  background: estruturaOk ? '#f0fdf4' : diferenca > 0 ? '#fef2f2' : '#fffbeb',
                  border: `1px solid ${estruturaOk ? '#bbf7d0' : diferenca > 0 ? '#fecaca' : '#fde68a'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', color: '#78716c' }}>Total da estrutura de pagamento</span>
                    <strong style={{ fontSize: '13px', color: '#1c1917' }}>{formatBRL(totalEstruturaEntrada)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#78716c' }}>Entrada necessária</span>
                    <strong style={{ fontSize: '13px', color: '#1c1917' }}>{formatBRL(entradaNecessaria)}</strong>
                  </div>
                  <p style={{ fontSize: '12px', marginTop: '8px', fontWeight: '600', color: estruturaOk ? '#15803d' : diferenca > 0 ? '#dc2626' : '#b45309' }}>
                    {estruturaOk
                      ? '✅ Estrutura fecha com a entrada necessária'
                      : diferenca > 0
                        ? `⚠️ Excede a entrada em ${formatBRL(diferenca)} — reduza algum componente`
                        : `⚠️ Faltam ${formatBRL(Math.abs(diferenca))} para fechar a entrada — adicione mais um componente`}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── FLUXO DE PAGAMENTO ─────────────────────────────────────────────── */}
        {valido && (
          <div style={{
            background: '#fff', borderRadius: '16px',
            border: '1px solid #e7e5e4', padding: '28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: '24px',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1c1917', marginBottom: '24px' }}>
              Fluxo de pagamento
            </h2>

            {/* 1 — Assinatura */}
            <Bloco emoji="📋" titulo="Na Assinatura" cor="#44403c">
              <Linha label="Ato" valor={formatBRL(ato)} sublabel="Pagamento único na assinatura do contrato" destaque />
              <InfoSaldo
                label="Saldo da entrada ainda a pagar à construtora"
                valor={formatBRL(saldoAposAto)}
                aviso="⚠️ Este saldo sofre reajuste mensal pelo INCC (FGV) até a entrega das chaves."
              />
            </Bloco>

            {/* 2 — Parcelas iniciais */}
            {modo !== 'basico' && p(iniciaisRaw) > 0 && (
              <Bloco emoji="📌" titulo={`Primeiros ${qtdIniciais} meses`} cor="#7c3aed">
                <Linha
                  label={`Parcelas iniciais × ${qtdIniciais}`}
                  valor={`${formatBRL(p(iniciaisRaw))} cada`}
                  sublabel={`Total: ${formatBRL(iniciais)}`}
                />
              </Bloco>
            )}

            {/* 3 — Durante a obra */}
            <Bloco emoji="🏗️" titulo={`Durante a Obra — ${qtdMensais} meses`} cor="#d97706">

              <Linha
                label={`Mensais × ${qtdMensais}`}
                valor={`${formatBRL(mensalUnit)}/mês`}
                sublabel={`Total: ${formatBRL(totalMensais)}`}
              />

              {modo !== 'basico' && anuaisUnit > 0 && (
                <Linha
                  label={`Anuais / Semestrais × ${qtdAnuais}`}
                  valor={`${formatBRL(anuaisUnit)} cada`}
                  sublabel={`Total: ${formatBRL(totalAnuais)}`}
                />
              )}

              {/* Juros evolutivos MCMV */}
              {isMCMV && jurosEvo > 0 && (
                <Linha
                  label="Juros evolutivos ao banco (MCMV Crédito Associativo)"
                  valor={`~${formatBRL(jurosEvo)}/mês`}
                  sublabel="Crescem conforme o progresso da obra — pagos ao banco, não à construtora"
                />
              )}

              {/* Alerta 30% */}
              <div style={{
                background: ok30 ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${ok30 ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: '10px', padding: '10px 14px', marginTop: '12px',
                display: 'flex', gap: '10px',
              }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{ok30 ? '✅' : '⚠️'}</span>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: ok30 ? '#15803d' : '#dc2626', marginBottom: '2px' }}>
                    {ok30 ? 'Comprometimento dentro do limite (30% da renda)' : 'Comprometimento acima do limite recomendado'}
                  </p>
                  {isMCMV && jurosEvo > 0 ? (
                    <p style={{ fontSize: '11px', color: '#78716c' }}>
                      Mensais construtora: {formatBRL(mensalUnit)} + Juros banco: ~{formatBRL(jurosEvo)} = <strong>{formatBRL(burden)}/mês</strong> · Limite 30%: {formatBRL(limite30)}/mês
                    </p>
                  ) : (
                    <p style={{ fontSize: '11px', color: '#78716c' }}>
                      Mensais: {formatBRL(mensalUnit)}/mês · Limite 30%: {formatBRL(limite30)}/mês
                    </p>
                  )}
                </div>
              </div>

              <InfoSaldo
                label="Saldo da entrada restante na entrega das chaves"
                valor={formatBRL(saldoNaEntrega)}
                aviso="⚠️ Todos os valores pagos à construtora sofrem reajuste pelo INCC (FGV)."
              />
            </Bloco>

            {/* 4 — Na entrega */}
            <Bloco emoji="🔑" titulo="Na Entrega das Chaves (Habite-se)" cor="#2563eb">
              {modo === 'completo' && unica > 0 && (
                <Linha label="Parcela Única (antes das chaves)" valor={formatBRL(unica)} sublabel="Pagamento pontual na entrega" />
              )}
              <Linha
                label={`Financiamento ${isMCMV ? 'MCMV' : 'SBPE'} (aprovado pela pré-análise)`}
                valor={formatBRL(Math.round(financiado))}
                sublabel={`${((financiado / valor) * 100).toFixed(0)}% do valor — contratado com o banco`}
                destaque
              />
              <div style={{
                background: isMCMV ? '#f0fdf4' : '#eff6ff',
                border: `1px solid ${isMCMV ? '#bbf7d0' : '#bfdbfe'}`,
                borderRadius: '10px', padding: '12px 14px', marginTop: '10px',
              }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: isMCMV ? '#15803d' : '#1d4ed8', marginBottom: '4px' }}>
                  {isMCMV ? '🏠 Minha Casa Minha Vida — Crédito Associativo' : '🏦 SBPE / Mercado'}
                </p>
                <p style={{ fontSize: '12px', color: '#78716c', lineHeight: '1.6' }}>
                  {isMCMV
                    ? 'O contrato com a Caixa Econômica Federal é assinado 1 a 6 meses após o contrato de compra e venda, antes da obra começar. Durante a construção, além das mensais à construtora, você paga ao banco juros evolutivos que crescem conforme o andamento da obra.'
                    : 'O financiamento bancário é contratado somente na emissão do Habite-se. Durante toda a obra, você paga apenas à construtora — o banco entra somente na entrega das chaves.'}
                </p>
              </div>
            </Bloco>

            {/* 5 — Pós-entrega */}
            <Bloco emoji="📅" titulo="Pós-entrega — Parcela do Financiamento" cor="#16a34a" ultimo>
              <Linha
                label={`${isMCMV && faixaRenda ? faixaRenda.taxaRef.toFixed(2).replace('.', ',') : '10,5'}% a.a. + TR · Sistema Price · 35 anos`}
                valor={`${formatBRL(Math.round(parcelaFin + seguros.total))}/mês`}
                sublabel="1ª parcela — decresce ao longo do financiamento"
                destaque
              />
            </Bloco>
          </div>
        )}

        {valido && (
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Link href="/imoveis" style={{
              display: 'inline-block', background: '#2563eb', color: '#fff',
              textDecoration: 'none', borderRadius: '12px',
              padding: '13px 32px', fontSize: '15px', fontWeight: '600',
            }}>
              Ver imóveis na planta compatíveis →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const lbl: React.CSSProperties  = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#1c1917', marginBottom: '6px' };
const selSm: React.CSSProperties = { padding: '10px 8px', border: '1.5px solid #e7e5e4', borderRadius: '10px', fontSize: '13px', background: '#fff', outline: 'none' };
const hint11: React.CSSProperties = { fontSize: '11px', color: '#78716c', marginTop: '4px' };

// ─── Componentes ─────────────────────────────────────────────────────────────
function InputBRL({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #e7e5e4', borderRadius: '10px', overflow: 'hidden' }}>
      <span style={{ padding: '10px 12px', fontSize: '14px', color: '#78716c', background: '#fafaf9', borderRight: '1px solid #e7e5e4' }}>R$</span>
      <input type="text" inputMode="numeric" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ flex: 1, padding: '10px 12px', border: 'none', outline: 'none', fontSize: '14px', color: '#1c1917', background: 'transparent' }} />
    </div>
  );
}

function LinhaForm({ numero, label, hint, children }: { numero: string; label: string; hint: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: '12px', marginBottom: '20px', alignItems: 'start' }}>
      <div style={{
        width: '24px', height: '24px', borderRadius: '50%', background: '#1c1917',
        color: '#fff', fontSize: '11px', fontWeight: '700',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px',
      }}>{numero}</div>
      <div>
        <p style={{ fontSize: '13px', fontWeight: '600', color: '#1c1917', marginBottom: '2px' }}>{label}</p>
        <p style={{ fontSize: '11px', color: '#78716c', marginBottom: '6px' }}>{hint}</p>
        {children}
      </div>
    </div>
  );
}

function Resumo({ label, valor, cor, negrito }: { label: string; valor: string; cor?: string; negrito?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
      <span style={{ fontSize: '13px', color: '#78716c' }}>{label}</span>
      <strong style={{ fontSize: '13px', color: cor || '#1c1917', fontWeight: negrito ? '700' : '600' }}>{valor}</strong>
    </div>
  );
}

function Bloco({ emoji, titulo, cor, children, ultimo }: { emoji: string; titulo: string; cor: string; children: React.ReactNode; ultimo?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '14px', marginBottom: ultimo ? 0 : '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: cor + '15', border: `1.5px solid ${cor}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px' }}>{emoji}</div>
        {!ultimo && <div style={{ width: '2px', flex: 1, background: '#e7e5e4', marginTop: '6px', minHeight: '24px' }} />}
      </div>
      <div style={{ flex: 1, paddingBottom: ultimo ? 0 : '8px' }}>
        <p style={{ fontSize: '12px', fontWeight: '700', color: cor, marginBottom: '10px', letterSpacing: '0.3px' }}>{titulo.toUpperCase()}</p>
        {children}
      </div>
    </div>
  );
}

function Linha({ label, valor, sublabel, destaque }: { label: string; valor: string; sublabel?: string; destaque?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f5f5f4' }}>
      <div style={{ flex: 1, paddingRight: '16px' }}>
        <p style={{ fontSize: '13px', color: destaque ? '#1c1917' : '#78716c', fontWeight: destaque ? '600' : '400' }}>{label}</p>
        {sublabel && <p style={{ fontSize: '11px', color: '#a8a29e', marginTop: '2px' }}>{sublabel}</p>}
      </div>
      <span style={{ fontSize: destaque ? '15px' : '14px', fontWeight: '700', color: '#1c1917', whiteSpace: 'nowrap' }}>{valor}</span>
    </div>
  );
}

function InfoSaldo({ label, valor, aviso }: { label: string; valor: string; aviso: string }) {
  return (
    <div style={{ background: '#fafaf9', borderRadius: '8px', padding: '10px 12px', marginTop: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
        <p style={{ fontSize: '12px', color: '#78716c' }}>{label}</p>
        <strong style={{ fontSize: '13px', color: '#1c1917' }}>{valor}</strong>
      </div>
      <p style={{ fontSize: '11px', color: '#a8a29e' }}>{aviso}</p>
    </div>
  );
}

export default function NaPlantaPage() {
  return (
    <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: '#78716c' }}>Carregando...</div>}>
      <NaPlantaContent />
    </Suspense>
  );
}
