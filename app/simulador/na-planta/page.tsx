'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  formatBRL, parcelaPrice, calcularSeguros,
  TAXA_SBPE_ANUAL, detectarFaixaMCMV, motivoSBPE, calcSubsidioEstimado,
  FAIXAS_MCMV, type FaixaMCMV,
} from '@/lib/calculos';
import Link from 'next/link';
import BuscaImoveisInteligente from '@/components/BuscaImoveisInteligente';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
type Estagio = 'lancamento' | 'obras' | 'pronto';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function p(s: string): number { return Number(s.replace(/\D/g, '')) || 0; }
function fi(s: string): string { const n = s.replace(/\D/g, ''); return n ? Number(n).toLocaleString('pt-BR') : ''; }

/**
 * SIOPI — Sistema de Operações Imobiliárias da CEF
 * Juros evolutivos: comprador paga juros sobre o valor já liberado à construtora.
 * 1ª medição = avaliação do terreno (~10–25% do financiamento).
 */
function calcJurosEvo(financiado: number, taxaAnual: number, siopiFrac: number): number {
  return Math.round(financiado * (taxaAnual / 100 / 12) * siopiFrac);
}

function salvarContexto(data: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try { sessionStorage.setItem('fc_sim_context', JSON.stringify(data)); } catch { /* ignore */ }
}

// ──────────────────────────────────────────────────────────────────────────────
// UI Components
// ──────────────────────────────────────────────────────────────────────────────
function CampoValor({ label, hint, value, onChange, placeholder }: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: '24px' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '8px', borderBottom: `2px solid ${focused ? 'var(--primary)' : 'var(--border)'}`, transition: 'border-color 0.2s' }}>
        <span className="fc-input-brl-prefix" style={{ fontSize: '22px', fontWeight: '300', lineHeight: 1, color: focused ? 'var(--primary)' : 'var(--text-faint)', transition: 'color 0.2s', flexShrink: 0 }}>R$</span>
        <input
          type="text" inputMode="numeric" value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? '0'}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          className="fc-input-brl"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: '26px', fontWeight: '700', color: 'var(--text)', background: 'transparent', padding: 0, fontVariantNumeric: 'tabular-nums' }}
        />
      </div>
      {hint && <p style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '6px' }}>{hint}</p>}
    </div>
  );
}

function CampoCompacto({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
      <span style={{ padding: '9px 11px', fontSize: '13px', color: 'var(--text-muted)', background: 'var(--bg)', borderRight: '1px solid var(--border)', flexShrink: 0 }}>R$</span>
      <input
        type="text" inputMode="numeric" value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ flex: 1, padding: '9px 12px', border: 'none', outline: 'none', fontSize: '14px', color: 'var(--text)', background: 'transparent' }}
      />
    </div>
  );
}

function Select({ value, onChange, children }: {
  value: string | number; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ padding: '9px 10px', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '13px', background: 'var(--bg-card)', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}>
      {children}
    </select>
  );
}

function LinhaDetalhe({ label, valor, sub, destaque }: {
  label: string; valor: string; sub?: string; destaque?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1, paddingRight: '14px' }}>
        <p style={{ fontSize: '13px', color: destaque ? 'var(--text)' : 'var(--text-muted)', fontWeight: destaque ? '600' : '400' }}>{label}</p>
        {sub && <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>{sub}</p>}
      </div>
      <span style={{ fontSize: destaque ? '15px' : '14px', fontWeight: '700', color: 'var(--text)', whiteSpace: 'nowrap' }}>{valor}</span>
    </div>
  );
}

function BlocoFluxo({ emoji, titulo, cor, children, ultimo }: {
  emoji: string; titulo: string; cor: string; children: React.ReactNode; ultimo?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: '14px', marginBottom: ultimo ? 0 : '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: cor + '18', border: `1.5px solid ${cor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
          {emoji}
        </div>
        {!ultimo && <div style={{ width: '2px', flex: 1, background: 'var(--border)', marginTop: '6px', minHeight: '24px' }} />}
      </div>
      <div style={{ flex: 1, paddingBottom: ultimo ? 0 : '10px' }}>
        <p style={{ fontSize: '11px', fontWeight: '700', color: cor, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>{titulo}</p>
        {children}
      </div>
    </div>
  );
}

// Numerador de passo no fluxo
function NumStep({ n, cor }: { n: number | string; cor?: string }) {
  return (
    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: cor ?? 'var(--primary)', color: '#fff', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {n}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────
function NaPlantaContent() {
  const sp = useSearchParams();

  // URL params vindos do simulador principal
  const rendaUrl    = Number(sp.get('renda')    || 0);
  const maxFinMcmv  = Number(sp.get('mcmv')     || 0);
  const maxFinSbpe  = Number(sp.get('sbpe')     || 0);
  const fgtsUrl     = Number(sp.get('fgts')     || 0);

  // Renda
  const [rendaRaw, setRendaRaw] = useState('');
  const rendaDigitada = p(rendaRaw);
  const renda = rendaUrl > 0 ? rendaUrl : rendaDigitada;

  // Tipo de imóvel
  const [tipoImovel, setTipoImovel] = useState<'residencial' | 'comercial'>('residencial');

  // Estágio
  const [estagio, setEstagio] = useState<Estagio>('lancamento');
  const [siopiPctRaw, setSiopiPctRaw] = useState<string>('15');

  useEffect(() => {
    if (estagio === 'lancamento') setSiopiPctRaw('15');
    else if (estagio === 'obras') setSiopiPctRaw('50');
  }, [estagio]);

  const siopiInicial = estagio === 'pronto'
    ? 1.0
    : Math.min(1, Math.max(0, Number(siopiPctRaw.replace(',', '.') || '0') / 100));

  // Valor do imóvel
  const [valorRaw, setValorRaw] = useState('');
  const valor = p(valorRaw);

  // ── Fluxo de pagamento à construtora ─────────────────────────────────────────
  // 1. FGTS
  const [fgtsRaw, setFgtsRaw]       = useState(() => fgtsUrl > 0 ? fi(String(fgtsUrl)) : '');
  const fgts = p(fgtsRaw);

  // 2. Ato (pagamento na assinatura — recursos próprios do comprador)
  const [atoRaw, setAtoRaw]         = useState('');
  const ato = p(atoRaw);

  // 3. Sinais / iniciais (primeiros meses após o ato)
  const [iniciaisRaw, setIniciaisRaw] = useState('');
  const [qtdIniciais, setQtdIniciais] = useState(2);
  const iniciaisUnit = p(iniciaisRaw);
  const iniciais = iniciaisUnit * qtdIniciais;

  // 4. Parcelas mensais durante a obra
  const [mensalRaw, setMensalRaw]   = useState('');
  const [qtdMensais, setQtdMensais] = useState(36);
  const mensalUnit = p(mensalRaw);
  const totalMensais = mensalUnit * qtdMensais;

  // 5. Anuais / reforços (normalmente dezembro)
  const [anuaisRaw, setAnuaisRaw]   = useState('');
  const [qtdAnuais, setQtdAnuais]   = useState(2);
  const anuaisUnit = p(anuaisRaw);
  const totalAnuais = anuaisUnit * qtdAnuais;

  // 6. Parcela nas chaves (opcional)
  const [unicaRaw, setUnicaRaw]     = useState('');
  const unica = p(unicaRaw);

  // ── Cálculos ──────────────────────────────────────────────────────────────────
  const faixaRenda = detectarFaixaMCMV(renda);

  // Tenta todas as faixas elegíveis pela renda (igual ao simulador principal)
  // Renda de R$4k pode usar F2 (teto 275k), F3 (teto 400k) ou F4 (teto 600k)
  const faixaEfetiva: FaixaMCMV | null = (() => {
    if (renda <= 0 || valor <= 0) return null;
    for (const f of FAIXAS_MCMV) {
      if (renda > f.rendaMax) continue;
      if (valor <= f.teto) return f;
      if (f.subsidioMax > 0) {
        const sub = calcSubsidioEstimado(f, renda, valor, true, true, false, 0);
        if (sub > 0 && valor - sub <= f.teto) return f;
      }
    }
    return null;
  })();

  const isMCMV = faixaEfetiva !== null;
  const taxa   = isMCMV && faixaEfetiva ? faixaEfetiva.taxaRef : TAXA_SBPE_ANUAL;
  const motivo = (!isMCMV && renda > 0 && valor > 0) ? motivoSBPE(renda, valor) : null;

  const maxFinPerfil = isMCMV ? maxFinMcmv : maxFinSbpe;
  const ltvPct       = isMCMV ? (faixaEfetiva?.ltvMax ?? 0.80) : 0.80;
  const maxFinBanco  = valor > 0
    ? (maxFinPerfil > 0 ? Math.min(maxFinPerfil, Math.round(valor * ltvPct)) : Math.round(valor * ltvPct))
    : 0;
  const entradaMinima = Math.max(0, valor - maxFinBanco);

  // Subsídio (apenas MCMV F1 e F2 — renda ≤ R$ 5.000)
  const subsidioEstimado = isMCMV && faixaEfetiva && faixaEfetiva.subsidioMax > 0 && valor > 0
    ? calcSubsidioEstimado(faixaEfetiva, renda, valor, true, true, false, 0)
    : 0;
  const temSubsidio = subsidioEstimado > 0;

  // Recursos externos (FGTS + subsídio — não vão para a construtora)
  const recursosExternos = fgts + subsidioEstimado;

  // Total pago à construtora durante a obra
  const totalConstrutora = ato + iniciais + totalMensais + totalAnuais + unica;

  // Contribuição total = recursos externos + pagamentos à construtora
  const totalContribuicao = recursosExternos + totalConstrutora;

  // Financiamento real
  const financiado = valor > 0
    ? Math.max(0, Math.min(maxFinBanco, valor - totalContribuicao))
    : 0;

  // Quanto falta após FGTS + subsídio (deve ser coberto via construtora)
  const faltaParaConstrutora = Math.max(0, entradaMinima - recursosExternos);
  const precisaPagarConstrutora = faltaParaConstrutora > 0;

  // Juros evolutivos
  // Planilha SIOPI real (contrato 878772572708-3, Faixa 3, R$267k, 413 meses):
  //   Seguros FIXOS no valor total financiado durante toda a obra — NÃO proporcionais ao liberado.
  //   MIP R$50,86 + DFI R$24,85 + TX ADM R$25,00 = R$100,71/mês constante (36 meses de obra).
  //   Encargo real: mês 1 R$480,96 → mês 36 R$1.738,85 → pós-entrega R$1.966,27
  const seguros      = calcularSeguros(financiado);                            // seguros FIXOS no valor total financiado (obra + pós-entrega)
  const parcelaFin   = parcelaPrice(financiado, taxa, 35 * 12);
  const jurosEvo1    = isMCMV && financiado > 0 && siopiInicial > 0           // encargo inicial: juros sobre valor liberado + seguros fixos totais
    ? calcJurosEvo(financiado, taxa, siopiInicial) + seguros.total
    : 0;
  const jurosEvoPico = isMCMV && financiado > 0                               // encargo máximo (100% liberado, últimos meses da obra)
    ? calcJurosEvo(financiado, taxa, 1.0) + seguros.total
    : 0;
  const jurosEvoMedio = isMCMV && financiado > 0                              // encargo médio da obra (coef 0,655 = fração média liberada)
    ? Math.round(parcelaFin * 0.655 + seguros.total)
    : 0;

  // Regra dos 30%
  const limite30 = renda * 0.30;
  const burden   = mensalUnit + jurosEvo1;
  const ok30     = burden <= limite30 || mensalUnit === 0;

  // Saldos intermediários
  const saldoAposAto   = Math.max(0, faltaParaConstrutora - ato);
  const saldoNaEntrega = Math.max(0, faltaParaConstrutora - ato - iniciais - totalMensais - totalAnuais);

  // Válido para mostrar resultado completo
  const temDados = valor > 0 && renda > 0;
  const valido   = temDados && ato > 0;

  // ── saveSimContext para o João ────────────────────────────────────────────────
  useEffect(() => {
    if (!valido) return;
    salvarContexto({
      page: '/simulador/na-planta',
      renda, fgts,
      planta: {
        valorImovel: valor,
        prazoObraMeses: qtdMensais,
        estagio: estagio === 'lancamento' ? 'Na planta' : estagio === 'obras' ? 'Em obras' : 'Pronto / Habite-se',
        siopiLiberado: `${Math.round(siopiInicial * 100)}%`,
        modalidade: isMCMV ? (faixaEfetiva ? `MCMV ${faixaEfetiva.label}` : 'MCMV') : 'SBPE',
        taxaAnual: taxa,
        // Pagamentos à construtora
        ato,
        mensalValor: mensalUnit,
        mensalQtd: qtdMensais,
        totalConstrutora,
        // Juros evolutivos ao banco durante a obra
        jurosEvoInicio: Math.round(jurosEvo1),
        jurosEvoMedio: Math.round(jurosEvoMedio),
        jurosEvoPico: Math.round(jurosEvoPico),
        // Resultado financeiro
        entradaMinima,
        fgtsUsado: fgts,
        subsidioEstimado,
        valorFinanciado: financiado,
        parcelaPosObra: Math.round(parcelaFin + seguros.total),
        seguros: Math.round(seguros.total),
        // Análise
        recursosExternos,
        precisaPagarConstrutora,
        faltaParaConstrutora: Math.max(0, entradaMinima - recursosExternos),
      },
      resultado: {
        valorImovel: valor, entradaMinima, recursosExternos,
        fgts, subsidioEstimado, totalConstrutora, totalContribuicao,
        precisaPagarConstrutora, valorFinanciado: financiado,
        taxaAnual: taxa, parcela: Math.round(parcelaFin + seguros.total),
      },
    });
  }, [valido, valor, renda, estagio, isMCMV, financiado, taxa, fgts, subsidioEstimado, qtdMensais, parcelaFin, seguros.total, entradaMinima, recursosExternos, totalContribuicao, totalConstrutora, precisaPagarConstrutora, siopiInicial, ato]);

  // ── Configuração dos estágios ─────────────────────────────────────────────────
  const estagioConfig: Record<Estagio, { label: string; desc: string; color: string; aviso?: string }> = {
    lancamento: { label: 'Na planta', desc: 'Obra não iniciada', color: '#2563eb' },
    obras:      { label: 'Em obras',  desc: 'Medições ativas',  color: '#d97706' },
    pronto:     {
      label: 'Pronto / Habite-se', desc: 'Entrega imediata', color: '#16a34a',
      aviso: 'Imóvel com habite-se emitido — use o Simulador principal (financiamento padrão, sem juros evolutivos).',
    },
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="fc-hero-np" style={{
        background: 'linear-gradient(160deg, #0f172a 0%, #1a2e4a 55%, #0f172a 100%)',
        padding: '64px 24px 80px', textAlign: 'center',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Link href="/simulador" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,.45)', fontSize: '12px', textDecoration: 'none', marginBottom: '24px' }}>
            ← Simulador principal
          </Link>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(234,88,12,.15)', border: '1px solid rgba(234,88,12,.3)', borderRadius: '99px', padding: '5px 14px', marginBottom: '20px' }}>
            <span style={{ fontSize: '14px' }}>🏗️</span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#fb923c', letterSpacing: '0.8px', textTransform: 'uppercase' }}>Imóvel na planta</span>
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 5vw, 38px)', fontWeight: '800', color: '#fff', lineHeight: 1.2, marginBottom: '14px' }}>
            Simule o fluxo real<br />da construtora
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.55)', lineHeight: 1.7 }}>
            Ato · sinais · mensais · anuais · chaves · juros evolutivos MCMV · crédito associativo
          </p>
          {rendaUrl > 0 && (
            <div style={{ display: 'inline-flex', gap: '16px', marginTop: '24px', background: 'rgba(255,255,255,.08)', borderRadius: '12px', padding: '12px 20px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.7)' }}><strong style={{ color: '#fff' }}>Renda:</strong> {formatBRL(rendaUrl)}/mês</span>
              {faixaRenda && <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.7)' }}><strong style={{ color: '#4ade80' }}>MCMV {faixaRenda.label}</strong></span>}
              {maxFinMcmv > 0 && <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.7)' }}><strong style={{ color: '#fff' }}>Fin. aprovado:</strong> {formatBRL(maxFinMcmv)}</span>}
            </div>
          )}
        </div>
      </section>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="fc-content-np" style={{ maxWidth: '680px', margin: '-40px auto 0', padding: '0 16px 80px', position: 'relative', zIndex: 1 }}>

        {/* ── CARD 1: Dados do imóvel ───────────────────────────────────── */}
        <div className="fc-card-inner" style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)', padding: '32px 28px', boxShadow: '0 4px 40px rgba(0,0,0,.10)', marginBottom: '16px' }}>

          {/* Renda (modo standalone) */}
          {rendaUrl === 0 && (
            <div style={{ marginBottom: '28px', paddingBottom: '28px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>Seu perfil financeiro</p>
              <CampoValor label="Renda familiar bruta" placeholder="6.000" value={rendaRaw} onChange={v => setRendaRaw(fi(v))} hint="Usamos a renda para identificar MCMV ou SBPE e verificar o limite de 30%" />
              {rendaDigitada > 0 && faixaRenda && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px', marginTop: '-8px' }}>
                  <p style={{ fontSize: '13px', color: '#15803d' }}>✅ <strong>MCMV {faixaRenda.label}</strong> — taxa {faixaRenda.taxaRef.toFixed(2).replace('.', ',')}% a.a. · teto {formatBRL(faixaRenda.teto)}</p>
                </div>
              )}
              {rendaDigitada > 0 && !faixaRenda && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 14px', marginTop: '-8px' }}>
                  <p style={{ fontSize: '13px', color: '#1d4ed8' }}>💼 <strong>Perfil SBPE</strong> — taxa Caixa {TAXA_SBPE_ANUAL.toFixed(2).replace('.', ',')}% a.a. + TR · FGTS permitido</p>
                </div>
              )}
            </div>
          )}

          {/* Valor do imóvel */}
          <CampoValor label="Valor do imóvel (tabela da construtora)" placeholder="350.000" value={valorRaw} onChange={v => setValorRaw(fi(v))} />

          {/* Badge MCMV / SBPE */}
          {valor > 0 && renda > 0 && (
            <div style={{ marginBottom: '20px', marginTop: '-8px' }}>
              {isMCMV ? (
                <span style={{ fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '99px', display: 'inline-block', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                  ✅ MCMV {faixaEfetiva!.label} — {faixaEfetiva!.taxaRef.toFixed(2).replace('.', ',')}% a.a. · teto {formatBRL(faixaEfetiva!.teto)}
                </span>
              ) : (
                <div>
                  <span style={{ fontSize: '12px', fontWeight: '700', padding: '3px 10px', borderRadius: '99px', display: 'inline-block', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                    ℹ️ SBPE / Mercado — {TAXA_SBPE_ANUAL.toFixed(2).replace('.', ',')}% a.a.
                  </span>
                  {motivo && <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '5px', paddingLeft: '2px' }}>↳ {motivo}</p>}
                </div>
              )}
            </div>
          )}

          {/* Estágio */}
          <div>
            <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>Estágio do empreendimento</p>
            <div className="fc-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {(Object.entries(estagioConfig) as [Estagio, typeof estagioConfig[Estagio]][]).map(([key, cfg]) => (
                <button key={key} onClick={() => setEstagio(key)} style={{ padding: '12px 8px', borderRadius: '12px', cursor: 'pointer', border: `2px solid ${estagio === key ? cfg.color : 'var(--border)'}`, background: estagio === key ? cfg.color + '12' : 'var(--bg)', textAlign: 'center', transition: 'all 0.15s' }}>
                  <p style={{ fontSize: '12px', fontWeight: '700', color: estagio === key ? cfg.color : 'var(--text)', marginBottom: '2px' }}>{cfg.label}</p>
                  <p style={{ fontSize: '10px', color: 'var(--text-faint)' }}>{cfg.desc}</p>
                </button>
              ))}
            </div>
            {estagioConfig[estagio].aviso && (
              <div style={{ marginTop: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px 14px' }}>
                <p style={{ fontSize: '12px', color: '#92400e', lineHeight: 1.55 }}>⚠️ {estagioConfig[estagio].aviso}</p>
              </div>
            )}
          </div>

          {/* ── Tipo de imóvel ────────────────────────────────────────── */}
          <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>Tipo de imóvel</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {([
                { val: 'residencial' as const, icon: '🏠', label: 'Residencial' },
                { val: 'comercial'   as const, icon: '🏢', label: 'Comercial' },
              ]).map(({ val, icon, label }) => (
                <button key={val} onClick={() => setTipoImovel(val)}
                  style={{ flex: 1, padding: '12px 8px', borderRadius: '12px', cursor: 'pointer', border: `2px solid ${tipoImovel === val ? 'var(--primary)' : 'var(--border)'}`, background: tipoImovel === val ? 'rgba(37,99,235,.08)' : 'var(--bg)', textAlign: 'center', transition: 'all 0.15s' }}>
                  <p style={{ fontSize: '18px', marginBottom: '3px' }}>{icon}</p>
                  <p style={{ fontSize: '12px', fontWeight: '700', color: tipoImovel === val ? 'var(--primary)' : 'var(--text-muted)' }}>{label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── CARD 2: Fluxo de pagamento à construtora ─────────────────── */}
        {temDados && estagio !== 'pronto' && (
          <div className="fc-card-inner" style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)', padding: '32px 28px', boxShadow: '0 4px 24px rgba(0,0,0,.06)', marginBottom: '16px' }}>

            <p style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>
              Fluxo de pagamento à construtora
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
              {precisaPagarConstrutora
                ? `Entrada mínima estimada: ${formatBRL(entradaMinima)}${recursosExternos > 0 ? ` · FGTS${temSubsidio ? ' + subsídio' : ''}: ${formatBRL(recursosExternos)}` : ''} · falta cobrir via construtora: ${formatBRL(faltaParaConstrutora)}`
                : `✅ FGTS${temSubsidio ? ' + subsídio MCMV' : ''} (${formatBRL(recursosExternos)}) cobrem a entrada mínima estimada (${formatBRL(entradaMinima)}).`}
            </p>

            {/* Nota sobre avaliação Caixa no MCMV */}
            {isMCMV && (
              <div style={{ marginBottom: '20px', padding: '12px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', fontSize: '12px', color: '#166534', lineHeight: 1.7 }}>
                <strong>💡 Como funciona na prática no MCMV:</strong><br />
                A Caixa avalia o imóvel pela tabela interna — geralmente <strong>acima do preço da construtora</strong>. O financiamento (80% da avaliação) pode cobrir mais de 80% do valor que você paga. Com FGTS, banco + FGTS juntos costumam cobrir <strong>90% a 100% do preço da construtora</strong>.<br /><br />
                {faixaEfetiva && (faixaEfetiva.subsidioMax > 0)
                  ? `Na ${faixaEfetiva.label}, o subsídio de até ${formatBRL(faixaEfetiva.subsidioMax)} + FGTS pode zerar sua entrada. A saída de caixa real costuma ser apenas ITBI (~2%) + cartório (~1%) + ato à construtora.`
                  : `Na ${faixaEfetiva?.label ?? 'sua faixa'}, sem subsídio, o FGTS cobre a maior parte. A saída de caixa real costuma ser ITBI (~2%) + cartório (~1%) + ato à construtora (geralmente R$ 1.000 a R$ 5.000).`}
              </div>
            )}

            {/* Custos extras obrigatórios (ITBI + cartório) */}
            {isMCMV && valor > 0 && (
              <div style={{ marginBottom: '20px', padding: '10px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', fontSize: '12px', color: '#92400e', lineHeight: 1.7 }}>
                <strong>⚠️ Custos adicionais (fora do financiamento):</strong><br />
                • ITBI: ~2% do valor = <strong>{formatBRL(Math.round(valor * 0.02))}</strong><br />
                • Registro em cartório: ~1% do valor = <strong>{formatBRL(Math.round(valor * 0.01))}</strong><br />
                • Total estimado: <strong>{formatBRL(Math.round(valor * 0.03))}</strong><br /><br />
                <strong>Algumas construtoras isentam o comprador de ITBI e registro.</strong> Consulte a construtora.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* ① FGTS */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <NumStep n={1} cor="#059669" />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>FGTS disponível</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Saldo da conta FGTS — reduz o valor financiado</p>
                  </div>
                </div>
                <CampoCompacto value={fgtsRaw} onChange={v => setFgtsRaw(fi(v))} placeholder="0" />
                {/* Subsídio auto-calculado */}
                {temSubsidio && (
                  <div style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#15803d', marginBottom: '2px' }}>
                      🏦 + Subsídio MCMV {faixaEfetiva?.label}: <strong>{formatBRL(subsidioEstimado)}</strong>
                    </p>
                    <p style={{ fontSize: '11px', color: '#166534' }}>
                      Aplicado automaticamente · valor exato confirmado na Caixa Econômica Federal
                    </p>
                  </div>
                )}
                {isMCMV && faixaEfetiva && !temSubsidio && (
                  <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '6px' }}>
                    ℹ️ MCMV {faixaEfetiva.label} — sem subsídio (disponível apenas nas Faixas 1 e 2)
                  </p>
                )}
              </div>

              <div style={{ height: '1px', background: 'var(--border)' }} />

              {/* ② Ato */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <NumStep n={2} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>Ato — pagamento na assinatura</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Valor pago à construtora na assinatura do contrato</p>
                  </div>
                </div>
                <CampoCompacto value={atoRaw} onChange={v => setAtoRaw(fi(v))} placeholder={isMCMV ? '1.000' : '14.000'} />
                {isMCMV && !ato && (
                  <p style={{ fontSize: '11px', color: '#059669', marginTop: '5px' }}>
                    💡 No MCMV, a construtora costuma pedir R$ 1.000 a R$ 5.000 no ato.
                  </p>
                )}
                {ato > 0 && faltaParaConstrutora > 0 && (
                  <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '6px' }}>
                    Saldo restante após ato: {formatBRL(saldoAposAto)} · sujeito a reajuste INCC
                  </p>
                )}
              </div>

              {/* ③ Sinais / iniciais */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <NumStep n={3} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>Sinais / iniciais (opcional)</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Parcelas de entrada nos primeiros meses após o ato</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                  <CampoCompacto value={iniciaisRaw} onChange={v => setIniciaisRaw(fi(v))} placeholder="0" />
                  <Select value={qtdIniciais} onChange={v => setQtdIniciais(Number(v))}>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>× {n}</option>)}
                  </Select>
                </div>
                {iniciaisUnit > 0 && <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '5px' }}>Total: {formatBRL(iniciais)}</p>}
              </div>

              {/* ④ Mensais */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <NumStep n={4} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>Parcela mensal durante a obra</p>
                    <p style={{ fontSize: '11px', color: ok30 ? 'var(--text-faint)' : '#dc2626' }}>
                      {ok30
                        ? `Não pode ultrapassar 30% da renda (limite: ${formatBRL(limite30)}/mês)`
                        : `⚠️ Comprometimento acima de 30% — limite: ${formatBRL(limite30)}/mês`}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1', minWidth: '130px' }}>
                    <CampoCompacto value={mensalRaw} onChange={v => setMensalRaw(fi(v))} placeholder={isMCMV ? '100' : '1.900'} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>/mês ×</span>
                    <Select value={qtdMensais} onChange={v => setQtdMensais(Number(v))}>
                      {[24,26,28,30,36,40,43,48].map(n => <option key={n} value={n}>{n}</option>)}
                    </Select>
                  </div>
                </div>
                {isMCMV && !mensalUnit && (
                  <p style={{ fontSize: '11px', color: '#059669', marginTop: '5px' }}>
                    💡 No MCMV, a construtora costuma pedir R$ 100 a R$ 300/mês × 36 meses durante a obra.
                  </p>
                )}
                {mensalUnit > 0 && (
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Total mensais: {formatBRL(totalMensais)}</span>
                    {!ok30 && (
                      <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: '700' }}>
                        Excede em {formatBRL(burden - limite30)}/mês
                        {isMCMV && jurosEvo1 > 0 ? ` (inclui evo. ao banco ~${formatBRL(jurosEvo1)})` : ''}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ⑤ Anuais */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <NumStep n={5} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>Reforços anuais — opcional</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Normalmente em dezembro, conforme tabela da construtora</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                  <CampoCompacto value={anuaisRaw} onChange={v => setAnuaisRaw(fi(v))} placeholder="0" />
                  <Select value={qtdAnuais} onChange={v => setQtdAnuais(Number(v))}>
                    {[1,2,3,4,6,8].map(n => <option key={n} value={n}>× {n}</option>)}
                  </Select>
                </div>
                {anuaisUnit > 0 && <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '5px' }}>Total anuais: {formatBRL(totalAnuais)}</p>}
              </div>

              {/* ⑥ Parcela nas chaves */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <NumStep n={6} />
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>Parcela nas chaves — opcional</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Pagamento maior na entrega das chaves</p>
                  </div>
                </div>
                <CampoCompacto value={unicaRaw} onChange={v => setUnicaRaw(fi(v))} placeholder="0" />
              </div>
            </div>

            {/* ── Resultado da estrutura ─────────────────────────────────── */}
            {ato > 0 && (
              <div style={{ marginTop: '28px', borderRadius: '14px', overflow: 'hidden', border: '1.5px solid var(--border)' }}>
                <div style={{ padding: '16px 18px', background: isMCMV ? '#0f6e56' : '#185fa5' }}>
                  <p style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,.65)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>
                    {isMCMV ? 'MCMV Crédito Associativo' : 'SBPE / Mercado'}
                  </p>
                  <p style={{ fontSize: '30px', fontWeight: '800', color: '#fff', lineHeight: 1 }}>{formatBRL(financiado)}</p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.7)', marginTop: '4px' }}>valor financiado pelo banco</p>
                </div>
                <div style={{ background: 'var(--bg-card)', padding: '16px 18px' }}>
                  {/* ── Composição do poder de compra ─────────────────────── */}
                  {valor > 0 && (
                    <div style={{ marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '11px', fontWeight: '800', color: isMCMV ? '#0f6e56' : '#185fa5', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                        📊 Composição do poder de compra
                      </p>
                      {([
                        { emoji: '🏛️', label: 'Financiamento bancário', val: financiado },
                        { emoji: '💰', label: 'Pagamentos à construtora', val: totalConstrutora },
                        ...(fgts > 0        ? [{ emoji: '🏦', label: 'FGTS', val: fgts }] : []),
                        ...(subsidioEstimado > 0 ? [{ emoji: '🎁', label: `Subsídio MCMV ${faixaEfetiva?.label ?? ''}`, val: subsidioEstimado }] : []),
                      ] as { emoji: string; label: string; val: number }[]).map(({ emoji, label, val }, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {i > 0 && <span style={{ color: '#9CA3AF', marginRight: 4, fontSize: '11px' }}>+</span>}
                            {emoji} {label}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>{formatBRL(val)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0' }}>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: isMCMV ? '#0f6e56' : '#185fa5' }}>= 🏠 Valor total do imóvel</span>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: isMCMV ? '#0f6e56' : '#185fa5' }}>{formatBRL(valor)}</span>
                      </div>
                      {/* Explicação: como o banco calcula (CET / encargo mensal completo) */}
                      {renda > 0 && (
                        <div style={{ marginTop: '10px', padding: '10px 12px', background: '#F1F5F9', borderRadius: '8px', fontSize: '12px', color: '#4B5563', lineHeight: '1.8' }}>
                          <strong style={{ color: isMCMV ? '#0f6e56' : '#185fa5' }}>
                            💡 Como o banco calcula o financiamento
                          </strong>
                          <br />
                          O banco avalia o <strong>encargo mensal completo</strong> — não o valor bruto liberado. O encargo inclui <strong>A+J + MIP + DFI + tarifa</strong> e não pode ultrapassar <strong>30% da renda bruta</strong> (Res. CMN 4.676/2018).
                          <br /><br />
                          Renda <strong>{formatBRL(renda)}/mês</strong> × 30% = <strong>{formatBRL(Math.round(renda * 0.30))}/mês</strong> de encargo máximo.
                          {' '}À taxa de <strong>{taxa.toFixed(2).replace('.', ',')}% a.a.</strong> em 35 anos (incluindo seguros), o banco aprova até <strong>{formatBRL(maxFinBanco)}</strong> (LTV {Math.round(ltvPct * 100)}% do imóvel).{isMCMV ? ' Na prática, a Caixa avalia o imóvel acima do preço de venda — o financiamento pode cobrir mais de 80% do valor pago à construtora.' : ''}
                          {(fgts > 0 || totalContribuicao > 0) && (
                            <span> Com {[fgts > 0 ? `FGTS de ${formatBRL(fgts)}` : null, subsidioEstimado > 0 ? `subsídio de ${formatBRL(subsidioEstimado)}` : null, totalConstrutora > 0 ? `pagamentos à construtora de ${formatBRL(totalConstrutora)}` : null].filter(Boolean).join(' + ')}, o valor financiado pelo banco fica em <strong>{formatBRL(financiado)}</strong>.</span>
                          )}
                          <br />
                          <span style={{ color: '#6B7280' }}>Parcela pós-obra: <strong>{formatBRL(Math.round(parcelaFin + seguros.total))}/mês</strong> ({((parcelaFin + seguros.total) / renda * 100).toFixed(1)}% da renda) — A+J: {formatBRL(Math.round(parcelaFin))}/mês + seguros: {formatBRL(seguros.total)}/mês.</span>
                        </div>
                      )}
                    </div>
                  )}
                  {fgts > 0 && <LinhaDetalhe label="FGTS" valor={`− ${formatBRL(fgts)}`} sub="Aplicado na entrada" />}
                  {temSubsidio && <LinhaDetalhe label={`Subsídio MCMV ${faixaEfetiva?.label}`} valor={`− ${formatBRL(subsidioEstimado)}`} sub="Grant do governo" />}
                  {ato > 0 && <LinhaDetalhe label="Ato (assinatura)" valor={`− ${formatBRL(ato)}`} />}
                  {iniciais > 0 && <LinhaDetalhe label={`Sinais × ${qtdIniciais}`} valor={`− ${formatBRL(iniciais)}`} />}
                  {totalMensais > 0 && <LinhaDetalhe label={`Mensais × ${qtdMensais}`} valor={`− ${formatBRL(totalMensais)}`} />}
                  {totalAnuais > 0 && <LinhaDetalhe label={`Anuais × ${qtdAnuais}`} valor={`− ${formatBRL(totalAnuais)}`} />}
                  {unica > 0 && <LinhaDetalhe label="Parcela nas chaves" valor={`− ${formatBRL(unica)}`} />}
                  <div style={{ borderTop: '2px solid var(--border)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>Parcela pós-entrega</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>{taxa.toFixed(2).replace('.', ',')}% a.a. + TR · Price · 35 anos · inclui seguros</p>
                    </div>
                    <p style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)' }}>{formatBRL(Math.round(parcelaFin + seguros.total))}/mês</p>
                  </div>
                  {isMCMV && jurosEvoMedio > 0 && (
                    <div style={{ marginTop: '12px', padding: '10px 12px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                      <p style={{ fontSize: '12px', fontWeight: '700', color: '#1e40af', marginBottom: '3px' }}>
                        🏦 Juros evolutivos durante a obra (paralelo à construtora)
                      </p>
                      <p style={{ fontSize: '12px', color: '#1d4ed8' }}>
                        Início: ~{formatBRL(jurosEvo1)}/mês · médio: ~{formatBRL(jurosEvoMedio)}/mês · pico: ~{formatBRL(jurosEvoPico)}/mês
                      </p>
                      <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '3px' }}>
                        Pago à Caixa em paralelo às parcelas acima · inclui juros, seguros e taxa de administração
                      </p>
                    </div>
                  )}
                  {saldoNaEntrega > 0 && (
                    <div style={{ marginTop: '10px', padding: '8px 12px', background: '#fffbeb', borderRadius: '10px', border: '1px solid #fde68a' }}>
                      <p style={{ fontSize: '12px', color: '#92400e' }}>
                        ⚠️ Saldo restante na entrega: <strong>{formatBRL(saldoNaEntrega)}</strong> — pago na entrega das chaves · reajustado pelo INCC
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CARD 3: Fluxo de pagamento timeline ──────────────────────── */}
        {valido && (
          <div className="fc-card-inner" style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)', padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,.06)', marginBottom: '16px' }}>
            <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', marginBottom: '24px' }}>Linha do tempo</p>

            {/* Na assinatura */}
            <BlocoFluxo emoji="📋" titulo="Na assinatura" cor="#44403c">
              <LinhaDetalhe label="Ato" valor={formatBRL(ato)} sub="Pagamento único na assinatura do contrato" destaque />
              {fgts > 0 && <LinhaDetalhe label="FGTS" valor={formatBRL(fgts)} sub="Aplicado na entrada junto ao banco" />}
              {temSubsidio && <LinhaDetalhe label={`Subsídio MCMV ${faixaEfetiva?.label}`} valor={formatBRL(subsidioEstimado)} sub="Grant do governo aplicado na entrada" />}
            </BlocoFluxo>

            {/* Primeiros meses */}
            {iniciais > 0 && (
              <BlocoFluxo emoji="📌" titulo={`Primeiros ${qtdIniciais} meses — sinais`} cor="#7c3aed">
                <LinhaDetalhe label={`Sinais × ${qtdIniciais}`} valor={`${formatBRL(iniciaisUnit)} cada`} sub={`Total: ${formatBRL(iniciais)}`} />
              </BlocoFluxo>
            )}

            {/* Durante a obra */}
            <BlocoFluxo emoji="🏗️" titulo={`Durante a obra — ${qtdMensais} meses`} cor="#d97706">
              {mensalUnit > 0 && (
                <LinhaDetalhe label={`Mensais × ${qtdMensais}`} valor={`${formatBRL(mensalUnit)}/mês`} sub={`Total: ${formatBRL(totalMensais)}`} />
              )}
              {totalAnuais > 0 && (
                <LinhaDetalhe label={`Anuais (dezembro) × ${qtdAnuais}`} valor={`${formatBRL(anuaisUnit)} cada`} sub={`Total: ${formatBRL(totalAnuais)}`} />
              )}
              {isMCMV && jurosEvoMedio > 0 && (
                <div style={{ marginTop: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px 16px' }}>
                  <p style={{ fontSize: '12px', fontWeight: '800', color: '#1e40af', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🏦 Pagamento paralelo à Caixa Econômica Federal
                  </p>
                  <p style={{ fontSize: '13px', color: '#1e3a8a', lineHeight: 1.6, marginBottom: '8px' }}>
                    No MCMV, você paga <strong>juros evolutivos mensais diretamente à Caixa</strong> em paralelo às parcelas à construtora acima. O valor <strong>começa baixo e cresce</strong> conforme a Caixa libera recursos para a construtora. Inclui juros, seguros e taxa de administração.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '8px 12px' }}>
                      <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Início da obra</p>
                      <p style={{ fontSize: '16px', fontWeight: '800', color: '#1e40af' }}>~{formatBRL(jurosEvo1)}/mês</p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '8px 12px' }}>
                      <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Média da obra</p>
                      <p style={{ fontSize: '16px', fontWeight: '800', color: '#1e40af' }}>~{formatBRL(jurosEvoMedio)}/mês</p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '8px 12px' }}>
                      <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pico (obra pronta)</p>
                      <p style={{ fontSize: '16px', fontWeight: '800', color: '#2563eb' }}>~{formatBRL(jurosEvoPico)}/mês</p>
                    </div>
                  </div>
                </div>
              )}
              <div style={{ background: ok30 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${ok30 ? '#bbf7d0' : '#fecaca'}`, borderRadius: '10px', padding: '12px 14px', marginTop: '12px', display: 'flex', gap: '10px' }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{ok30 ? '✅' : '⚠️'}</span>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: ok30 ? '#15803d' : '#dc2626', marginBottom: '3px' }}>
                    {ok30 ? 'Comprometimento dentro do limite (30%)' : 'Comprometimento acima do limite recomendado'}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {isMCMV && jurosEvo1 > 0
                      ? `Mensais: ${formatBRL(mensalUnit)} + Evo. Caixa: ~${formatBRL(jurosEvo1)} = ${formatBRL(burden)}/mês · Limite 30%: ${formatBRL(limite30)}/mês`
                      : `Mensais: ${formatBRL(mensalUnit)}/mês · Limite 30%: ${formatBRL(limite30)}/mês`}
                  </p>
                </div>
              </div>
            </BlocoFluxo>

            {/* Na entrega */}
            <BlocoFluxo emoji="🔑" titulo="Na entrega das chaves (habite-se)" cor="#2563eb">
              {unica > 0 && <LinhaDetalhe label="Parcela nas chaves" valor={formatBRL(unica)} sub="Pago na entrega — reajustado pelo INCC" />}
              {saldoNaEntrega > 0 && <LinhaDetalhe label="Saldo restante da entrada" valor={formatBRL(saldoNaEntrega)} sub="Reajustado pelo INCC — pago à construtora na entrega" />}
              <LinhaDetalhe label={`Financiamento ${isMCMV ? 'MCMV' : 'SBPE'}`} valor={formatBRL(financiado)} sub={`${valor > 0 && financiado > 0 ? ((financiado / valor) * 100).toFixed(0) : 0}% do valor — Caixa / banco`} destaque />
              <div style={{ background: isMCMV ? '#f0fdf4' : '#eff6ff', border: `1px solid ${isMCMV ? '#bbf7d0' : '#bfdbfe'}`, borderRadius: '10px', padding: '12px 14px', marginTop: '10px' }}>
                <p style={{ fontSize: '12px', color: isMCMV ? '#166534' : '#1d4ed8', lineHeight: 1.6 }}>
                  {isMCMV
                    ? '🏠 MCMV Crédito Associativo — o contrato com a Caixa é assinado antes da obra. Durante a construção: mensais à construtora + juros evolutivos ao banco. Após o habite-se: parcela definitiva de amortização.'
                    : '🏦 SBPE — o financiamento é contratado somente na emissão do habite-se. Durante a obra você paga apenas à construtora.'}
                </p>
              </div>
            </BlocoFluxo>

            {/* Pós-entrega */}
            <BlocoFluxo emoji="📅" titulo="Pós-entrega — parcela do financiamento" cor="#16a34a" ultimo>
              {isMCMV && jurosEvoMedio > 0 && (
                <div style={{ marginBottom: '14px', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px', padding: '12px 14px' }}>
                  <p style={{ fontSize: '12px', fontWeight: '700', color: '#92400e', marginBottom: '4px' }}>⚡ Atenção: mudança de patamar na entrega das chaves</p>
                  <p style={{ fontSize: '12px', color: '#78350f', lineHeight: 1.6 }}>
                    Durante a obra você paga evolutivos (~{formatBRL(jurosEvoMedio)}/mês em média, crescendo até ~{formatBRL(jurosEvoPico)}/mês).
                    {' '}Após as chaves, esse pagamento é <strong>substituído</strong> pela parcela de amortização abaixo — planeje a transição.
                  </p>
                </div>
              )}
              <LinhaDetalhe
                label={`${taxa.toFixed(2).replace('.', ',')}% a.a. + TR · Price · 35 anos`}
                valor={`${formatBRL(Math.round(parcelaFin + seguros.total))}/mês`}
                sub="1ª parcela — decresce ao longo dos anos (SAC) ou fixo (Price)"
                destaque
              />
              <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'MIP (seguro de vida)', valor: formatBRL(seguros.mip) },
                  { label: 'DFI (seguro imóvel)',  valor: formatBRL(seguros.dfi) },
                ].map(({ label, valor: v }) => (
                  <div key={label} style={{ background: 'var(--bg)', borderRadius: '10px', padding: '10px 12px' }}>
                    <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginBottom: '3px' }}>{label}</p>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>{v}/mês</p>
                  </div>
                ))}
              </div>
            </BlocoFluxo>
          </div>
        )}

        {/* ── Busca inteligente de imóveis ─────────────────────────────── */}
        {valido && <BuscaImoveisInteligente valorImovel={valor} naPlanta={true} />}

      </div>

      <style>{`
        @media (max-width: 480px) {
          .fc-card-inner  { padding: 20px 16px !important; }
          .fc-hero-np     { padding: 40px 16px 56px !important; }
          .fc-input-brl   { font-size: 20px !important; }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
export default function NaPlantaPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg)' }} />}>
      <NaPlantaContent />
    </Suspense>
  );
}
