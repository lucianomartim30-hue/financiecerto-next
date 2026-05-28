/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  simularHistoricoTR, TR_HISTORICO_36M, formatBRL,
  type MesHistoricoTR,
} from '@/lib/calculos';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number, casas = 2) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
function fmtPct(n: number) { return fmt(n, 4) + '%'; }
function parseMoeda(v: string) { return Number(v.replace(/\D/g, '')) || 0; }
function fmtInput(v: string) {
  const n = v.replace(/\D/g, '');
  return n ? Number(n).toLocaleString('pt-BR') : '';
}

// ─── Card de resumo ───────────────────────────────────────────────────────────
function CardResumo({
  label, valor, sub, cor = '#2563eb', destaque = false,
}: { label: string; valor: string; sub?: string; cor?: string; destaque?: boolean }) {
  return (
    <div style={{
      background: destaque ? cor : '#fff',
      border: `1.5px solid ${destaque ? cor : '#e5e7eb'}`,
      borderRadius: 14, padding: '16px 20px', flex: '1 1 160px',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: destaque ? 'rgba(255,255,255,.8)' : '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: destaque ? '#fff' : cor, lineHeight: 1.2 }}>{valor}</div>
      {sub && <div style={{ fontSize: 12, color: destaque ? 'rgba(255,255,255,.7)' : '#9ca3af', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Linha da tabela — expandível no mobile ───────────────────────────────────
function LinhaTabela({ m, i }: { m: MesHistoricoTR; i: number }) {
  const [expandido, setExpandido] = useState(false);
  const impactoCor = m.diferencaTR >= 0.5 ? '#dc2626' : m.diferencaTR >= 0.1 ? '#d97706' : '#6b7280';

  return (
    <>
      <tr
        onClick={() => setExpandido(v => !v)}
        style={{ cursor: 'pointer', background: i % 2 === 0 ? '#fff' : '#f9fafb' }}
      >
        {/* Mês */}
        <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>
          {m.label}
        </td>
        {/* TR% */}
        <td style={{ padding: '11px 10px', fontSize: 13, textAlign: 'right', color: m.tr > 0.15 ? '#dc2626' : m.tr > 0.05 ? '#d97706' : '#374151', fontWeight: 700 }}>
          {fmt(m.tr, 4)}%
        </td>
        {/* Saldo devedor */}
        <td className="hide-sm" style={{ padding: '11px 10px', fontSize: 12, textAlign: 'right', color: '#374151' }}>
          {formatBRL(m.saldoInicial)}
        </td>
        {/* Correção TR (R$) */}
        <td className="hide-sm" style={{ padding: '11px 10px', fontSize: 12, textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>
          +{formatBRL(m.correcaoTR)}
        </td>
        {/* Parcela s/ TR */}
        <td className="hide-md" style={{ padding: '11px 10px', fontSize: 12, textAlign: 'right', color: '#6b7280' }}>
          {formatBRL(m.parcelaSemTR)}
        </td>
        {/* Parcela c/ TR */}
        <td style={{ padding: '11px 10px', fontSize: 13, textAlign: 'right', color: '#111827', fontWeight: 700 }}>
          {formatBRL(m.parcelaComTR)}
        </td>
        {/* Diferença */}
        <td style={{ padding: '11px 14px', fontSize: 13, textAlign: 'right', color: impactoCor, fontWeight: 800 }}>
          +{formatBRL(m.diferencaTR)}
          <span style={{ fontSize: 10, marginLeft: 4, opacity: .6 }}>▾</span>
        </td>
      </tr>

      {/* Detalhe expandido (mobile) */}
      {expandido && (
        <tr style={{ background: '#eff6ff' }}>
          <td colSpan={7} style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.7 }}>
              <strong>Como foi calculado — {m.label}</strong><br />
              <span style={{ display: 'inline-block', marginTop: 6 }}>
                Saldo devedor antes da correção: <strong>{formatBRL(m.saldoInicial)}</strong><br />
                Correção TR ({fmt(m.tr, 4)}%): <strong style={{ color: '#dc2626' }}>+ {formatBRL(m.correcaoTR)}</strong><br />
                Saldo corrigido (base dos juros): <strong>{formatBRL(m.saldoCorrigido)}</strong><br />
                Juros do mês (sobre saldo corrigido): <strong>{formatBRL(m.jurosComTR)}</strong><br />
                Amortização (fixa): <strong>{formatBRL(m.amort)}</strong><br />
                <span style={{ borderTop: '1px solid #bfdbfe', display: 'block', marginTop: 4, paddingTop: 4 }}>
                  Parcela sem TR: {formatBRL(m.parcelaSemTR)} | Parcela com TR: <strong>{formatBRL(m.parcelaComTR)}</strong><br />
                  <strong style={{ color: '#dc2626' }}>Impacto da TR neste mês: + {formatBRL(m.diferencaTR)}</strong>
                </span>
              </span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Conteúdo principal ───────────────────────────────────────────────────────
function HistoricoTRContent() {
  const params = useSearchParams();

  const [valorInput, setValorInput] = useState(() => {
    const pv = params.get('pv');
    return pv ? Number(pv).toLocaleString('pt-BR') : '350.000';
  });
  const [taxaInput, setTaxaInput] = useState(() => params.get('taxa') || '11,19');
  const [prazoInput, setPrazoInput] = useState(() => params.get('prazo') || '360');
  const [calculado, setCalculado] = useState(false);
  const [resultado, setResultado] = useState<ReturnType<typeof simularHistoricoTR> | null>(null);

  function calcular() {
    const pv    = parseMoeda(valorInput);
    const taxa  = parseFloat(taxaInput.replace(',', '.')) || 11.19;
    const prazo = parseInt(prazoInput) || 360;
    if (pv < 50000 || pv > 10_000_000) return;
    setResultado(simularHistoricoTR(pv, taxa, prazo));
    setCalculado(true);
  }

  const trMedioStr = useMemo(() => {
    const media = TR_HISTORICO_36M.reduce((s, m) => s + m.tr, 0) / TR_HISTORICO_36M.length;
    return fmt(media, 4);
  }, []);

  const trAcumuladaStr = useMemo(() => {
    const ac = TR_HISTORICO_36M.reduce((prod, m) => prod * (1 + m.tr / 100), 1) - 1;
    return fmt(ac * 100, 2);
  }, []);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 16px 60px' }}>

      {/* ── Voltar ───────────────────────────────────────────────────────────── */}
      <Link href="/simulador" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', textDecoration: 'none', marginBottom: 24, fontWeight: 600 }}>
        ← Voltar ao Simulador
      </Link>

      {/* ── Cabeçalho ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#eff6ff', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: '#2563eb', marginBottom: 12, letterSpacing: '.3px' }}>
          📊 EXCLUSIVO — DADOS REAIS BCB
        </div>
        <h1 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 900, color: 'var(--text)', margin: '0 0 12px', lineHeight: 1.2 }}>
          Impacto Real da TR nos Últimos 36 Meses
        </h1>
        <p style={{ fontSize: 15, color: '#6b7280', margin: 0, maxWidth: 620 }}>
          Veja mês a mês quanto a Taxa Referencial corrigiu o saldo devedor e aumentou a parcela de um financiamento como o seu — com dados reais do Banco Central do Brasil.
        </p>
      </div>

      {/* ── Formulário ────────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 16, padding: '24px', marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: '0 0 20px' }}>Parâmetros do financiamento</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.3px' }}>Valor financiado</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #d1d5db', borderRadius: 10, overflow: 'hidden', height: 44 }}>
              <span style={{ padding: '0 10px', fontSize: 13, color: '#6b7280', background: '#f9fafb', height: '100%', display: 'flex', alignItems: 'center', borderRight: '1px solid #e5e7eb', flexShrink: 0 }}>R$</span>
              <input
                inputMode="numeric"
                value={valorInput}
                onChange={e => setValorInput(fmtInput(e.target.value))}
                style={{ flex: 1, height: '100%', border: 'none', outline: 'none', padding: '0 12px', fontSize: 14, fontFamily: 'inherit', background: '#fff' }}
              />
            </div>
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.3px' }}>Taxa a.a. + TR (%)</label>
            <input
              value={taxaInput}
              onChange={e => setTaxaInput(e.target.value)}
              placeholder="11,19"
              style={{ width: '100%', boxSizing: 'border-box', height: 44, border: '1.5px solid #d1d5db', borderRadius: 10, padding: '0 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
            />
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.3px' }}>Prazo (meses)</label>
            <input
              inputMode="numeric"
              value={prazoInput}
              onChange={e => setPrazoInput(e.target.value.replace(/\D/g, ''))}
              placeholder="360"
              style={{ width: '100%', boxSizing: 'border-box', height: 44, border: '1.5px solid #d1d5db', borderRadius: 10, padding: '0 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', flex: '0 0 auto' }}>
            <button
              onClick={calcular}
              style={{ height: 44, padding: '0 28px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Calcular impacto
            </button>
          </div>
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 12, color: '#9ca3af' }}>
          Sistema SAC (amortização constante) — padrão dos financiamentos com TR no Brasil.
          Período: <strong>Jun/2023 a Mai/2026</strong> · Fonte: BCB Série 226
        </p>
      </div>

      {/* ── Resultado ─────────────────────────────────────────────────────────── */}
      {calculado && resultado && (() => {
        const r = resultado;
        const mediaImpacto = r.totalImpactoParcelas / 36;

        return (
          <>
            {/* Cards de resumo */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
              <CardResumo
                label="Custo total da TR nas parcelas"
                valor={formatBRL(r.totalImpactoParcelas)}
                sub="Soma de 36 meses de impacto"
                cor="#dc2626"
                destaque
              />
              <CardResumo
                label="Saldo devedor maior (hoje)"
                valor={formatBRL(r.diferencaSaldo)}
                sub="Acumulado de TR não amortizado"
                cor="#d97706"
              />
              <CardResumo
                label="Impacto médio por parcela"
                valor={`${formatBRL(mediaImpacto)}/mês`}
                sub="Média dos 36 meses"
                cor="#2563eb"
              />
              <CardResumo
                label="TR acumulada no período"
                valor={`${trAcumuladaStr}%`}
                sub={`Média ${trMedioStr}%/mês`}
                cor="#059669"
              />
            </div>

            {/* Destaque saldo devedor */}
            <div style={{ background: '#fefce8', border: '1.5px solid #fde047', borderRadius: 12, padding: '14px 18px', marginBottom: 28, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <strong style={{ fontSize: 14, color: '#713f12' }}>Saldo devedor após 36 meses:</strong>
                <div style={{ display: 'flex', gap: 24, marginTop: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>
                    <span style={{ color: '#9ca3af' }}>Sem TR:</span> <strong>{formatBRL(r.saldoFinalSemTR)}</strong>
                  </span>
                  <span style={{ fontSize: 13, color: '#374151' }}>
                    <span style={{ color: '#9ca3af' }}>Com TR real:</span> <strong style={{ color: '#dc2626' }}>{formatBRL(r.saldoFinalComTR)}</strong>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#dc2626' }}>
                    +{formatBRL(r.diferencaSaldo)} a mais no saldo devedor
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#92400e', maxWidth: 280 }}>
                Você pagou {formatBRL(r.totalImpactoParcelas)} a mais nas parcelas E ainda assim seu saldo devedor é {formatBRL(r.diferencaSaldo)} maior. Esse é o efeito composto da TR.
              </div>
            </div>

            {/* Tabela */}
            <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 16, overflow: 'hidden', marginBottom: 28 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                  Evolução mês a mês — {TR_HISTORICO_36M.length} meses
                </h2>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Toque em qualquer linha para ver o detalhamento</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.4px' }}>Mês</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>TR%</th>
                      <th className="hide-sm" style={{ padding: '10px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Saldo Devedor</th>
                      <th className="hide-sm" style={{ padding: '10px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>Correção TR</th>
                      <th className="hide-md" style={{ padding: '10px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Parcela s/ TR</th>
                      <th style={{ padding: '10px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#111827', textTransform: 'uppercase' }}>Parcela c/ TR</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>+TR (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.meses.map((m, i) => (
                      <LinhaTabela key={m.label} m={m} i={i} />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f1f5f9', borderTop: '2px solid #e5e7eb' }}>
                      <td colSpan={2} style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: '#374151' }}>TOTAL 36 MESES</td>
                      <td className="hide-sm" style={{ padding: '12px 10px', textAlign: 'right', fontSize: 13, color: '#6b7280' }}>—</td>
                      <td className="hide-sm" style={{ padding: '12px 10px', textAlign: 'right', fontSize: 13, fontWeight: 800, color: '#ef4444' }}>+{formatBRL(r.totalCorrecaoSaldo)}</td>
                      <td className="hide-md" style={{ padding: '12px 10px', textAlign: 'right', color: '#6b7280' }}>—</td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', color: '#374151' }}>—</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontSize: 14, fontWeight: 900, color: '#dc2626' }}>+{formatBRL(r.totalImpactoParcelas)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Explicação técnica ─────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 16, padding: '28px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
          📐 Como a TR é aplicada sobre o financiamento
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>

          {/* Passo 1 */}
          <div style={{ background: '#eff6ff', borderRadius: 12, padding: '18px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1d4ed8', marginBottom: 10 }}>① Correção do saldo devedor</div>
            <p style={{ fontSize: 13, color: '#1e40af', margin: '0 0 10px', lineHeight: 1.6 }}>
              No início de cada mês, o banco corrige o saldo devedor pela TR antes de qualquer outro cálculo:
            </p>
            <div style={{ background: '#dbeafe', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 13, color: '#1e3a8a' }}>
              Saldo Corrigido = Saldo × (1 + TR%)
            </div>
            <p style={{ fontSize: 12, color: '#3b82f6', margin: '10px 0 0' }}>
              Exemplo com TR de 0,1679% e saldo de R$ 350.000:<br />
              Correção = R$ 350.000 × 0,1679% = <strong>R$ 587,65</strong>
            </p>
          </div>

          {/* Passo 2 */}
          <div style={{ background: '#fef3c7', borderRadius: 12, padding: '18px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e', marginBottom: 10 }}>② Juros calculados sobre o saldo corrigido</div>
            <p style={{ fontSize: 13, color: '#78350f', margin: '0 0 10px', lineHeight: 1.6 }}>
              A taxa de juros contratada incide sobre o saldo já corrigido pela TR — por isso a TR eleva os juros mensais:
            </p>
            <div style={{ background: '#fde68a', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 13, color: '#78350f' }}>
              Juros = Saldo Corrigido × Taxa Mensal
            </div>
            <p style={{ fontSize: 12, color: '#b45309', margin: '10px 0 0' }}>
              Com taxa de 11,19% a.a. (≈ 0,885%/mês):<br />
              Juros = R$ 350.587,65 × 0,885% = <strong>R$ 3.102,70</strong>
            </p>
          </div>

          {/* Passo 3 */}
          <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '18px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#14532d', marginBottom: 10 }}>③ Amortização fixa (SAC)</div>
            <p style={{ fontSize: 13, color: '#166534', margin: '0 0 10px', lineHeight: 1.6 }}>
              No SAC, a amortização mensal é sempre fixa — não muda com a TR. Só os juros variam:
            </p>
            <div style={{ background: '#bbf7d0', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 13, color: '#14532d' }}>
              Amort = Valor Financiado ÷ Prazo<br />
              Parcela = Amort + Juros
            </div>
            <p style={{ fontSize: 12, color: '#15803d', margin: '10px 0 0' }}>
              R$ 350.000 ÷ 360 meses = R$ 972,22/mês de amortização.<br />
              Parcela = R$ 972,22 + R$ 3.102,70 = <strong>R$ 4.074,92</strong>
            </p>
          </div>

          {/* Passo 4 */}
          <div style={{ background: '#fef2f2', borderRadius: 12, padding: '18px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#991b1b', marginBottom: 10 }}>④ O efeito no saldo devedor</div>
            <p style={{ fontSize: 13, color: '#7f1d1d', margin: '0 0 10px', lineHeight: 1.6 }}>
              A amortização abate o saldo corrigido — não o saldo original. Com TR positiva, o saldo devedor cai mais devagar do que sem TR:
            </p>
            <div style={{ background: '#fecaca', borderRadius: 8, padding: '10px 14px', fontFamily: 'monospace', fontSize: 13, color: '#991b1b' }}>
              Novo Saldo = Saldo Corrigido − Amortização
            </div>
            <p style={{ fontSize: 12, color: '#b91c1c', margin: '10px 0 0' }}>
              Ao longo de 36 meses, a TR acumula <strong>no saldo devedor</strong> além de elevar as parcelas.
            </p>
          </div>
        </div>

        {/* Linha do tempo TR */}
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>
            TR mensal dos últimos 36 meses — visão geral
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }}>
            {TR_HISTORICO_36M.map(({ label, tr }) => {
              const maxTR = 0.25;
              const h = Math.max(4, (tr / maxTR) * 56);
              const cor = tr > 0.15 ? '#dc2626' : tr > 0.08 ? '#d97706' : '#3b82f6';
              return (
                <div key={label} title={`${label}: ${fmt(tr, 4)}%`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ width: '100%', height: `${h}px`, background: cor, borderRadius: '2px 2px 0 0', opacity: .85 }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#9ca3af' }}>
            <span>Jun/23</span><span>Jun/24</span><span>Jun/25</span><span>Mai/26</span>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#6b7280' }}>
            <span><span style={{ color: '#dc2626' }}>■</span> TR &gt; 0,15%</span>
            <span><span style={{ color: '#d97706' }}>■</span> TR 0,05–0,15%</span>
            <span><span style={{ color: '#3b82f6' }}>■</span> TR &lt; 0,05%</span>
            <span style={{ marginLeft: 'auto' }}>TR acumulada 36m: <strong>{trAcumuladaStr}%</strong></span>
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#9ca3af', margin: '16px 0 0' }}>
          Fonte dos dados: Banco Central do Brasil — Nota de Política Monetária, Série Histórica 226.
          Cálculo: SAC com amortização constante e correção mensal pelo indexador TR.
          Os valores são informativos e podem diferir do contrato bancário por arredondamentos e regras específicas de cada instituição.
        </p>
      </div>

      {/* CSS responsivo */}
      <style>{`
        @media (max-width: 640px) {
          .hide-sm { display: none !important; }
        }
        @media (max-width: 820px) {
          .hide-md { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default function HistoricoTRPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Carregando...</div>}>
      <HistoricoTRContent />
    </Suspense>
  );
}
