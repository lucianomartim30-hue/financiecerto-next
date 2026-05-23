'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  formatBRL, parcelaPrice, calcularSeguros,
  TAXA_SBPE_ANUAL, detectarFaixaMCMV, motivoSBPE,
} from '@/lib/calculos';
import Link from 'next/link';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
type Modo    = 'basico' | 'intermediario' | 'completo';
type Estagio = 'lancamento' | 'obras' | 'pronto';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function p(s: string): number { return Number(s.replace(/\D/g, '')) || 0; }
function fi(s: string): string { const n = s.replace(/\D/g, ''); return n ? Number(n).toLocaleString('pt-BR') : ''; }

/**
 * SIOPI — Sistema de Operações Imobiliárias da CEF
 *
 * Lógica oficial:
 * 1. Comprador assina o contrato de financiamento (crédito associativo).
 * 2. No mês seguinte, a CEF realiza a 1ª medição: avaliação do terreno.
 * 3. Com base nessa medição, libera o valor do terreno para a construtora.
 * 4. Juros evolutivos do 1º mês = financiado × taxa_mensal × (valor_liberado / financiado).
 * 5. A cada mês subsequente, novas medições liberam mais parcelas conforme o avanço da obra.
 *
 * O % liberado na 1ª medição NÃO é fixo — depende do valor do terreno do projeto.
 * Intervalo típico: 10% a 25% do financiamento.
 * Fonte definitiva: app Habitação Caixa / SIOPI (disponível após a 1ª medição).
 */

/** Juros evolutivos do 1º mês após assinatura */
function calcJurosEvo(financiado: number, taxaAnual: number, siopiFrac: number): number {
  return Math.round(financiado * (taxaAnual / 100 / 12) * siopiFrac);
}

/** saveSimContext — escreve no sessionStorage para o João */
function salvarContexto(data: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('fc_sim_context', JSON.stringify(data));
  } catch { /* ignore */ }
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared UI components
// ──────────────────────────────────────────────────────────────────────────────

function CampoValor({
  label, hint, value, onChange, placeholder,
}: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: '24px' }}>
      <label style={{
        display: 'block', fontSize: '11px', fontWeight: '700',
        color: 'var(--text-faint)', textTransform: 'uppercase',
        letterSpacing: '0.8px', marginBottom: '8px',
      }}>
        {label}
      </label>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        paddingBottom: '8px',
        borderBottom: `2px solid ${focused ? 'var(--primary)' : 'var(--border)'}`,
        transition: 'border-color 0.2s',
      }}>
        <span style={{
          fontSize: '22px', fontWeight: '300', lineHeight: 1,
          color: focused ? 'var(--primary)' : 'var(--text-faint)',
          transition: 'color 0.2s', flexShrink: 0,
        }}>R$</span>
        <input
          type="text" inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? '0'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, border: 'none', outline: 'none',
            fontSize: '26px', fontWeight: '700', color: 'var(--text)',
            background: 'transparent', padding: 0,
            fontVariantNumeric: 'tabular-nums',
          }}
        />
      </div>
      {hint && <p style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '6px' }}>{hint}</p>}
    </div>
  );
}

function CampoCompacto({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      border: '1.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden',
    }}>
      <span style={{ padding: '9px 11px', fontSize: '13px', color: 'var(--text-muted)', background: 'var(--bg)', borderRight: '1px solid var(--border)', flexShrink: 0 }}>
        R$
      </span>
      <input
        type="text" inputMode="numeric"
        value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1, padding: '9px 12px', border: 'none', outline: 'none',
          fontSize: '14px', color: 'var(--text)', background: 'transparent',
        }}
      />
    </div>
  );
}

function Select({ value, onChange, children }: {
  value: string | number; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '9px 10px', border: '1.5px solid var(--border)',
        borderRadius: '10px', fontSize: '13px',
        background: 'var(--bg-card)', color: 'var(--text)', outline: 'none',
        cursor: 'pointer',
      }}
    >
      {children}
    </select>
  );
}

function LinhaDetalhe({ label, valor, sub, destaque }: {
  label: string; valor: string; sub?: string; destaque?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '10px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ flex: 1, paddingRight: '14px' }}>
        <p style={{ fontSize: '13px', color: destaque ? 'var(--text)' : 'var(--text-muted)', fontWeight: destaque ? '600' : '400' }}>
          {label}
        </p>
        {sub && <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>{sub}</p>}
      </div>
      <span style={{
        fontSize: destaque ? '15px' : '14px', fontWeight: '700',
        color: 'var(--text)', whiteSpace: 'nowrap',
      }}>
        {valor}
      </span>
    </div>
  );
}

function BlocoFluxo({ emoji, titulo, cor, children, ultimo }: {
  emoji: string; titulo: string; cor: string;
  children: React.ReactNode; ultimo?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: '14px', marginBottom: ultimo ? 0 : '24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: cor + '18', border: `1.5px solid ${cor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px',
        }}>
          {emoji}
        </div>
        {!ultimo && (
          <div style={{ width: '2px', flex: 1, background: 'var(--border)', marginTop: '6px', minHeight: '24px' }} />
        )}
      </div>
      <div style={{ flex: 1, paddingBottom: ultimo ? 0 : '10px' }}>
        <p style={{
          fontSize: '11px', fontWeight: '700', color: cor,
          textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px',
        }}>
          {titulo}
        </p>
        {children}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main content
// ──────────────────────────────────────────────────────────────────────────────
function NaPlantaContent() {
  const sp = useSearchParams();

  // ── Perfil vindo do simulador principal (URL params) ────────────────────────
  const rendaUrl      = Number(sp.get('renda')    || 0);
  const maxFinMcmv    = Number(sp.get('mcmv')     || 0);
  const maxFinSbpe    = Number(sp.get('sbpe')     || 0);
  const fgtsUrl       = Number(sp.get('fgts')     || 0);
  const propriosUrl   = Number(sp.get('proprios') || 0);

  // ── Modo standalone: sem parâmetros, pede renda diretamente ────────────────
  const [rendaRaw, setRendaRaw] = useState('');
  const rendaDigitada = p(rendaRaw);
  const renda = rendaUrl > 0 ? rendaUrl : rendaDigitada;
  const temPerfil = renda > 0;

  // Permitem edição manual mesmo quando vindos do perfil via URL
  const [fgtsRaw, setFgtsRaw]       = useState(() => fgtsUrl > 0     ? fi(String(fgtsUrl))     : '');
  const [propriosRaw, setPropiosRaw] = useState(() => propriosUrl > 0 ? fi(String(propriosUrl)) : '');
  const fgts          = p(fgtsRaw);
  const proprios      = p(propriosRaw);
  const recursosTotal = fgts + proprios;

  // ── Estágio do empreendimento ────────────────────────────────────────────────
  const [estagio, setEstagio] = useState<Estagio>('lancamento');

  // ── % SIOPI já liberado (inserido pelo usuário ou estimativa default) ─────────
  // Lançamento: estimativa 10-25% (padrão 15%); Em obras: varia; Pronto: 100%
  const [siopiPctRaw, setSiopiPctRaw] = useState<string>('15');

  useEffect(() => {
    if (estagio === 'lancamento') setSiopiPctRaw('15');
    else if (estagio === 'obras')  setSiopiPctRaw('50');
    // pronto: não usa campo, always 100%
  }, [estagio]);

  const siopiInicial = estagio === 'pronto'
    ? 1.0
    : Math.min(1, Math.max(0, Number(siopiPctRaw.replace(',', '.') || '0') / 100));

  // ── Valor do imóvel ─────────────────────────────────────────────────────────
  const [valorRaw, setValorRaw] = useState('');
  const valor = p(valorRaw);

  // ── Prazo de obra ───────────────────────────────────────────────────────────
  const [qtdMensais, setQtdMensais] = useState(36);

  // ── Modo da estrutura de entrada ────────────────────────────────────────────
  const [modo, setModo] = useState<Modo>('basico');

  // Componentes de entrada
  const [atoRaw,      setAtoRaw]      = useState('');
  const [iniciaisRaw, setIniciaisRaw] = useState('');
  const [qtdIniciais, setQtdIniciais] = useState(2);
  const [mensalRaw,   setMensalRaw]   = useState('');
  const [anuaisRaw,   setAnuaisRaw]   = useState('');
  const [qtdAnuais,   setQtdAnuais]   = useState(2);
  const [unicaRaw,    setUnicaRaw]    = useState('');

  // ── Cálculos de financiamento ────────────────────────────────────────────────
  // detectarFaixaMCMV retorna null para renda=0 (desconhecida) — nunca assume Faixa 1
  const faixaRenda  = detectarFaixaMCMV(renda);
  const isMCMV      = faixaRenda !== null && valor > 0 && valor <= faixaRenda.teto;
  const taxa        = isMCMV && faixaRenda ? faixaRenda.taxaRef : TAXA_SBPE_ANUAL;
  // Motivo detalhado quando não é MCMV (renda alta OU valor acima do teto da faixa)
  const motivo = (!isMCMV && renda > 0 && valor > 0) ? motivoSBPE(renda, valor) : null;

  // Financiamento aprovado pelo perfil; se standalone, usa 90% do valor
  const maxFinPerfil = isMCMV ? maxFinMcmv : maxFinSbpe;
  const maxFinAuto   = valor > 0 ? Math.round(valor * 0.90) : 0;
  const financiado   = maxFinPerfil > 0
    ? Math.min(maxFinPerfil, Math.max(0, valor * (isMCMV ? 0.90 : 0.80)))
    : maxFinAuto;
  const entradaNecessaria = Math.max(0, valor - financiado);
  const temRecursos       = recursosTotal > 0 && recursosTotal >= entradaNecessaria;
  const faltaRecursos     = Math.max(0, entradaNecessaria - recursosTotal);

  // ── Totais da estrutura de entrada ──────────────────────────────────────────
  const ato          = p(atoRaw);
  const iniciais     = p(iniciaisRaw) * (modo !== 'basico' ? qtdIniciais : 0);
  const mensalUnit   = p(mensalRaw);
  const totalMensais = mensalUnit * qtdMensais;
  const anuaisUnit   = p(anuaisRaw);
  const totalAnuais  = anuaisUnit * (modo !== 'basico' ? qtdAnuais : 0);
  const unica        = p(unicaRaw) * (modo === 'completo' ? 1 : 0);
  const totalEstrutura = ato + iniciais + totalMensais + totalAnuais + unica;
  const diferenca      = totalEstrutura - entradaNecessaria;
  const estruturaOk    = entradaNecessaria > 0 && Math.abs(diferenca) < entradaNecessaria * 0.05;

  // ── Juros evolutivos ─────────────────────────────────────────────────────────
  const seguros       = calcularSeguros(financiado);
  const parcelaFin    = parcelaPrice(financiado, taxa, 35 * 12);
  const jurosEvo1     = isMCMV && financiado > 0 ? calcJurosEvo(financiado, taxa, siopiInicial) : 0;
  const jurosEvoMedio = isMCMV && financiado > 0 ? Math.round(parcelaFin * 0.655 + seguros.total) : 0;

  // ── 30% rule ─────────────────────────────────────────────────────────────────
  const limite30 = renda * 0.30;
  const burden   = mensalUnit + jurosEvo1;
  const ok30     = burden <= limite30 || mensalUnit === 0;

  // Saldos
  const saldoAposAto    = entradaNecessaria - ato;
  const saldoNaEntrega  = Math.max(0, entradaNecessaria - ato - iniciais - totalMensais - totalAnuais);
  const valido          = valor > 0 && renda > 0 && ato > 0 && mensalUnit > 0;

  // ── saveSimContext para o João ────────────────────────────────────────────────
  useEffect(() => {
    if (!valido) return;
    salvarContexto({
      page: '/simulador/na-planta',
      renda,
      fgts,
      planta: {
        valorImovel:    valor,
        prazoObraMeses: qtdMensais,
        estagio:        estagio === 'lancamento' ? 'Lançamento' :
                        estagio === 'obras' ? 'Em obras' : 'Pronto / Habite-se',
        siopiLiberado:  `${Math.round(siopiInicial * 100)}%`,
        modalidade: isMCMV ? 'MCMV Crédito Associativo' : 'SBPE',
      },
      resultado: {
        valorImovel:    valor,
        valorFinanciado: financiado,
        taxaAnual:      taxa,
        parcela:        Math.round(parcelaFin + seguros.total),
      },
    });
  }, [valido, valor, renda, estagio, isMCMV, financiado, taxa, fgts, qtdMensais, parcelaFin, seguros.total]);

  // ──────────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────────

  const estagioConfig: Record<Estagio, {
    label: string; desc: string; color: string;
    siopiInfo: string; aviso?: string;
  }> = {
    lancamento: {
      label: 'Lançamento',
      desc: 'Obra não iniciada',
      color: '#2563eb',
      siopiInfo: 'Na assinatura do contrato, a CEF realiza a medição do terreno no mês seguinte e libera esse valor à construtora. Os juros evolutivos do 1º mês são calculados sobre esse valor liberado. O percentual varia conforme o terreno do projeto — normalmente entre 10% e 25% do financiamento. O valor exato só é conhecido após a 1ª medição; consulte o app Habitação Caixa / SIOPI.',
    },
    obras: {
      label: 'Em obras',
      desc: 'Medições ativas',
      color: '#d97706',
      siopiInfo: 'A CEF realiza medições mensais conforme o avanço da obra e libera os recursos progressivamente à construtora. O percentual total já liberado depende do estágio atual da construção. Consulte o app Habitação Caixa / SIOPI para verificar o saldo liberado até o momento.',
    },
    pronto: {
      label: 'Pronto / Habite-se',
      desc: 'Entrega imediata',
      color: '#16a34a',
      siopiInfo: '',
      aviso: 'Imóvel com habite-se emitido — use o Simulador principal (financiamento padrão, sem juros evolutivos).',
    },
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(160deg, #0f172a 0%, #1a2e4a 55%, #0f172a 100%)',
        padding: '64px 24px 80px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Link href="/simulador" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            color: 'rgba(255,255,255,.45)', fontSize: '12px', textDecoration: 'none',
            marginBottom: '24px',
          }}>
            ← Simulador principal
          </Link>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(234,88,12,.15)', border: '1px solid rgba(234,88,12,.3)',
            borderRadius: '99px', padding: '5px 14px', marginBottom: '20px',
          }}>
            <span style={{ fontSize: '14px' }}>🏗️</span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#fb923c', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Imóvel na planta
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(24px, 5vw, 38px)', fontWeight: '800',
            color: '#fff', lineHeight: 1.2, marginBottom: '14px',
          }}>
            Simule o fluxo real<br />da construtora
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.55)', lineHeight: 1.7 }}>
            Entrada parcelada · evolução de obra · juros evolutivos MCMV · crédito associativo
          </p>

          {/* Perfil resumido se veio do simulador */}
          {rendaUrl > 0 && (
            <div style={{
              display: 'inline-flex', gap: '16px', marginTop: '24px',
              background: 'rgba(255,255,255,.08)', borderRadius: '12px',
              padding: '12px 20px', flexWrap: 'wrap', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.7)' }}>
                <strong style={{ color: '#fff' }}>Renda:</strong> {formatBRL(rendaUrl)}/mês
              </span>
              {faixaRenda && (
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.7)' }}>
                  <strong style={{ color: '#4ade80' }}>MCMV {faixaRenda.label}</strong>
                </span>
              )}
              {maxFinMcmv > 0 && (
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.7)' }}>
                  <strong style={{ color: '#fff' }}>Fin. aprovado:</strong> {formatBRL(maxFinMcmv)}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '680px', margin: '-40px auto 0', padding: '0 16px 80px', position: 'relative', zIndex: 1 }}>

        {/* ── CARD PRINCIPAL ──────────────────────────────────────────────── */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: '20px',
          border: '1px solid var(--border)',
          padding: '32px 28px',
          boxShadow: '0 4px 40px rgba(0,0,0,.10)',
          marginBottom: '16px',
        }}>

          {/* Standalone: renda input */}
          {rendaUrl === 0 && (
            <div style={{ marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>
                Seu perfil financeiro
              </p>
              <CampoValor
                label="Renda familiar bruta"
                placeholder="6.000"
                value={rendaRaw}
                onChange={v => setRendaRaw(fi(v))}
                hint="Para calcular a modalidade (MCMV ou SBPE) e o comprometimento de 30%"
              />
              {rendaDigitada > 0 && faixaRenda && (
                <div style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderRadius: '10px', padding: '10px 14px', marginTop: '-8px',
                }}>
                  <p style={{ fontSize: '13px', color: '#15803d' }}>
                    ✅ <strong>MCMV {faixaRenda.label}</strong> — taxa {faixaRenda.taxaRef.toFixed(2).replace('.', ',')}% a.a. · teto {formatBRL(faixaRenda.teto)}
                  </p>
                </div>
              )}
              {rendaDigitada > 0 && !faixaRenda && (
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 14px', marginTop: '-8px' }}>
                  <p style={{ fontSize: '13px', color: '#1d4ed8' }}>
                    💼 <strong>Perfil SBPE</strong> — taxa Caixa {TAXA_SBPE_ANUAL.toFixed(2).replace('.', ',')}% a.a. + TR · imóveis SFH até R$ 2,25M · FGTS permitido
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Estágio do empreendimento */}
          <div style={{ marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>
              Estágio do empreendimento
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {(Object.entries(estagioConfig) as [Estagio, typeof estagioConfig[Estagio]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setEstagio(key)}
                  style={{
                    padding: '12px 8px', borderRadius: '12px', cursor: 'pointer',
                    border: `2px solid ${estagio === key ? cfg.color : 'var(--border)'}`,
                    background: estagio === key ? cfg.color + '12' : 'var(--bg)',
                    textAlign: 'center', transition: 'all 0.15s',
                  }}
                >
                  <p style={{ fontSize: '12px', fontWeight: '700', color: estagio === key ? cfg.color : 'var(--text)', marginBottom: '2px' }}>
                    {cfg.label}
                  </p>
                  <p style={{ fontSize: '10px', color: 'var(--text-faint)' }}>{cfg.desc}</p>
                </button>
              ))}
            </div>

            {/* Aviso para Pronto */}
            {estagioConfig[estagio].aviso && (
              <div style={{
                marginTop: '12px', background: '#fffbeb',
                border: '1px solid #fde68a', borderRadius: '10px', padding: '10px 14px',
              }}>
                <p style={{ fontSize: '12px', color: '#92400e', lineHeight: 1.55 }}>
                  ⚠️ {estagioConfig[estagio].aviso}
                </p>
              </div>
            )}

          </div>

          {/* ── Recursos para a entrada ─────────────────────────────────── */}
          <div style={{ marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>
              Recursos para a entrada
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>💰 FGTS disponível</p>
                <CampoCompacto value={fgtsRaw} onChange={v => setFgtsRaw(fi(v))} placeholder="0" />
                <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '5px', lineHeight: 1.4 }}>
                  Válido no MCMV e SBPE/SFH. Não se aplica ao SFI (acima de R$ 2,25M).
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>💵 Recursos próprios</p>
                <CampoCompacto value={propriosRaw} onChange={v => setPropiosRaw(fi(v))} placeholder="0" />
                <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '5px', lineHeight: 1.4 }}>
                  Poupança, investimentos ou outros valores disponíveis.
                </p>
              </div>
            </div>
            {recursosTotal > 0 && (
              <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '13px', color: 'var(--text)', margin: 0 }}>
                  Total disponível: <strong>{formatBRL(recursosTotal)}</strong>
                  {fgts > 0 && proprios > 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--text-faint)', marginLeft: '6px' }}>
                      (FGTS {formatBRL(fgts)} + próprios {formatBRL(proprios)})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Valor do imóvel */}
          <CampoValor
            label="Valor do imóvel (tabela da construtora)"
            placeholder="350.000"
            value={valorRaw}
            onChange={v => setValorRaw(fi(v))}
          />

          {valor > 0 && (
            <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {renda <= 0 ? (
                <span style={{
                  fontSize: '12px', fontWeight: '700', padding: '3px 10px',
                  borderRadius: '99px', display: 'inline-block',
                  background: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb',
                }}>
                  ⏳ Informe a renda para determinar MCMV ou SBPE
                </span>
              ) : isMCMV ? (
                <span style={{
                  fontSize: '12px', fontWeight: '700', padding: '3px 10px',
                  borderRadius: '99px', display: 'inline-block',
                  background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                }}>
                  ✅ Minha Casa, Minha Vida — {faixaRenda!.label} · {faixaRenda!.taxaRef.toFixed(2).replace('.', ',')}% a.a. · teto {formatBRL(faixaRenda!.teto)}
                </span>
              ) : (
                <>
                  <span style={{
                    fontSize: '12px', fontWeight: '700', padding: '3px 10px',
                    borderRadius: '99px', display: 'inline-block',
                    background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                  }}>
                    ℹ️ SBPE / Mercado — {TAXA_SBPE_ANUAL.toFixed(2).replace('.', ',')}% a.a.
                  </span>
                  {motivo && (
                    <p style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.5, paddingLeft: '2px', margin: 0 }}>
                      ↳ {motivo}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Resumo financeiro */}
          {valor > 0 && financiado > 0 && (
            <div style={{
              background: 'var(--bg)', borderRadius: '14px',
              border: '1px solid var(--border)', padding: '18px', margin: '20px 0',
            }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>
                Composição do pagamento
              </p>
              <LinhaDetalhe label="Valor do imóvel" valor={formatBRL(valor)} />
              <LinhaDetalhe
                label={`Financiamento aprovado (${isMCMV ? 'MCMV' : 'SBPE'})`}
                valor={`− ${formatBRL(financiado)}`}
                sub={`${((financiado / valor) * 100).toFixed(0)}% do valor · LTV`}
              />
              <div style={{ borderTop: '2px solid var(--border)', paddingTop: '10px', marginTop: '4px' }}>
                <LinhaDetalhe
                  label="Entrada necessária (paga durante a obra)"
                  valor={formatBRL(entradaNecessaria)}
                  destaque
                />
              </div>
              {recursosTotal > 0 && (
                <div style={{
                  marginTop: '10px', padding: '10px 12px', borderRadius: '10px',
                  background: temRecursos ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${temRecursos ? '#bbf7d0' : '#fecaca'}`,
                }}>
                  <p style={{ fontSize: '12px', color: temRecursos ? '#15803d' : '#dc2626', margin: 0 }}>
                    {temRecursos
                      ? `✅ Seus recursos (${formatBRL(recursosTotal)}) cobrem a entrada`
                      : `⚠️ Faltam ${formatBRL(faltaRecursos)} para cobrir a entrada`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── ESTRUTURA DE PAGAMENTO DA ENTRADA ───────────────────────────── */}
        {valor > 0 && entradaNecessaria > 0 && estagio !== 'pronto' && (
          <div style={{
            background: 'var(--bg-card)', borderRadius: '20px',
            border: '1px solid var(--border)', padding: '28px',
            boxShadow: '0 4px 24px rgba(0,0,0,.06)', marginBottom: '16px',
          }}>
            <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>
              Estrutura de pagamento da entrada
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Informe os valores da tabela da construtora. O total deve fechar em {formatBRL(entradaNecessaria)}.
            </p>

            {/* Seletor de modo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '24px' }}>
              {([
                { key: 'basico',        label: 'Ato + Mensais', desc: 'Parcelas mensais na obra' },
                { key: 'intermediario', label: '+ Iniciais / Anuais', desc: 'Com reforços periódicos' },
                { key: 'completo',      label: '+ Parcela Única', desc: 'Com balão na entrega' },
              ] as { key: Modo; label: string; desc: string }[]).map(({ key, label, desc }) => (
                <button key={key} onClick={() => setModo(key)} style={{
                  padding: '11px 8px', borderRadius: '12px', cursor: 'pointer',
                  border: `2px solid ${modo === key ? 'var(--primary)' : 'var(--border)'}`,
                  background: modo === key ? 'var(--primary-light)' : 'var(--bg)',
                  textAlign: 'center', transition: 'all 0.15s',
                }}>
                  <p style={{ fontSize: '12px', fontWeight: '700', color: modo === key ? 'var(--primary)' : 'var(--text)', marginBottom: '2px' }}>
                    {label}
                  </p>
                  <p style={{ fontSize: '10px', color: 'var(--text-faint)' }}>{desc}</p>
                </button>
              ))}
            </div>

            {/* Campos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Ato */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--text)', color: '#fff', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>Ato</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Pagamento único na assinatura do contrato</p>
                  </div>
                </div>
                <CampoCompacto value={atoRaw} onChange={v => setAtoRaw(fi(v))} placeholder="14.000" />
              </div>

              {/* Iniciais */}
              {modo !== 'basico' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--text)', color: '#fff', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>Parcelas iniciais / complementos</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Primeiros meses após o ato</p>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                    <CampoCompacto value={iniciaisRaw} onChange={v => setIniciaisRaw(fi(v))} placeholder="10.000" />
                    <Select value={qtdIniciais} onChange={v => setQtdIniciais(Number(v))}>
                      {[2,3,4,5,6].map(n => <option key={n} value={n}>× {n}</option>)}
                    </Select>
                  </div>
                  {p(iniciaisRaw) > 0 && <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '5px' }}>Total: {formatBRL(p(iniciaisRaw) * qtdIniciais)}</p>}
                </div>
              )}

              {/* Mensais */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--text)', color: '#fff', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {modo === 'basico' ? '2' : '3'}
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>Mensais durante a obra</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Valor de cada parcela mensal à construtora</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', alignItems: 'center' }}>
                  <CampoCompacto value={mensalRaw} onChange={v => setMensalRaw(fi(v))} placeholder="1.900" />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>/mês ×</span>
                  <Select value={qtdMensais} onChange={v => setQtdMensais(Number(v))}>
                    {[24,26,28,30,36,40,43,48].map(n => <option key={n} value={n}>{n}</option>)}
                  </Select>
                </div>
                {mensalUnit > 0 && <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '5px' }}>Total mensais: {formatBRL(totalMensais)}</p>}
              </div>

              {/* Anuais */}
              {modo !== 'basico' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--text)', color: '#fff', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>4</div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>Anuais / semestrais</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Reforços periódicos conforme tabela</p>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                    <CampoCompacto value={anuaisRaw} onChange={v => setAnuaisRaw(fi(v))} placeholder="13.000" />
                    <Select value={qtdAnuais} onChange={v => setQtdAnuais(Number(v))}>
                      {[1,2,3,4,6,8].map(n => <option key={n} value={n}>× {n}</option>)}
                    </Select>
                  </div>
                  {p(anuaisRaw) > 0 && <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '5px' }}>Total anuais: {formatBRL(totalAnuais)}</p>}
                </div>
              )}

              {/* Única */}
              {modo === 'completo' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--text)', color: '#fff', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>5</div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>Parcela única (antes das chaves)</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-faint)' }}>Pagamento pontual próximo à entrega</p>
                    </div>
                  </div>
                  <CampoCompacto value={unicaRaw} onChange={v => setUnicaRaw(fi(v))} placeholder="23.000" />
                </div>
              )}
            </div>

            {/* Verificador de fechamento */}
            {(ato > 0 || mensalUnit > 0) && (
              <div style={{
                marginTop: '20px', borderRadius: '12px', padding: '16px',
                background: estruturaOk ? '#f0fdf4' : diferenca > 0 ? '#fef2f2' : '#fffbeb',
                border: `1px solid ${estruturaOk ? '#bbf7d0' : diferenca > 0 ? '#fecaca' : '#fde68a'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total da estrutura</span>
                  <strong style={{ fontSize: '13px', color: 'var(--text)' }}>{formatBRL(totalEstrutura)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Entrada necessária</span>
                  <strong style={{ fontSize: '13px', color: 'var(--text)' }}>{formatBRL(entradaNecessaria)}</strong>
                </div>
                <p style={{
                  fontSize: '12px', fontWeight: '700',
                  color: estruturaOk ? '#15803d' : diferenca > 0 ? '#dc2626' : '#b45309',
                  margin: 0,
                }}>
                  {estruturaOk
                    ? '✅ Estrutura fecha com a entrada necessária'
                    : diferenca > 0
                      ? `⚠️ Excede em ${formatBRL(diferenca)} — reduza algum componente`
                      : `⚠️ Faltam ${formatBRL(Math.abs(diferenca))} — adicione mais um componente`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── FLUXO DE PAGAMENTO ───────────────────────────────────────────── */}
        {valido && (
          <div style={{
            background: 'var(--bg-card)', borderRadius: '20px',
            border: '1px solid var(--border)', padding: '28px',
            boxShadow: '0 4px 24px rgba(0,0,0,.06)', marginBottom: '16px',
          }}>
            <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', marginBottom: '24px' }}>
              Fluxo de pagamento
            </p>

            {/* Assinatura */}
            <BlocoFluxo emoji="📋" titulo="Na assinatura" cor="#44403c">
              <LinhaDetalhe label="Ato" valor={formatBRL(ato)} sub="Pagamento único na assinatura do contrato" destaque />
              <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '10px 12px', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Saldo da entrada ainda a pagar</p>
                  <strong style={{ fontSize: '13px' }}>{formatBRL(saldoAposAto)}</strong>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '3px' }}>
                  ⚠️ Sofre reajuste mensal pelo INCC (FGV) até a entrega das chaves
                </p>
              </div>
            </BlocoFluxo>

            {/* Iniciais */}
            {modo !== 'basico' && p(iniciaisRaw) > 0 && (
              <BlocoFluxo emoji="📌" titulo={`Primeiros ${qtdIniciais} meses`} cor="#7c3aed">
                <LinhaDetalhe
                  label={`Parcelas iniciais × ${qtdIniciais}`}
                  valor={`${formatBRL(p(iniciaisRaw))} cada`}
                  sub={`Total: ${formatBRL(iniciais)}`}
                />
              </BlocoFluxo>
            )}

            {/* Durante a obra */}
            <BlocoFluxo emoji="🏗️" titulo={`Durante a obra — ${qtdMensais} meses`} cor="#d97706">
              <LinhaDetalhe
                label={`Mensais × ${qtdMensais}`}
                valor={`${formatBRL(mensalUnit)}/mês`}
                sub={`Total: ${formatBRL(totalMensais)}`}
              />
              {modo !== 'basico' && anuaisUnit > 0 && (
                <LinhaDetalhe
                  label={`Anuais × ${qtdAnuais}`}
                  valor={`${formatBRL(anuaisUnit)} cada`}
                  sub={`Total: ${formatBRL(totalAnuais)}`}
                />
              )}

              {/* Juros evolutivos MCMV — nota informativa (pagamento paralelo à Caixa) */}
              {isMCMV && jurosEvoMedio > 0 && (
                <div style={{
                  marginTop: '12px', background: '#eff6ff',
                  border: '1px solid #bfdbfe', borderRadius: '12px',
                  padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>🏦</span>
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: '800', color: '#1e40af', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Pagamento paralelo à Caixa Econômica Federal
                      </p>
                      <p style={{ fontSize: '13px', color: '#1e3a8a', lineHeight: 1.6, marginBottom: '8px' }}>
                        No MCMV, após assinar o financiamento, você paga <strong>juros evolutivos mensais diretamente à Caixa</strong> — em paralelo às parcelas à construtora acima. A Caixa vai liberando o dinheiro à construtora conforme o avanço da obra, e você paga juros sobre o valor já liberado.
                      </p>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '8px 12px' }}>
                          <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Juros evolutivos (média)</p>
                          <p style={{ fontSize: '16px', fontWeight: '800', color: '#1e40af' }}>~{formatBRL(jurosEvoMedio)}/mês</p>
                          <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>Cresce do início até a entrega</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '8px 12px' }}>
                          <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>1º mês (estimativa)</p>
                          <p style={{ fontSize: '16px', fontWeight: '800', color: '#1e40af' }}>~{formatBRL(jurosEvo1)}/mês</p>
                          <p style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>Sobre liberação inicial (~15%)</p>
                        </div>
                      </div>
                      <p style={{ fontSize: '11px', color: '#3b82f6', marginTop: '10px', lineHeight: 1.5 }}>
                        📌 Este valor <strong>não está incluído</strong> nas parcelas à construtora acima — são dois pagamentos distintos durante a obra.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 30% rule */}
              <div style={{
                background: ok30 ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${ok30 ? '#bbf7d0' : '#fecaca'}`,
                borderRadius: '10px', padding: '12px 14px', marginTop: '12px',
                display: 'flex', gap: '10px',
              }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{ok30 ? '✅' : '⚠️'}</span>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: ok30 ? '#15803d' : '#dc2626', marginBottom: '3px' }}>
                    {ok30
                      ? 'Comprometimento dentro do limite (30% da renda)'
                      : 'Comprometimento acima do limite recomendado'}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {isMCMV && jurosEvo1 > 0
                      ? `Mensais: ${formatBRL(mensalUnit)} + Juros banco (1º mês): ~${formatBRL(jurosEvo1)} = ${formatBRL(burden)}/mês · Limite 30%: ${formatBRL(limite30)}/mês`
                      : `Mensais: ${formatBRL(mensalUnit)}/mês · Limite 30%: ${formatBRL(limite30)}/mês`}
                  </p>
                </div>
              </div>

              <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '10px 12px', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Saldo restante na entrega</p>
                  <strong style={{ fontSize: '13px' }}>{formatBRL(saldoNaEntrega)}</strong>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '3px' }}>
                  ⚠️ Todos os valores pagos à construtora sofrem correção pelo INCC
                </p>
              </div>
            </BlocoFluxo>

            {/* Entrega */}
            <BlocoFluxo emoji="🔑" titulo="Na entrega das chaves (habite-se)" cor="#2563eb">
              {modo === 'completo' && unica > 0 && (
                <LinhaDetalhe label="Parcela única" valor={formatBRL(unica)} sub="Pagamento pontual na entrega" />
              )}
              <LinhaDetalhe
                label={`Financiamento ${isMCMV ? 'MCMV' : 'SBPE'}`}
                valor={formatBRL(financiado)}
                sub={`${((financiado / valor) * 100).toFixed(0)}% do valor — Caixa / banco`}
                destaque
              />
              <div style={{
                background: isMCMV ? '#f0fdf4' : '#eff6ff',
                border: `1px solid ${isMCMV ? '#bbf7d0' : '#bfdbfe'}`,
                borderRadius: '10px', padding: '12px 14px', marginTop: '10px',
              }}>
                <p style={{ fontSize: '12px', fontWeight: '600', color: isMCMV ? '#15803d' : '#1d4ed8', marginBottom: '4px' }}>
                  {isMCMV ? '🏠 Minha Casa, Minha Vida — Crédito Associativo' : '🏦 SBPE / Mercado'}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {isMCMV
                    ? 'O contrato com a Caixa Econômica Federal é assinado antes da obra começar. Durante a construção, você paga mensais à construtora + juros evolutivos ao banco. Após o habite-se, inicia a parcela definitiva de amortização.'
                    : 'O financiamento bancário é contratado somente na emissão do habite-se. Durante toda a obra, você paga apenas à construtora — o banco entra somente na entrega das chaves.'}
                </p>
              </div>
            </BlocoFluxo>

            {/* Pós-entrega */}
            <BlocoFluxo emoji="📅" titulo="Pós-entrega — parcela do financiamento" cor="#16a34a" ultimo>
              <LinhaDetalhe
                label={`${taxa.toFixed(2).replace('.', ',')}% a.a. + TR · Price · 35 anos`}
                valor={`${formatBRL(Math.round(parcelaFin + seguros.total))}/mês`}
                sub="1ª parcela — decresce ao longo dos anos (SAC) ou fixo (Price)"
                destaque
              />
              <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'MIP (seguro de vida)', valor: formatBRL(seguros.mip) },
                  { label: 'DFI (seguro imóvel)', valor: formatBRL(seguros.dfi) },
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

        {/* ── CTA final ───────────────────────────────────────────────────── */}
        {valido && (() => {
          // Faixa de preço compatível com o imóvel simulado
          const minFiltro = Math.round(valor * 0.75);
          const maxFiltro = isMCMV && faixaRenda ? faixaRenda.teto : Math.round(valor * 1.25);
          const ctaHref = `/imoveis?min=${minFiltro}&max=${maxFiltro}&status=na planta`;
          return (
            <Link href={ctaHref} style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                borderRadius: '16px', padding: '20px 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer',
              }}>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: '800', color: '#fff', marginBottom: '3px' }}>
                    🏘️ Ver imóveis na planta compatíveis
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.7)' }}>
                    {formatBRL(minFiltro)} – {formatBRL(maxFiltro)} · filtrando por na planta e em obras
                  </p>
                </div>
                <span style={{ color: '#fff', fontSize: '20px' }}>→</span>
              </div>
            </Link>
          );
        })()}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
export default function NaPlantaPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏗️</div>
        <p>Carregando simulador...</p>
      </div>
    }>
      <NaPlantaContent />
    </Suspense>
  );
}
