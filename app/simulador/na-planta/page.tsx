'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatBRL, parcelaPrice, TAXA_MCMV_ANUAL, TAXA_SBPE_ANUAL, TETO_MCMV } from '@/lib/calculos';
import Link from 'next/link';

type Modo = 'simples' | 'sinais' | 'completo';

function NaPlantaContent() {
  const searchParams = useSearchParams();
  const rendaParam = Number(searchParams.get('renda') || 0);
  const valorParam = Number(searchParams.get('valor') || 0);

  function fmt(val: string): string {
    const num = val.replace(/\D/g, '');
    if (!num) return '';
    return Number(num).toLocaleString('pt-BR');
  }

  const [rendaRaw, setRendaRaw] = useState(rendaParam > 0 ? rendaParam.toLocaleString('pt-BR') : '');
  const [valorRaw, setValorRaw] = useState(valorParam > 0 ? Math.round(valorParam).toLocaleString('pt-BR') : '');
  const [modo, setModo] = useState<Modo>('simples');
  const [prazoObras, setPrazoObras] = useState(36);

  // Percentuais de cada componente (% do valor total do imóvel)
  const [atoPerc, setAtoPerc] = useState(5);
  const [mensaisPerc, setMensaisPerc] = useState(15);
  const [sinaisPerc, setSinaisPerc] = useState(5);
  const [sinaisFreq, setSinaisFreq] = useState(3);
  const [anuaisPerc, setAnuaisPerc] = useState(5);
  const [anuaisQtd, setAnuaisQtd] = useState(2);
  const [chavesPerc, setChavesPerc] = useState(5);

  const rendaNum = Number(rendaRaw.replace(/\D/g, '')) || 0;
  const valorImovel = Number(valorRaw.replace(/\D/g, '')) || 0;

  const usaSinais  = modo === 'sinais'   || modo === 'completo';
  const usaAnuais  = modo === 'completo';
  const usaChaves  = modo === 'completo';

  const sinaisEfetivo = usaSinais ? sinaisPerc : 0;
  const anuaisEfetivo = usaAnuais ? anuaisPerc : 0;
  const chavesEfetivo = usaChaves ? chavesPerc : 0;

  const totalPerc      = atoPerc + mensaisPerc + sinaisEfetivo + anuaisEfetivo + chavesEfetivo;
  const financiadoPerc = Math.max(0, 100 - totalPerc);
  const excessoPerc    = Math.max(0, totalPerc - 100);

  // Valores absolutos
  const ato           = valorImovel * atoPerc / 100;
  const totalMensais  = valorImovel * mensaisPerc / 100;
  const mensalValor   = prazoObras > 0 ? totalMensais / prazoObras : 0;

  const qtdSinais    = prazoObras > 0 ? Math.floor(prazoObras / sinaisFreq) : 0;
  const totalSinais  = valorImovel * sinaisEfetivo / 100;
  const sinalValor   = qtdSinais > 0 ? totalSinais / qtdSinais : 0;

  const totalAnuais  = valorImovel * anuaisEfetivo / 100;
  const anualValor   = anuaisQtd > 0 ? totalAnuais / anuaisQtd : 0;

  const chaves           = valorImovel * chavesEfetivo / 100;
  const valorFinanciado  = valorImovel * financiadoPerc / 100;

  const limite30   = rendaNum * 0.30;
  const dentro30   = mensalValor <= limite30 || mensalValor === 0;

  const isMCMV     = valorImovel > 0 && valorImovel <= TETO_MCMV;
  const taxa       = isMCMV ? TAXA_MCMV_ANUAL : TAXA_SBPE_ANUAL;
  const parcelaFinanc = parcelaPrice(valorFinanciado, taxa, 35 * 12);

  const saldoAposAto    = valorImovel - ato;
  const totalNaObra     = totalMensais + totalSinais + totalAnuais;
  const saldoNaEntrega  = Math.max(0, saldoAposAto - totalNaObra);

  const valido = valorImovel > 0 && rendaNum > 0 && totalPerc <= 100;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Link href="/simulador" style={{ color: '#78716c', fontSize: '13px', textDecoration: 'none' }}>
            ← Voltar ao simulador
          </Link>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#1c1917', marginTop: '12px', marginBottom: '6px' }}>
            🏗️ Simulador de Imóvel Na Planta
          </h1>
          <p style={{ color: '#78716c', fontSize: '15px' }}>
            Configure o fluxo de pagamento durante a obra e veja se o orçamento fecha.
          </p>
        </div>

        {/* Banner de perfil */}
        {rendaNum > 0 && (
          <div style={{
            background: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: '12px', padding: '14px 18px',
            marginBottom: '20px', display: 'flex', gap: '24px', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '13px', color: '#1d4ed8' }}>
              <strong>Renda:</strong> {formatBRL(rendaNum)}/mês
            </span>
            <span style={{ fontSize: '13px', color: '#1d4ed8' }}>
              <strong>Limite obras (30%):</strong> {formatBRL(limite30)}/mês
            </span>
          </div>
        )}

        {/* Card de configuração */}
        <div style={{
          background: '#ffffff', borderRadius: '16px',
          border: '1px solid #e7e5e4', padding: '28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          marginBottom: '20px',
        }}>

          {/* Renda (se não veio do simulador) */}
          {rendaParam === 0 && (
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Sua renda bruta mensal</label>
              <InputBRL value={rendaRaw} onChange={v => setRendaRaw(fmt(v))} placeholder="5.000" />
            </div>
          )}

          {/* Valor do imóvel */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Valor do imóvel</label>
            <InputBRL value={valorRaw} onChange={v => setValorRaw(fmt(v))} placeholder="300.000" />
            {valorImovel > 0 && (
              <p style={{ fontSize: '12px', color: isMCMV ? '#16a34a' : '#2563eb', marginTop: '4px' }}>
                {isMCMV
                  ? '✓ Elegível MCMV — Crédito Associativo (7,66% a.a.)'
                  : '✓ SBPE / Mercado (10,5% a.a.) — financiamento na entrega das chaves'}
              </p>
            )}
          </div>

          {/* Prazo de obras */}
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Prazo estimado da obra</label>
            <select
              value={prazoObras}
              onChange={e => setPrazoObras(Number(e.target.value))}
              style={selectStyle}
            >
              <option value={24}>24 meses (2 anos)</option>
              <option value={30}>30 meses (2,5 anos)</option>
              <option value={36}>36 meses (3 anos)</option>
              <option value={42}>42 meses (3,5 anos)</option>
              <option value={48}>48 meses (4 anos)</option>
            </select>
          </div>

          {/* Seletor de modo */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Forma de pagamento</label>
            <p style={{ fontSize: '12px', color: '#78716c', marginBottom: '8px' }}>
              Escolha a estrutura de pagamento que a construtora oferece.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {([
                { key: 'simples',   label: 'Ato + Mensais' },
                { key: 'sinais',    label: '+ Sinais' },
                { key: 'completo',  label: 'Fluxo completo' },
              ] as { key: Modo; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setModo(key)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px',
                    fontWeight: '600', cursor: 'pointer', border: '1.5px solid',
                    borderColor: modo === key ? '#1c1917' : '#e7e5e4',
                    background:  modo === key ? '#1c1917' : '#fff',
                    color:       modo === key ? '#fff' : '#78716c',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de componentes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

            <PercSelect
              label="Ato (assinatura)"
              hint="Pago na assinatura do contrato"
              valor={atoPerc}
              onChange={setAtoPerc}
              options={[3, 5, 8, 10, 12, 15, 20]}
              base={valorImovel}
            />

            <PercSelect
              label={`Mensais (${prazoObras} parcelas)`}
              hint="Distribuídas ao longo da obra"
              valor={mensaisPerc}
              onChange={setMensaisPerc}
              options={[5, 8, 10, 12, 15, 18, 20, 25]}
              base={valorImovel}
            />

            {usaSinais && (
              <>
                <PercSelect
                  label={`Sinais (a cada ${sinaisFreq} meses)`}
                  hint={`${qtdSinais} reforço${qtdSinais !== 1 ? 's' : ''} durante a obra`}
                  valor={sinaisPerc}
                  onChange={setSinaisPerc}
                  options={[3, 5, 8, 10, 12, 15]}
                  base={valorImovel}
                />
                <div>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#78716c', marginBottom: '2px' }}>FREQUÊNCIA DOS SINAIS</p>
                  <p style={{ fontSize: '11px', color: '#a8a29e', marginBottom: '4px' }}>Intervalo entre cada sinal</p>
                  <select value={sinaisFreq} onChange={e => setSinaisFreq(Number(e.target.value))} style={selectStyle}>
                    <option value={2}>A cada 2 meses</option>
                    <option value={3}>A cada 3 meses</option>
                    <option value={6}>A cada 6 meses (semestral)</option>
                  </select>
                </div>
              </>
            )}

            {usaAnuais && (
              <>
                <PercSelect
                  label="Anuais"
                  hint={`${anuaisQtd} parcela${anuaisQtd !== 1 ? 's' : ''} anual${anuaisQtd !== 1 ? 'is' : ''}`}
                  valor={anuaisPerc}
                  onChange={setAnuaisPerc}
                  options={[3, 5, 8, 10, 12, 15]}
                  base={valorImovel}
                />
                <div>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#78716c', marginBottom: '2px' }}>QTD ANUAIS</p>
                  <p style={{ fontSize: '11px', color: '#a8a29e', marginBottom: '4px' }}>Quantas parcelas anuais</p>
                  <select value={anuaisQtd} onChange={e => setAnuaisQtd(Number(e.target.value))} style={selectStyle}>
                    <option value={1}>1 parcela anual</option>
                    <option value={2}>2 parcelas anuais</option>
                    <option value={3}>3 parcelas anuais</option>
                  </select>
                </div>
              </>
            )}

            {usaChaves && (
              <PercSelect
                label="Antes das chaves (Única)"
                hint="Parcela única paga na entrega"
                valor={chavesPerc}
                onChange={setChavesPerc}
                options={[3, 5, 8, 10, 12, 15, 20]}
                base={valorImovel}
              />
            )}

            {/* Financiamento — calculado automaticamente */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{
                background: excessoPerc > 0 ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${excessoPerc > 0 ? '#fecaca' : '#bbf7d0'}`,
                borderRadius: '10px', padding: '12px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: excessoPerc > 0 ? '#dc2626' : '#15803d', marginBottom: '2px' }}>
                    {excessoPerc > 0 ? `⚠️ Soma excede 100% em ${excessoPerc}%` : '🏦 Financiamento bancário (calculado automaticamente)'}
                  </p>
                  <p style={{ fontSize: '12px', color: '#78716c' }}>
                    {excessoPerc > 0
                      ? 'Reduza os percentuais acima para fechar o cálculo.'
                      : `${financiadoPerc.toFixed(0)}% do valor = ${valorImovel > 0 ? formatBRL(valorFinanciado) : '—'}`}
                  </p>
                </div>
                <span style={{ fontSize: '24px', fontWeight: '700', color: excessoPerc > 0 ? '#dc2626' : '#15803d' }}>
                  {financiadoPerc.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Resultado — fluxo de pagamento */}
        {valido && (
          <div style={{
            background: '#ffffff', borderRadius: '16px',
            border: '1px solid #e7e5e4', padding: '28px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            marginBottom: '24px',
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1c1917', marginBottom: '24px' }}>
              Fluxo de pagamento
            </h2>

            {/* 1. Na Assinatura */}
            <BlocoFluxo emoji="📋" titulo="Na Assinatura" cor="#44403c">
              <LinhaFluxo label={`Ato — ${atoPerc}% do valor`} valor={formatBRL(ato)} destaque />
              <Saldo
                label="Saldo restante à construtora após o ato"
                valor={formatBRL(saldoAposAto)}
                aviso="⚠️ Este saldo sofre reajuste mensal pelo INCC até a entrega das chaves."
              />
            </BlocoFluxo>

            {/* 2. Durante a Obra */}
            <BlocoFluxo emoji="🏗️" titulo={`Durante a Obra — ${prazoObras} meses`} cor="#d97706">

              <LinhaFluxo
                label={`Mensais × ${prazoObras} meses`}
                valor={`${formatBRL(Math.round(mensalValor))}/mês`}
                sublabel={`Total pago: ${formatBRL(totalMensais)}`}
              />

              {usaSinais && sinalValor > 0 && (
                <LinhaFluxo
                  label={`Sinais a cada ${sinaisFreq} meses × ${qtdSinais}`}
                  valor={formatBRL(Math.round(sinalValor))}
                  sublabel={`Total pago: ${formatBRL(totalSinais)}`}
                />
              )}

              {usaAnuais && anualValor > 0 && (
                <LinhaFluxo
                  label={`Anuais × ${anuaisQtd}`}
                  valor={formatBRL(Math.round(anualValor))}
                  sublabel={`Total pago: ${formatBRL(totalAnuais)}`}
                />
              )}

              {/* Alerta 30% */}
              {mensalValor > 0 && (
                <div style={{
                  background: dentro30 ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${dentro30 ? '#bbf7d0' : '#fecaca'}`,
                  borderRadius: '10px', padding: '10px 14px',
                  marginTop: '10px',
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                }}>
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{dentro30 ? '✅' : '⚠️'}</span>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: dentro30 ? '#15803d' : '#dc2626', marginBottom: '2px' }}>
                      {dentro30
                        ? 'Parcela mensal dentro do limite de 30% da renda'
                        : 'Parcela mensal acima do limite recomendado (30% da renda)'}
                    </p>
                    <p style={{ fontSize: '11px', color: '#78716c' }}>
                      Mensais: {formatBRL(Math.round(mensalValor))}/mês · Limite 30%: {formatBRL(limite30)}/mês
                    </p>
                  </div>
                </div>
              )}

              <Saldo
                label={`Total pago na obra: ${formatBRL(totalNaObra)} — Saldo na entrega`}
                valor={formatBRL(saldoNaEntrega)}
                aviso="⚠️ Todos os valores pagos à construtora sofrem reajuste pelo INCC."
              />
            </BlocoFluxo>

            {/* 3. Na Entrega */}
            <BlocoFluxo emoji="🔑" titulo="Na Entrega das Chaves (Habite-se)" cor="#2563eb">

              {usaChaves && chaves > 0 && (
                <LinhaFluxo
                  label={`Parcela Única (chaves) — ${chavesPerc}% do valor`}
                  valor={formatBRL(Math.round(chaves))}
                />
              )}

              <LinhaFluxo
                label={`Financiamento ${isMCMV ? 'MCMV' : 'SBPE'} — ${financiadoPerc.toFixed(0)}% do valor`}
                valor={formatBRL(Math.round(valorFinanciado))}
                destaque
              />

              <div style={{
                background: isMCMV ? '#f0fdf4' : '#eff6ff',
                border: `1px solid ${isMCMV ? '#bbf7d0' : '#bfdbfe'}`,
                borderRadius: '10px', padding: '12px 14px',
                marginTop: '10px',
              }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: isMCMV ? '#15803d' : '#1d4ed8', marginBottom: '4px' }}>
                  {isMCMV
                    ? '🏠 Minha Casa Minha Vida — Crédito Associativo'
                    : '🏦 SBPE / Mercado'}
                </p>
                <p style={{ fontSize: '12px', color: '#78716c', lineHeight: '1.6' }}>
                  {isMCMV
                    ? 'O contrato de financiamento com a Caixa Econômica é assinado antes da obra começar. Durante a construção, você paga juros evolutivos ao banco (crescem conforme o progresso da obra) além das parcelas mensais à construtora.'
                    : 'O financiamento bancário é contratado somente após a emissão do Habite-se. Durante toda a obra, você paga a construtora diretamente — o banco não é envolvido até a entrega das chaves.'}
                </p>
              </div>
            </BlocoFluxo>

            {/* 4. Pós-entrega */}
            <BlocoFluxo emoji="📅" titulo="Pós-entrega — Financiamento (35 anos)" cor="#16a34a" ultimo>
              <LinhaFluxo
                label={`Taxa ${isMCMV ? '7,66' : '10,5'}% a.a. — 1ª parcela (decresce no SAC)`}
                valor={`${formatBRL(Math.round(parcelaFinanc))}/mês`}
                destaque
              />
            </BlocoFluxo>
          </div>
        )}

        {/* CTA */}
        {valido && (
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Link
              href="/imoveis"
              style={{
                display: 'inline-block', background: '#2563eb', color: '#fff',
                textDecoration: 'none', borderRadius: '12px',
                padding: '13px 32px', fontSize: '15px', fontWeight: '600',
              }}
            >
              Ver imóveis na planta compatíveis →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Estilos compartilhados ───────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: '600',
  color: '#1c1917', marginBottom: '4px',
};

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  border: '1.5px solid #e7e5e4', borderRadius: '10px',
  fontSize: '13px', background: '#fff', outline: 'none',
};

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function InputBRL({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #e7e5e4', borderRadius: '10px', overflow: 'hidden' }}>
      <span style={{ padding: '10px 12px', fontSize: '14px', color: '#78716c', background: '#fafaf9', borderRight: '1px solid #e7e5e4' }}>R$</span>
      <input
        type="text" inputMode="numeric" value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ flex: 1, padding: '10px 12px', border: 'none', outline: 'none', fontSize: '14px', color: '#1c1917', background: 'transparent' }}
      />
    </div>
  );
}

function PercSelect({ label, hint, valor, onChange, options, base }: {
  label: string; hint: string; valor: number;
  onChange: (v: number) => void; options: number[]; base: number;
}) {
  return (
    <div>
      <p style={{ fontSize: '12px', fontWeight: '600', color: '#78716c', marginBottom: '2px' }}>{label.toUpperCase()}</p>
      <p style={{ fontSize: '11px', color: '#a8a29e', marginBottom: '4px' }}>{hint}</p>
      <select
        value={valor}
        onChange={e => onChange(Number(e.target.value))}
        style={selectStyle}
      >
        {options.map(o => (
          <option key={o} value={o}>
            {o}%{base > 0 ? ` = ${formatBRL(Math.round(base * o / 100))}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

function BlocoFluxo({ emoji, titulo, cor, children, ultimo }: {
  emoji: string; titulo: string; cor: string;
  children: React.ReactNode; ultimo?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: '16px', marginBottom: ultimo ? 0 : '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: '38px', height: '38px', borderRadius: '50%',
          background: cor + '18', border: `1.5px solid ${cor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
        }}>
          {emoji}
        </div>
        {!ultimo && (
          <div style={{ width: '2px', flex: 1, background: '#e7e5e4', marginTop: '6px', minHeight: '24px' }} />
        )}
      </div>
      <div style={{ flex: 1, paddingBottom: ultimo ? 0 : '8px' }}>
        <p style={{ fontSize: '13px', fontWeight: '700', color: cor, marginBottom: '10px', letterSpacing: '0.2px' }}>
          {titulo.toUpperCase()}
        </p>
        {children}
      </div>
    </div>
  );
}

function LinhaFluxo({ label, valor, sublabel, destaque }: {
  label: string; valor: string; sublabel?: string; destaque?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '8px 0', borderBottom: '1px solid #f5f5f4',
    }}>
      <div style={{ flex: 1, paddingRight: '16px' }}>
        <p style={{ fontSize: '13px', color: destaque ? '#1c1917' : '#78716c', fontWeight: destaque ? '600' : '400' }}>
          {label}
        </p>
        {sublabel && <p style={{ fontSize: '11px', color: '#a8a29e', marginTop: '2px' }}>{sublabel}</p>}
      </div>
      <span style={{ fontSize: destaque ? '15px' : '14px', fontWeight: '700', color: '#1c1917', whiteSpace: 'nowrap' }}>
        {valor}
      </span>
    </div>
  );
}

function Saldo({ label, valor, aviso }: { label: string; valor: string; aviso: string }) {
  return (
    <div style={{ background: '#fafaf9', borderRadius: '8px', padding: '10px 12px', marginTop: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
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
