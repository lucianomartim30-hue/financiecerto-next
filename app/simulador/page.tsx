'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  descobrir,
  simular,
  formatBRL,
  calcularSeguros,
  type ResultadoDescobrir,
  type ResultadoSimulacao,
} from '@/lib/calculos';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
type Modo = 'descobrir' | 'imovel' | 'planta';
type Fase = 'form' | 'resultado';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
function parseMoeda(v: string): number {
  return Number(v.replace(/\D/g, ''));
}
function fmtInput(v: string): string {
  const n = v.replace(/\D/g, '');
  return n ? Number(n).toLocaleString('pt-BR') : '';
}

/** Salva contexto da simulação no sessionStorage para o João */
function salvarContexto(ctx: Record<string, unknown>) {
  try {
    sessionStorage.setItem('joao_sim_context', JSON.stringify(ctx));
    window.dispatchEvent(new StorageEvent('storage', { key: 'joao_sim_context' }));
  } catch { /* SSR safety */ }
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared UI
// ──────────────────────────────────────────────────────────────────────────────

function Progresso({ total, atual }: { total: number; atual: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '36px' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            height: '4px',
            width: i === atual ? '28px' : '10px',
            borderRadius: '99px',
            background: i < atual ? 'var(--primary)' : i === atual ? 'var(--primary)' : 'var(--border)',
            opacity: i < atual ? 0.4 : 1,
            transition: 'all 0.35s cubic-bezier(.4,0,.2,1)',
          }}
        />
      ))}
      <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--text-faint)' }}>
        {atual + 1}/{total}
      </span>
    </div>
  );
}

function CampoGrande({
  label, hint, value, onChange, prefix, placeholder,
}: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void; prefix?: string; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: '32px' }}>
      <label style={{
        display: 'block', fontSize: '11px', fontWeight: '700',
        color: 'var(--text-faint)', marginBottom: '10px',
        textTransform: 'uppercase', letterSpacing: '0.8px',
      }}>
        {label}
      </label>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        paddingBottom: '10px',
        borderBottom: `2px solid ${focused ? 'var(--primary)' : 'var(--border)'}`,
        transition: 'border-color 0.2s',
      }}>
        {prefix && (
          <span style={{
            fontSize: '26px', fontWeight: '300',
            color: focused ? 'var(--primary)' : 'var(--text-faint)',
            transition: 'color 0.2s', flexShrink: 0, lineHeight: 1,
          }}>
            {prefix}
          </span>
        )}
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? '0'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, border: 'none', outline: 'none',
            fontSize: '32px', fontWeight: '700',
            color: 'var(--text)', background: 'transparent',
            fontVariantNumeric: 'tabular-nums',
            padding: 0,
          }}
        />
      </div>
      {hint && (
        <p style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '8px', lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function BarraComprometimento({ pct }: { pct: number }) {
  const cor = pct <= 25 ? '#16a34a' : pct <= 30 ? '#d97706' : '#dc2626';
  const label = pct <= 25 ? 'Saudável' : pct <= 30 ? 'Aceitável' : 'Elevado';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Comprometimento de renda</span>
        <span style={{ fontSize: '13px', fontWeight: '700', color: cor }}>
          {pct.toFixed(1)}% — {label}
        </span>
      </div>
      <div style={{ height: '6px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{
          width: `${Math.min(pct, 100)}%`, height: '100%',
          background: cor, borderRadius: '99px',
          transition: 'width 0.6s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>
    </div>
  );
}

function LinhaDetalhe({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '11px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{
        fontSize: '14px',
        fontWeight: destaque ? '800' : '600',
        color: destaque ? 'var(--text)' : 'var(--text)',
      }}>
        {valor}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MODO SELECTOR
// ──────────────────────────────────────────────────────────────────────────────
function ModeSelector({ modo, onChange }: { modo: Modo; onChange: (m: Modo) => void }) {
  const modos: { key: Modo; label: string; icon: string }[] = [
    { key: 'descobrir', label: 'Descobrir', icon: '🔍' },
    { key: 'imovel',   label: 'Já sei o imóvel', icon: '🏠' },
    { key: 'planta',   label: 'Na planta', icon: '🏗️' },
  ];
  return (
    <div style={{
      display: 'inline-flex',
      background: 'rgba(255,255,255,.08)',
      backdropFilter: 'blur(8px)',
      borderRadius: '16px',
      padding: '5px',
      gap: '3px',
      border: '1px solid rgba(255,255,255,.1)',
    }}>
      {modos.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            padding: '10px 16px',
            borderRadius: '11px',
            border: 'none',
            background: modo === key ? '#fff' : 'transparent',
            color: modo === key ? '#1e3a5f' : 'rgba(255,255,255,.65)',
            fontSize: '13px',
            fontWeight: modo === key ? '700' : '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <span>{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MODO 1 — DESCOBRIR: Form (3 steps)
// ──────────────────────────────────────────────────────────────────────────────
function FormDescobrir({ onResult }: { onResult: (r: ResultadoDescobrir) => void }) {
  const [step, setStep] = useState(0);
  const [renda, setRenda] = useState('');
  const [entrada, setEntrada] = useState('');
  const [fgts, setFgts] = useState('');
  const [prazo, setPrazo] = useState('35');
  const [erro, setErro] = useState('');

  function avancar() {
    setErro('');
    if (step === 0) {
      const r = parseMoeda(renda);
      if (!r || r < 800) {
        setErro('Informe uma renda válida — mínimo R$ 800.');
        return;
      }
    }
    if (step < 2) {
      setStep(s => s + 1);
      return;
    }
    // Calcular
    const r = parseMoeda(renda);
    const e = parseMoeda(entrada);
    const f = parseMoeda(fgts);
    onResult(descobrir(r, f, e, parseInt(prazo)));
  }

  return (
    <div>
      <Progresso total={3} atual={step} />

      {/* Step 0: Renda */}
      {step === 0 && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text)', lineHeight: 1.2, marginBottom: '10px' }}>
            Qual é a renda familiar?
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '40px' }}>
            Some todos os rendimentos de quem vai comprar o imóvel — salário, renda extra, cônjuge.
          </p>
          <CampoGrande
            label="Renda bruta mensal"
            prefix="R$"
            placeholder="5.000"
            value={renda}
            onChange={v => { setRenda(fmtInput(v)); setErro(''); }}
            hint="Antes dos descontos. Pode incluir mais de uma pessoa."
          />
        </div>
      )}

      {/* Step 1: Entrada */}
      {step === 1 && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text)', lineHeight: 1.2, marginBottom: '10px' }}>
            Quanto você tem para a entrada?
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '40px' }}>
            Inclua poupança, investimentos e saldo do FGTS. Não precisa ser muito.
          </p>
          <CampoGrande
            label="Recursos próprios"
            prefix="R$"
            placeholder="20.000"
            value={entrada}
            onChange={v => setEntrada(fmtInput(v))}
            hint="Dinheiro em conta, poupança ou investimentos"
          />
          <CampoGrande
            label="Saldo do FGTS"
            prefix="R$"
            placeholder="0"
            value={fgts}
            onChange={v => setFgts(fmtInput(v))}
            hint="Pode ser usado como entrada em imóveis SFH (até R$ 1,5 mi)"
          />
        </div>
      )}

      {/* Step 2: Prazo */}
      {step === 2 && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text)', lineHeight: 1.2, marginBottom: '10px' }}>
            Em quantos anos quer pagar?
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '40px' }}>
            Prazos mais longos = parcelas menores, mas mais juros no total.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            {[
              { v: '20', label: '20 anos', desc: 'Menos juros' },
              { v: '25', label: '25 anos', desc: 'Equilibrado' },
              { v: '30', label: '30 anos', desc: 'Popular' },
              { v: '35', label: '35 anos', desc: 'Parcela menor' },
            ].map(({ v, label, desc }) => (
              <button
                key={v}
                onClick={() => setPrazo(v)}
                style={{
                  padding: '18px 14px',
                  borderRadius: '14px',
                  border: `2px solid ${prazo === v ? 'var(--primary)' : 'var(--border)'}`,
                  background: prazo === v ? 'var(--primary-light)' : 'var(--bg)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                }}
              >
                <p style={{ fontSize: '16px', fontWeight: '700', color: prazo === v ? 'var(--primary)' : 'var(--text)', margin: 0, marginBottom: '3px' }}>
                  {label}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-faint)', margin: 0 }}>{desc}</p>
              </button>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-faint)', textAlign: 'center' }}>
            Caixa permite até 35 anos no MCMV
          </p>
        </div>
      )}

      {/* Error */}
      {erro && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>{erro}</p>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
        <button
          onClick={() => { setStep(s => s - 1); setErro(''); }}
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            fontSize: '14px', cursor: 'pointer', padding: '8px 0',
            visibility: step > 0 ? 'visible' : 'hidden',
          }}
        >
          ← Voltar
        </button>
        <button
          onClick={avancar}
          style={{
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            color: '#fff', border: 'none', borderRadius: '12px',
            padding: '14px 32px', fontSize: '15px', fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(37,99,235,.3)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(37,99,235,.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,99,235,.3)';
          }}
        >
          {step < 2 ? 'Continuar →' : 'Ver diagnóstico →'}
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MODO 1 — DESCOBRIR: Resultado (diagnóstico)
// ──────────────────────────────────────────────────────────────────────────────
function DiagnosticoDescobrir({
  resultado,
  onVoltar,
}: {
  resultado: ResultadoDescobrir;
  onVoltar: () => void;
}) {
  const { mcmv, sbpe, faixa, oruloMinPrice, oruloMaxPrice, rendaBruta, fgts } = resultado;
  const entrada = resultado.entrada;
  const [cenario, setCenario] = useState<'mcmv' | 'sbpe'>(mcmv.elegivel ? 'mcmv' : 'sbpe');

  const ativo = cenario === 'mcmv' ? mcmv : sbpe;

  // ── Injeta contexto para o João ────────────────────────────────────────────
  useEffect(() => {
    salvarContexto({
      pagina: '/simulador',
      modo: 'descobrir',
      resultado: {
        cenarioAtivo: cenario,
        valorMaxImovel: ativo.valorMaxImovel,
        parcela: ativo.parcela,
        valorFinanciado: ativo.valorFinanciado,
        comprometimento: ativo.comprometimento,
        taxa: cenario === 'mcmv' ? mcmv.taxa : 10.5,
        elegivelMCMV: mcmv.elegivel,
        faixa: faixa?.label ?? null,
        subsidioMax: faixa?.subsidioMax ?? 0,
        rendaBruta,
        fgts,
        entrada,
        oruloMinPrice,
        oruloMaxPrice,
      },
    });
  }, [cenario]); // re-salva se o usuário alternar MCMV ↔ SBPE
  const gradiente = cenario === 'mcmv'
    ? 'linear-gradient(145deg, #16a34a 0%, #059669 100%)'
    : 'linear-gradient(145deg, #2563eb 0%, #1d4ed8 100%)';
  const taxaLabel = cenario === 'mcmv'
    ? `${mcmv.taxa.toFixed(2).replace('.', ',')}% a.a. + TR`
    : '10,5% a.a. + TR';
  const modalidadeLabel = cenario === 'mcmv' ? `MCMV ${faixa?.label ?? ''}` : 'SBPE';

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>

      {/* Hero diagnóstico */}
      <div style={{
        background: gradiente,
        borderRadius: '20px',
        padding: '28px',
        marginBottom: '12px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circle */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '180px', height: '180px',
          borderRadius: '50%', background: 'rgba(255,255,255,.06)',
          pointerEvents: 'none',
        }} />

        {/* Toggle MCMV / SBPE */}
        {mcmv.elegivel && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '22px' }}>
            {(['mcmv', 'sbpe'] as const).map(c => (
              <button
                key={c}
                onClick={() => setCenario(c)}
                style={{
                  padding: '5px 14px', borderRadius: '99px',
                  border: '1.5px solid',
                  borderColor: cenario === c ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.25)',
                  background: cenario === c ? 'rgba(255,255,255,.95)' : 'transparent',
                  color: cenario === c ? (c === 'mcmv' ? '#16a34a' : '#2563eb') : 'rgba(255,255,255,.8)',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {c === 'mcmv' ? `MCMV ${faixa?.label}` : 'SBPE'}
              </button>
            ))}
          </div>
        )}

        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.7)', marginBottom: '4px' }}>
          Você pode comprar imóveis de até
        </p>
        <p style={{
          fontSize: 'clamp(36px, 8vw, 52px)',
          fontWeight: '800', color: '#fff', lineHeight: 1,
          marginBottom: '24px',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {formatBRL(ativo.valorMaxImovel)}
        </p>

        {/* 4 stat boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Parcela (Price)', value: `${formatBRL(ativo.parcela)}/mês` },
            { label: 'Taxa de juros', value: taxaLabel },
            { label: 'A financiar', value: formatBRL(ativo.valorFinanciado) },
            { label: 'Modalidade', value: modalidadeLabel },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,.12)',
              borderRadius: '12px', padding: '12px 14px',
            }}>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,.65)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label}
              </p>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Comprometimento */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: '16px',
        padding: '20px', marginBottom: '10px',
      }}>
        <BarraComprometimento pct={ativo.comprometimento} />
        <p style={{ fontSize: '12px', color: 'var(--text-faint)', marginTop: '10px' }}>
          Recomendado: máximo 30% da renda comprometida com parcelas (lei brasileira).
        </p>
      </div>

      {/* Subsídio */}
      {faixa && faixa.subsidioMax > 0 && cenario === 'mcmv' && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: '14px', padding: '16px 18px', marginBottom: '10px',
          display: 'flex', gap: '12px', alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>🎁</span>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#16a34a', marginBottom: '4px' }}>
              Subsídio do governo: até {formatBRL(faixa.subsidioMax)}
            </p>
            <p style={{ fontSize: '13px', color: '#166534', lineHeight: 1.55 }}>
              Na {faixa.label}, o governo abate até <strong>{formatBRL(faixa.subsidioMax)}</strong> do preço do imóvel — sem devolver. Você financia o restante.
            </p>
          </div>
        </div>
      )}

      {/* Se não elegível MCMV */}
      {!mcmv.elegivel && (
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: '14px', padding: '14px 18px', marginBottom: '10px',
        }}>
          <p style={{ fontSize: '13px', color: '#1d4ed8', lineHeight: 1.55 }}>
            ℹ️ Sua renda está acima dos limites do MCMV. O financiamento mais indicado é o <strong>SBPE/SFH</strong> com taxas de mercado (≈10,5% a.a.).
          </p>
        </div>
      )}

      {/* CTA: imóveis */}
      <Link href={`/imoveis?min=${oruloMinPrice}&max=${oruloMaxPrice}`} style={{ textDecoration: 'none', display: 'block', marginBottom: '8px' }}>
        <div
          style={{
            background: 'var(--bg-card)', border: '1.5px solid var(--border)',
            borderRadius: '16px', padding: '18px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div>
            <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)', marginBottom: '3px' }}>
              🏘️ Ver imóveis compatíveis
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Entre {formatBRL(oruloMinPrice)} e {formatBRL(oruloMaxPrice)} — filtro automático
            </p>
          </div>
          <span style={{ color: 'var(--primary)', fontSize: '18px' }}>→</span>
        </div>
      </Link>

      {/* CTA: na planta */}
      <Link
        href={`/simulador/na-planta?renda=${rendaBruta}&mcmv=${mcmv.valorFinanciado}&sbpe=${sbpe.valorFinanciado}&fgts=${fgts}&proprios=${entrada - fgts}`}
        style={{ textDecoration: 'none', display: 'block', marginBottom: '24px' }}
      >
        <div style={{
          background: '#0f172a', borderRadius: '16px', padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer',
        }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '3px' }}>
              🏗️ Simular imóvel na planta
            </p>
            <p style={{ fontSize: '12px', color: '#64748b' }}>
              Entrada · evolução de obra · crédito associativo · MCMV
            </p>
          </div>
          <span style={{ color: '#60a5fa', fontSize: '18px' }}>→</span>
        </div>
      </Link>

      <button
        onClick={onVoltar}
        style={{
          background: 'none', border: 'none',
          color: 'var(--text-faint)', fontSize: '13px',
          cursor: 'pointer', textDecoration: 'underline',
        }}
      >
        ← Nova simulação
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MODO 2 — JÁ SEI O IMÓVEL: Form (2 steps)
// ──────────────────────────────────────────────────────────────────────────────
function FormImovel({ onResult }: { onResult: (r: ResultadoSimulacao) => void }) {
  const [step, setStep] = useState(0);
  const [valorImovel, setValorImovel] = useState('');
  const [entrada, setEntrada] = useState('');
  const [fgts, setFgts] = useState('');
  const [renda, setRenda] = useState('');
  const [prazo, setPrazo] = useState('35');
  const [erro, setErro] = useState('');

  function avancar() {
    setErro('');
    if (step === 0) {
      const vi = parseMoeda(valorImovel);
      if (!vi || vi < 50000) {
        setErro('Informe um valor de imóvel válido — mínimo R$ 50.000.');
        return;
      }
    }
    if (step === 1) {
      const r = parseMoeda(renda);
      if (!r || r < 800) {
        setErro('Informe uma renda bruta válida — mínimo R$ 800.');
        return;
      }
    }
    if (step < 1) { setStep(s => s + 1); return; }

    const vi = parseMoeda(valorImovel);
    const e = parseMoeda(entrada);
    const f = parseMoeda(fgts);
    const r = parseMoeda(renda);
    onResult(simular({
      rendaBruta: r, fgts: f, entrada: e,
      valorImovel: vi, prazoAnos: parseInt(prazo),
      naPlanta: false, prazoObraAnos: 0,
    }));
  }

  return (
    <div>
      <Progresso total={2} atual={step} />

      {/* Step 0: Imóvel */}
      {step === 0 && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text)', lineHeight: 1.2, marginBottom: '10px' }}>
            Qual é o imóvel?
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '40px' }}>
            Informe o valor do imóvel e quanto você tem disponível para dar de entrada.
          </p>
          <CampoGrande
            label="Valor do imóvel"
            prefix="R$"
            placeholder="300.000"
            value={valorImovel}
            onChange={v => { setValorImovel(fmtInput(v)); setErro(''); }}
          />
          <CampoGrande
            label="Entrada disponível"
            prefix="R$"
            placeholder="60.000"
            value={entrada}
            onChange={v => setEntrada(fmtInput(v))}
            hint="Inclua todos os recursos: poupança, investimentos e FGTS"
          />
          <CampoGrande
            label="Saldo FGTS (incluso na entrada)"
            prefix="R$"
            placeholder="0"
            value={fgts}
            onChange={v => setFgts(fmtInput(v))}
            hint="Será subtraído da entrada para cálculo do LTV"
          />
        </div>
      )}

      {/* Step 1: Renda + Prazo */}
      {step === 1 && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          <h2 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text)', lineHeight: 1.2, marginBottom: '10px' }}>
            Qual é a renda familiar?
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '40px' }}>
            Renda bruta de todos os compradores. Usamos para verificar o comprometimento.
          </p>
          <CampoGrande
            label="Renda bruta mensal"
            prefix="R$"
            placeholder="8.000"
            value={renda}
            onChange={v => { setRenda(fmtInput(v)); setErro(''); }}
          />

          <div>
            <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
              Prazo do financiamento
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['20', '25', '30', '35'].map(p => (
                <button
                  key={p}
                  onClick={() => setPrazo(p)}
                  style={{
                    flex: 1, padding: '12px 4px', borderRadius: '10px',
                    border: `2px solid ${prazo === p ? 'var(--primary)' : 'var(--border)'}`,
                    background: prazo === p ? 'var(--primary-light)' : 'var(--bg)',
                    color: prazo === p ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: prazo === p ? '700' : '500',
                    fontSize: '14px', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {p}a
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {erro && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', margin: '16px 0' }}>
          <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>{erro}</p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '32px' }}>
        <button
          onClick={() => { setStep(s => s - 1); setErro(''); }}
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            fontSize: '14px', cursor: 'pointer',
            visibility: step > 0 ? 'visible' : 'hidden',
          }}
        >
          ← Voltar
        </button>
        <button
          onClick={avancar}
          style={{
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            color: '#fff', border: 'none', borderRadius: '12px',
            padding: '14px 32px', fontSize: '15px', fontWeight: '700',
            cursor: 'pointer', boxShadow: '0 4px 20px rgba(37,99,235,.3)',
          }}
        >
          {step < 1 ? 'Continuar →' : 'Simular →'}
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MODO 2 — JÁ SEI O IMÓVEL: Resultado
// ──────────────────────────────────────────────────────────────────────────────
function DiagnosticoImovel({
  resultado,
  onVoltar,
}: {
  resultado: ResultadoSimulacao;
  onVoltar: () => void;
}) {
  const {
    isMCMV, faixa, valorImovel, valorFinanciado,
    entrada, prazoMeses, taxaAnual, parcelaPrimeiro,
    seguros, comprometimento,
  } = resultado;

  // SAC calculation (parcelaPrimeiro from simular() is Price-based)
  const amortizacaoSAC = valorFinanciado / prazoMeses;
  const jurosPrimeiro  = valorFinanciado * (taxaAnual / 100 / 12);
  const parcelaSAC1   = Math.round(amortizacaoSAC + jurosPrimeiro + seguros.total);
  const jurosFinal    = amortizacaoSAC * (taxaAnual / 100 / 12);
  const parcelaSACFinal = Math.round(amortizacaoSAC + jurosFinal + seguros.total);
  const parcelaPrice  = parcelaPrimeiro; // from simular()

  // Totals
  const totalSAC   = Math.round((parcelaSAC1 + parcelaSACFinal) / 2 * prazoMeses);
  const totalPrice = Math.round(parcelaPrice * prazoMeses);
  const jurosSAC   = totalSAC - valorFinanciado;
  const jurosPrice = totalPrice - valorFinanciado;

  const pctEntrada = Math.round((entrada / valorImovel) * 100);
  const modalidade = isMCMV ? (faixa ? `MCMV ${faixa.label}` : 'MCMV') : 'SBPE / SFH';

  // ── Injeta contexto para o João ────────────────────────────────────────────
  useEffect(() => {
    salvarContexto({
      pagina: '/simulador',
      modo: 'imovel',
      resultado: {
        valorImovel,
        valorFinanciado,
        entrada,
        pctEntrada,
        prazoMeses,
        prazoAnos: prazoMeses / 12,
        taxaAnual,
        parcelaSAC1,
        parcelaSACFinal,
        parcelaPrice,
        totalSAC,
        totalPrice,
        jurosSAC,
        jurosPrice,
        comprometimento,
        isMCMV,
        faixa: faixa?.label ?? null,
        modalidade,
        seguros,
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gradiente  = isMCMV
    ? 'linear-gradient(145deg, #16a34a 0%, #059669 100%)'
    : 'linear-gradient(145deg, #2563eb 0%, #1d4ed8 100%)';

  const viavel = comprometimento <= 35;
  const taxa   = isMCMV && faixa
    ? `${faixa.taxaRef.toFixed(2).replace('.', ',')}% a.a. + TR`
    : '10,5% a.a. + TR';

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>

      {/* Hero */}
      <div style={{
        background: gradiente, borderRadius: '20px',
        padding: '28px', marginBottom: '12px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', bottom: '-30px', right: '-30px',
          width: '140px', height: '140px', borderRadius: '50%',
          background: 'rgba(255,255,255,.06)', pointerEvents: 'none',
        }} />

        {/* Status badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          background: 'rgba(255,255,255,.15)', borderRadius: '99px',
          padding: '5px 14px', marginBottom: '18px',
        }}>
          <span>{viavel ? '✅' : '⚠️'}</span>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>
            {modalidade} — {viavel ? 'Financiamento viável' : 'Comprometimento elevado'}
          </span>
        </div>

        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.65)', marginBottom: '4px' }}>
          Imóvel
        </p>
        <p style={{
          fontSize: 'clamp(32px, 7vw, 46px)', fontWeight: '800',
          color: '#fff', lineHeight: 1, marginBottom: '22px',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {formatBRL(valorImovel)}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Entrada', value: `${formatBRL(entrada)} (${pctEntrada}%)` },
            { label: 'Financiado', value: formatBRL(valorFinanciado) },
            { label: 'Prazo', value: `${prazoMeses / 12} anos` },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,.12)', borderRadius: '10px', padding: '10px 12px' }}>
              <p style={{ fontSize: '9px', color: 'rgba(255,255,255,.6)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</p>
              <p style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SAC vs Price */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '20px', marginBottom: '10px' }}>
        <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>
          SAC × Price — Comparativo
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          {/* SAC */}
          <div style={{ border: '1.5px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
            <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              SAC
            </p>
            <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginBottom: '2px' }}>1ª parcela</p>
            <p style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px', lineHeight: 1 }}>
              {formatBRL(parcelaSAC1)}
            </p>
            <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginBottom: '2px' }}>Última parcela</p>
            <p style={{ fontSize: '16px', fontWeight: '700', color: '#16a34a', marginBottom: '10px' }}>
              {formatBRL(parcelaSACFinal)}
            </p>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
              <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginBottom: '2px' }}>Total de juros</p>
              <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>{formatBRL(jurosSAC)}</p>
            </div>
          </div>

          {/* Price */}
          <div style={{ border: '1.5px solid var(--border)', borderRadius: '14px', padding: '16px' }}>
            <p style={{ fontSize: '10px', fontWeight: '700', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              Price
            </p>
            <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginBottom: '2px' }}>Parcela fixa</p>
            <p style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px', lineHeight: 1 }}>
              {formatBRL(parcelaPrice)}
            </p>
            <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginBottom: '2px' }}>Sempre igual</p>
            <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '10px' }}>
              ≡ fixo
            </p>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
              <p style={{ fontSize: '10px', color: 'var(--text-faint)', marginBottom: '2px' }}>Total de juros</p>
              <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>{formatBRL(jurosPrice)}</p>
            </div>
          </div>
        </div>

        <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '12px 14px' }}>
          <p style={{ fontSize: '12px', color: '#1e40af', lineHeight: 1.6, margin: 0 }}>
            <strong>SAC</strong> economiza {formatBRL(jurosPrice - jurosSAC)} em juros no total, mas exige parcela inicial maior.{' '}
            <strong>Price</strong> é previsível e mais acessível no início.
          </p>
        </div>
      </div>

      {/* Comprometimento */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '20px', marginBottom: '10px' }}>
        <BarraComprometimento pct={comprometimento} />
        {comprometimento > 30 && (
          <div style={{ marginTop: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 13px' }}>
            <p style={{ fontSize: '12px', color: '#92400e', margin: 0, lineHeight: 1.5 }}>
              ⚠️ Comprometimento acima do recomendado. O banco pode exigir um codevedor, reduzir o prazo ou pedir maior entrada.
            </p>
          </div>
        )}
      </div>

      {/* Detalhes 1ª parcela SAC */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '20px', marginBottom: '10px' }}>
        <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
          Composição — 1ª parcela SAC
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-faint)', marginBottom: '14px' }}>
          Taxa: {taxa} · {prazoMeses / 12} anos
        </p>
        <LinhaDetalhe label="Amortização" valor={formatBRL(Math.round(amortizacaoSAC))} />
        <LinhaDetalhe label="Juros" valor={formatBRL(Math.round(jurosPrimeiro))} />
        <LinhaDetalhe label="MIP (seguro de vida)" valor={formatBRL(seguros.mip)} />
        <LinhaDetalhe label="DFI (seguro do imóvel)" valor={formatBRL(seguros.dfi)} />
        <LinhaDetalhe label="Taxa de administração" valor={`R$ ${seguros.txAdm}`} />
        <LinhaDetalhe label="Total 1ª parcela (SAC)" valor={formatBRL(parcelaSAC1)} destaque />
      </div>

      {/* CTA planta */}
      <Link href="/simulador/na-planta" style={{ textDecoration: 'none', display: 'block', marginBottom: '24px' }}>
        <div style={{
          background: '#0f172a', borderRadius: '16px', padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer',
        }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '3px' }}>
              🏗️ Esse imóvel é na planta?
            </p>
            <p style={{ fontSize: '12px', color: '#64748b' }}>
              Simule entrada parcelada, evolução de obra e crédito associativo
            </p>
          </div>
          <span style={{ color: '#60a5fa', fontSize: '18px' }}>→</span>
        </div>
      </Link>

      <button
        onClick={onVoltar}
        style={{
          background: 'none', border: 'none',
          color: 'var(--text-faint)', fontSize: '13px',
          cursor: 'pointer', textDecoration: 'underline',
        }}
      >
        ← Nova simulação
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MODO 3 — NA PLANTA: Cartão de entrada
// ──────────────────────────────────────────────────────────────────────────────
function CartaoPlanta() {
  const features = [
    { icon: '📋', text: 'Estágio do empreendimento (pré-lançamento, obra, pronto)' },
    { icon: '📈', text: 'Curva SIOPI/Caixa de evolução física de obra' },
    { icon: '💰', text: 'Juros evolutivos mensais durante a construção' },
    { icon: '🏦', text: 'Crédito Associativo MCMV Faixas 1–4 e HIS' },
    { icon: '🏗️', text: 'Entrada parcelada + FGTS + recursos próprios' },
    { icon: '📅', text: 'Cronograma físico-financeiro realista' },
  ];

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)', marginBottom: '10px' }}>
        Imóvel na planta
      </h2>
      <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '32px' }}>
        O simulador mais completo para compra na planta — reproduz a lógica real da construtora e da Caixa Econômica Federal.
      </p>

      <div style={{
        background: '#0f172a', borderRadius: '20px',
        padding: '28px', marginBottom: '14px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          {features.map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '16px', lineHeight: '20px', flexShrink: 0 }}>{icon}</span>
              <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>{text}</p>
            </div>
          ))}
        </div>
        <Link href="/simulador/na-planta" style={{ textDecoration: 'none', display: 'block' }}>
          <button style={{
            width: '100%', background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            color: '#fff', border: 'none', borderRadius: '12px',
            padding: '15px 24px', fontSize: '15px', fontWeight: '700',
            cursor: 'pointer', boxShadow: '0 4px 20px rgba(37,99,235,.4)',
          }}>
            Abrir Simulador na Planta →
          </button>
        </Link>
      </div>

      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe',
        borderRadius: '12px', padding: '14px 16px',
      }}>
        <p style={{ fontSize: '12px', color: '#1e40af', lineHeight: 1.55, margin: 0 }}>
          💡 <strong>Dica:</strong> Execute primeiro o simulador "Descobrir" para identificar sua faixa MCMV — o resultado é aproveitado automaticamente no simulador de planta.
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────────────────────────────────────
export default function SimuladorPage() {
  const [modo, setModo] = useState<Modo>('descobrir');
  const [fase, setFase] = useState<Fase>('form');
  const [resDescobrir, setResDescobrir] = useState<ResultadoDescobrir | null>(null);
  const [resImovel, setResImovel] = useState<ResultadoSimulacao | null>(null);

  function trocarModo(m: Modo) {
    setModo(m);
    setFase('form');
    setResDescobrir(null);
    setResImovel(null);
  }

  const modoLabels: Record<Modo, string> = {
    descobrir: '🔍 Descobrir',
    imovel: '🏠 Já sei o imóvel',
    planta: '🏗️ Na planta',
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── Hero (só na fase de form) ─────────────────────────────────────── */}
      {fase === 'form' && (
        <section style={{
          background: 'linear-gradient(160deg, #0f172a 0%, #1a2e4a 55%, #0f172a 100%)',
          padding: '72px 24px 88px',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <p style={{
              fontSize: '11px', fontWeight: '700', color: '#64748b',
              letterSpacing: '1.2px', textTransform: 'uppercase',
              marginBottom: '20px',
            }}>
              Simulador Inteligente · FinancieCerto
            </p>
            <h1 style={{
              fontSize: 'clamp(26px, 5vw, 42px)',
              fontWeight: '800', color: '#fff', lineHeight: 1.2,
              marginBottom: '16px',
            }}>
              Descubra o imóvel certo<br />para a sua realidade
            </h1>
            <p style={{
              fontSize: '16px', color: 'rgba(255,255,255,.55)',
              lineHeight: 1.7, marginBottom: '40px',
            }}>
              Simulação personalizada por renda, entrada e perfil financeiro. MCMV, SBPE e crédito associativo.
            </p>
            <ModeSelector modo={modo} onChange={trocarModo} />
          </div>
        </section>
      )}

      {/* ── Breadcrumb (resultado) ───────────────────────────────────────── */}
      {fase === 'resultado' && (
        <div style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)',
          padding: '14px 24px',
        }}>
          <div style={{ maxWidth: '560px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                setFase('form');
                setResDescobrir(null);
                setResImovel(null);
              }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              ← Simulador
            </button>
            <span style={{ color: 'var(--border)', fontSize: '14px' }}>›</span>
            <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: '600' }}>
              {modoLabels[modo]}
            </span>
          </div>
        </div>
      )}

      {/* ── Conteúdo principal ──────────────────────────────────────────────── */}
      <div style={{
        maxWidth: '560px',
        margin: fase === 'form' ? '-40px auto 0' : '0 auto',
        padding: fase === 'form' ? '0 16px 80px' : '36px 16px 80px',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Container card (só no form) */}
        {fase === 'form' ? (
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '20px',
            padding: '36px 28px',
            boxShadow: '0 4px 40px rgba(0,0,0,.10)',
            border: '1px solid var(--border)',
          }}>
            {modo === 'descobrir' && (
              <FormDescobrir onResult={r => { setResDescobrir(r); setFase('resultado'); }} />
            )}
            {modo === 'imovel' && (
              <FormImovel onResult={r => { setResImovel(r); setFase('resultado'); }} />
            )}
            {modo === 'planta' && <CartaoPlanta />}

            <p style={{
              textAlign: 'center', fontSize: '11px',
              color: 'var(--text-faint)', marginTop: '24px',
            }}>
              🔒 Seus dados não são armazenados · Simulação gratuita
            </p>
          </div>
        ) : (
          <>
            {modo === 'descobrir' && resDescobrir && (
              <DiagnosticoDescobrir resultado={resDescobrir} onVoltar={() => { setFase('form'); setResDescobrir(null); }} />
            )}
            {modo === 'imovel' && resImovel && (
              <DiagnosticoImovel resultado={resImovel} onVoltar={() => { setFase('form'); setResImovel(null); }} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
