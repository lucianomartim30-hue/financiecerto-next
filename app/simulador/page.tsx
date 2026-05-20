'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  descobrir, simular, formatBRL, parseBRL,
  detectarFaixaMCMV, calcSubsidioEstimado,
  getMIPCoeff, TAXA_SBPE_ANUAL, FAIXAS_MCMV, TR_MENSAL,
  type ResultadoDescobrir, type ResultadoSimulacao,
} from '@/lib/calculos';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtInput(v: string): string {
  const n = v.replace(/\D/g, '');
  return n ? Number(n).toLocaleString('pt-BR') : '';
}
function parseMoeda(v: string): number { return Number(v.replace(/\D/g, '')) || 0; }
function salvarCtx(ctx: Record<string, unknown>) {
  try {
    sessionStorage.setItem('joao_sim_context', JSON.stringify(ctx));
    window.dispatchEvent(new StorageEvent('storage', { key: 'joao_sim_context' }));
  } catch { /* SSR */ }
}

// ─── Paleta de saúde ─────────────────────────────────────────────────────────
const SAUDE: Record<string, { cor: string; bg: string; txt: string; emoji: string }> = {
  ótimo:   { cor: '#0F6E56', bg: '#E1F5EE', txt: '#085041', emoji: '✅' },
  bom:     { cor: '#3B6D11', bg: '#EAF3DE', txt: '#27500A', emoji: '👍' },
  atenção: { cor: '#854F0B', bg: '#FAEEDA', txt: '#633806', emoji: '⚠️' },
  risco:   { cor: '#993C1D', bg: '#FAECE7', txt: '#4A1B0C', emoji: '🚨' },
};

// ─── Barra de progresso ───────────────────────────────────────────────────────
function Barra({ etapa, total }: { etapa: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 36, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 4, flex: i === etapa ? 2 : 1,
          borderRadius: 99,
          background: i < etapa ? 'var(--primary)' : i === etapa ? 'var(--primary)' : 'var(--border)',
          opacity: i < etapa ? 0.45 : 1,
          transition: 'all .35s ease',
        }} />
      ))}
      <span style={{ fontSize: 12, color: 'var(--text-faint)', marginLeft: 6 }}>
        {etapa + 1}/{total}
      </span>
    </div>
  );
}

// ─── Input monetário grande ───────────────────────────────────────────────────
function InputBRL({
  label, hint, value, onChange, prefix = 'R$', placeholder = '0',
}: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void; prefix?: string; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 28 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.8px' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 10, borderBottom: `2px solid ${focused ? 'var(--primary)' : 'var(--border)'}`, transition: 'border-color .2s' }}>
        <span style={{ fontSize: 24, fontWeight: 300, color: focused ? 'var(--primary)' : 'var(--text-faint)', transition: 'color .2s', flexShrink: 0 }}>{prefix}</span>
        <input
          type="text" inputMode="numeric"
          value={value}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={e => onChange(fmtInput(e.target.value))}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 32, fontWeight: 600, background: 'transparent', color: 'var(--text)', fontFamily: 'inherit', width: '100%' }}
        />
      </div>
      {hint && <p style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 8 }}>{hint}</p>}
    </div>
  );
}

// ─── Chip toggle ─────────────────────────────────────────────────────────────
function Chip({ label, ativo, onClick }: { label: string; ativo: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 20px', borderRadius: 99, border: `1.5px solid ${ativo ? 'var(--primary)' : 'var(--border)'}`,
      background: ativo ? 'var(--primary)' : 'transparent',
      color: ativo ? '#fff' : 'var(--text)', fontSize: 14, fontWeight: ativo ? 600 : 400,
      cursor: 'pointer', transition: 'all .2s', fontFamily: 'inherit',
    }}>
      {label}
    </button>
  );
}

// ─── Badge de faixa ───────────────────────────────────────────────────────────
function BadgeFaixa({ renda }: { renda: number }) {
  if (!renda) return null;
  const faixa = detectarFaixaMCMV(renda);
  if (!faixa) return <span style={{ fontSize: 13, color: '#185FA5', background: '#E6F1FB', padding: '3px 10px', borderRadius: 99, fontWeight: 600 }}>SBPE — sem limite</span>;
  const cores: Record<number, { bg: string; txt: string }> = {
    1: { bg: '#E1F5EE', txt: '#0F6E56' },
    2: { bg: '#E6F1FB', txt: '#185FA5' },
    3: { bg: '#FAEEDA', txt: '#854F0B' },
    4: { bg: '#FAECE7', txt: '#993C1D' },
  };
  const c = cores[faixa.numero];
  return (
    <span style={{ fontSize: 13, color: c.txt, background: c.bg, padding: '3px 12px', borderRadius: 99, fontWeight: 700, display: 'inline-block' }}>
      {faixa.label} MCMV · {faixa.taxaRef}% a.a. + TR
    </span>
  );
}

// ─── Botão principal ──────────────────────────────────────────────────────────
function BtnPrimario({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        width: '100%', padding: '16px 0', borderRadius: 12, border: 'none',
        background: disabled ? 'var(--border)' : 'var(--primary)',
        color: disabled ? 'var(--text-faint)' : '#fff',
        fontSize: 16, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background .2s', fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  );
}

// ─── Container de etapa ───────────────────────────────────────────────────────
function Etapa({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 20px 60px' }}>
      {children}
    </div>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', lineHeight: 1.25, marginBottom: 10, marginTop: 0 }}>{children}</h1>;
}

function Subtitulo({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 16, color: 'var(--text-faint)', lineHeight: 1.6, marginBottom: 32, marginTop: 0 }}>{children}</p>;
}

// ─── ESTADO GLOBAL DA SESSÃO ──────────────────────────────────────────────────
type Estado = {
  renda: string;
  idade: string;
  dependentes: number;
  fgts: string;
  cotista: boolean;
  primeiroImovel: boolean;
  jaRecebeuBeneficio: boolean;
  temImovelMunicipio: boolean;
  entrada: string;
  valorImovel: string;
  prazoAnos: number;
  naPlanta: boolean;
};

const ESTADO_INICIAL: Estado = {
  renda: '', idade: '', dependentes: 0,
  fgts: '', cotista: true, primeiroImovel: true,
  jaRecebeuBeneficio: false, temImovelMunicipio: false,
  entrada: '', valorImovel: '', prazoAnos: 35, naPlanta: false,
};

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function SimuladorPage() {
  const router = useRouter();
  const [etapa, setEtapa] = useState(0);
  const [e, setE] = useState<Estado>(ESTADO_INICIAL);
  const [perfil, setPerfil] = useState<ResultadoDescobrir | null>(null);
  const [sim, setSim] = useState<ResultadoSimulacao | null>(null);
  const TOTAL_ETAPAS = 7;

  function upd(partial: Partial<Estado>) { setE(prev => ({ ...prev, ...partial })); }

  function calcularPerfil() {
    const r = descobrir(
      parseMoeda(e.renda),
      parseMoeda(e.fgts),
      parseMoeda(e.entrada),
      e.prazoAnos,
      Number(e.idade) || 35,
      e.cotista, e.primeiroImovel, e.jaRecebeuBeneficio, e.dependentes,
    );
    setPerfil(r);
    salvarCtx({
      renda: parseMoeda(e.renda), fgts: parseMoeda(e.fgts),
      entrada: parseMoeda(e.entrada), faixa: r.faixa?.label ?? 'SBPE',
      valorMaxImovel: r.mcmv.elegivel ? r.mcmv.valorMaxImovel : r.sbpe.valorMaxImovel,
    });
  }

  function calcularSimulacao() {
    if (!e.valorImovel) return;
    const r = simular({
      rendaBruta: parseMoeda(e.renda),
      fgts: parseMoeda(e.fgts),
      entrada: parseMoeda(e.entrada),
      valorImovel: parseMoeda(e.valorImovel),
      prazoAnos: e.prazoAnos,
      naPlanta: e.naPlanta,
      prazoObraAnos: 3,
      idadeProponente: Number(e.idade) || 35,
      cotista: e.cotista,
      primeiroImovel: e.primeiroImovel,
      jaRecebeuBeneficio: e.jaRecebeuBeneficio,
      temImovelMunicipio: e.temImovelMunicipio,
      dependentes: e.dependentes,
    });
    setSim(r);
  }

  function avancar() {
    if (etapa === 4) calcularPerfil();
    if (etapa === 5 && e.valorImovel) calcularSimulacao();
    setEtapa(e => Math.min(e + 1, TOTAL_ETAPAS - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function voltar() {
    setEtapa(e => Math.max(e - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const voltar_link = (
    etapa > 0 ? (
      <button onClick={voltar} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 14, cursor: 'pointer', padding: 0, fontFamily: 'inherit', marginBottom: 24, display: 'block' }}>
        ← Voltar
      </button>
    ) : null
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA 0 — LANDING
  // ═══════════════════════════════════════════════════════════════════════════
  if (etapa === 0) return (
    <Etapa>
      <div style={{ paddingTop: 60 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 16 }}>Simulador FinancieCerto 2026</div>
        <Titulo>Primeiro entenda seu perfil. Depois busque o imóvel.</Titulo>
        <Subtitulo>A maioria das pessoas busca imóvel sem saber quanto pode financiar. Aqui você descobre sua faixa real, taxa de juros, subsídio e parcela — antes de ver qualquer imóvel.</Subtitulo>

        <div style={{ display: 'grid', gap: 12, marginBottom: 36 }}>
          {[
            { ico: '📊', txt: 'Faixa MCMV, SBPE ou SFI — detectada pela sua renda' },
            { ico: '🏦', txt: 'Taxa real da Caixa + cálculo de subsídio estimado' },
            { ico: '📋', txt: 'MIP etário calibrado pelo contrato SIOPI/Caixa' },
            { ico: '🏠', txt: 'Imóveis compatíveis com seu perfil ao final' },
          ].map(({ ico, txt }) => (
            <div key={txt} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{ico}</span>
              <span style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{txt}</span>
            </div>
          ))}
        </div>

        <BtnPrimario label="Começar — leva 2 minutos" onClick={avancar} />

        <p style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', marginTop: 16 }}>
          Baseado nas regras SFH/MCMV vigentes · maio/2026 · TR {TR_MENSAL}%/mês
        </p>
      </div>
    </Etapa>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA 1 — RENDA
  // ═══════════════════════════════════════════════════════════════════════════
  if (etapa === 1) {
    const renda = parseMoeda(e.renda);
    return (
      <Etapa>
        {voltar_link}
        <Barra etapa={0} total={6} />
        <Titulo>Qual é a renda familiar mensal?</Titulo>
        <Subtitulo>Some a renda bruta de todos que vão participar do financiamento — casal, pais, filhos.</Subtitulo>

        <InputBRL label="Renda total bruta" value={e.renda} onChange={v => upd({ renda: v })}
          hint="Renda antes de descontos. Inclua todos os participantes." />

        {renda > 0 && (
          <div style={{ marginBottom: 28 }}>
            <BadgeFaixa renda={renda} />
            {renda <= 13000 && (
              <p style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 8 }}>
                {detectarFaixaMCMV(renda)
                  ? `Teto do imóvel: ${formatBRL(detectarFaixaMCMV(renda)!.teto)} · Subsídio máx: ${formatBRL(detectarFaixaMCMV(renda)!.subsidioMax)}`
                  : ''}
              </p>
            )}
            {renda > 13000 && (
              <p style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 8 }}>
                Mercado livre (SBPE) · Taxa Caixa: {TAXA_SBPE_ANUAL}% a.a. + TR
              </p>
            )}
          </div>
        )}

        <BtnPrimario label="Próximo →" onClick={avancar} disabled={renda < 500} />
      </Etapa>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA 2 — COMPOSIÇÃO FAMILIAR
  // ═══════════════════════════════════════════════════════════════════════════
  if (etapa === 2) {
    const idade = Number(e.idade) || 0;
    const prazoMax = idade > 0 ? Math.min(35, Math.floor(80.5 - idade)) : 35;
    return (
      <Etapa>
        {voltar_link}
        <Barra etapa={1} total={6} />
        <Titulo>Composição familiar</Titulo>
        <Subtitulo>O prazo máximo é definido pela idade do proponente mais velho. Limite: 80 anos e 6 meses.</Subtitulo>

        <InputBRL label="Idade do proponente mais velho" value={e.idade}
          onChange={v => upd({ idade: v.replace(/\D/g, '') })}
          prefix="🎂" placeholder="35" hint="Define o prazo máximo do financiamento" />

        {idade > 0 && (
          <div style={{ padding: '12px 16px', background: '#E6F1FB', borderRadius: 10, marginBottom: 24 }}>
            <span style={{ fontSize: 14, color: '#185FA5', fontWeight: 600 }}>Prazo máximo: {prazoMax} anos</span>
            {prazoMax < 35 && <span style={{ fontSize: 13, color: '#185FA5', marginLeft: 8 }}>(limitado pela idade)</span>}
          </div>
        )}

        <div style={{ marginBottom: 28 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '.8px' }}>Dependentes (filhos)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 1, 2, 3, 4].map(n => (
              <Chip key={n} label={n === 4 ? '4+' : String(n)} ativo={e.dependentes === n} onClick={() => upd({ dependentes: n })} />
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 8 }}>Dependentes aumentam levemente o subsídio estimado</p>
        </div>

        <BtnPrimario label="Próximo →" onClick={avancar} disabled={!e.idade} />
      </Etapa>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA 3 — FGTS E ELEGIBILIDADE
  // ═══════════════════════════════════════════════════════════════════════════
  if (etapa === 3) {
    const renda = parseMoeda(e.renda);
    const faixa = detectarFaixaMCMV(renda);
    return (
      <Etapa>
        {voltar_link}
        <Barra etapa={2} total={6} />
        <Titulo>FGTS e elegibilidade</Titulo>
        <Subtitulo>O FGTS pode ser usado como entrada e reduz o valor financiado — abaixando a parcela.</Subtitulo>

        <InputBRL label="Saldo do FGTS disponível" value={e.fgts} onChange={v => upd({ fgts: v })}
          hint="Saldo atual da sua conta FGTS. Deixe em branco se não tiver." />

        <div style={{ display: 'grid', gap: 10, marginBottom: 28 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.8px' }}>Condições de uso do FGTS</label>

          {[
            { key: 'cotista', label: 'Cotista FGTS há pelo menos 3 anos', val: e.cotista, set: (v: boolean) => upd({ cotista: v }) },
            { key: 'primeiroImovel', label: 'Será o meu primeiro imóvel financiado', val: e.primeiroImovel, set: (v: boolean) => upd({ primeiroImovel: v }) },
          ].map(({ key, label, val, set }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 10, border: `1px solid ${val ? 'var(--primary)' : 'var(--border)'}`, cursor: 'pointer' }}
              onClick={() => set(!val)}>
              <span style={{ fontSize: 14, color: 'var(--text)' }}>{label}</span>
              <div style={{
                width: 42, height: 24, borderRadius: 99,
                background: val ? 'var(--primary)' : 'var(--border)',
                position: 'relative', transition: 'background .2s', flexShrink: 0,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 99, background: '#fff',
                  position: 'absolute', top: 3,
                  left: val ? 21 : 3, transition: 'left .2s',
                }} />
              </div>
            </div>
          ))}
        </div>

        {faixa && (
          <div style={{ display: 'grid', gap: 10, marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.8px' }}>Elegibilidade MCMV (impacta subsídio)</label>
            {[
              { key: 'jaRecebeuBeneficio', label: 'Já recebi benefício habitacional (MCMV, subsídio)', val: e.jaRecebeuBeneficio, set: (v: boolean) => upd({ jaRecebeuBeneficio: v }) },
              { key: 'temImovelMunicipio', label: 'Tenho imóvel no mesmo município', val: e.temImovelMunicipio, set: (v: boolean) => upd({ temImovelMunicipio: v }) },
            ].map(({ key, label, val, set }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 10, border: `1px solid ${val ? '#E24B4A' : 'var(--border)'}`, cursor: 'pointer' }}
                onClick={() => set(!val)}>
                <span style={{ fontSize: 14, color: 'var(--text)' }}>{label}</span>
                <div style={{ width: 42, height: 24, borderRadius: 99, background: val ? '#E24B4A' : 'var(--border)', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 99, background: '#fff', position: 'absolute', top: 3, left: val ? 21 : 3, transition: 'left .2s' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <BtnPrimario label="Próximo →" onClick={avancar} />
      </Etapa>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA 4 — ENTRADA
  // ═══════════════════════════════════════════════════════════════════════════
  if (etapa === 4) {
    const renda = parseMoeda(e.renda);
    const fgts  = parseMoeda(e.fgts);
    const entrada = parseMoeda(e.entrada);
    const faixa = detectarFaixaMCMV(renda);
    const total = entrada + (e.cotista && e.primeiroImovel ? fgts : 0);
    const entradaMinPct = faixa ? (faixa.numero <= 2 ? 0.05 : 0.20) : 0.30;
    const entradaRef = total;
    return (
      <Etapa>
        {voltar_link}
        <Barra etapa={3} total={6} />
        <Titulo>Quanto você tem de entrada?</Titulo>
        <Subtitulo>Soma o dinheiro guardado mais o FGTS disponível. Quanto mais entrada, menor a parcela.</Subtitulo>

        <InputBRL label="Entrada em dinheiro (poupança, reserva)" value={e.entrada} onChange={v => upd({ entrada: v })}
          hint="Não inclua o FGTS aqui — já calculamos acima." />

        {total > 0 && (
          <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 28 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Poupança</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{formatBRL(entrada)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>FGTS</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: e.cotista && e.primeiroImovel ? 'var(--text)' : 'var(--text-faint)' }}>
                  {e.cotista && e.primeiroImovel ? formatBRL(fgts) : '—'}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Total</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{formatBRL(total)}</div>
              </div>
            </div>
          </div>
        )}

        {faixa && (
          <p style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 28 }}>
            Entrada mínima {faixa.label}: {(entradaMinPct * 100).toFixed(0)}% do imóvel · FGTS pode complementar a entrada nos imóveis MCMV.
          </p>
        )}

        <BtnPrimario label="Descobrir meu perfil →" onClick={avancar} />
      </Etapa>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA 5 — REVELAÇÃO DO PERFIL
  // ═══════════════════════════════════════════════════════════════════════════
  if (etapa === 5) {
    if (!perfil) { calcularPerfil(); return <Etapa><p>Calculando...</p></Etapa>; }

    const { faixa, mcmv, sbpe, subsidioEstimado, prazoMaxMeses } = perfil;
    const useMCMV = mcmv.elegivel;
    const valorMax = useMCMV ? mcmv.valorMaxImovel : sbpe.valorMaxImovel;
    const parcela = useMCMV ? mcmv.parcela : sbpe.parcela;
    const compr = useMCMV ? mcmv.comprometimento : sbpe.comprometimento;
    const saude = compr <= 20 ? 'ótimo' : compr <= 25 ? 'bom' : compr <= 30 ? 'atenção' : 'risco';
    const sc = SAUDE[saude];
    const modalidade = useMCMV ? `${faixa!.label} MCMV` : 'SBPE';
    const taxa = useMCMV ? faixa!.taxaRef : TAXA_SBPE_ANUAL;
    const prazoAnos = Math.round(prazoMaxMeses / 12);

    return (
      <Etapa>
        <Barra etapa={4} total={6} />

        {/* Card de Revelação */}
        <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 20, overflow: 'hidden', marginBottom: 24 }}>
          {/* Header */}
          <div style={{ background: 'var(--primary)', padding: '24px 24px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.7)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Seu perfil de compra</div>
            <div style={{ fontSize: 38, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{formatBRL(valorMax)}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.8)', marginTop: 6 }}>valor máximo do imóvel</div>
            <div style={{ display: 'inline-block', marginTop: 14, padding: '5px 16px', background: 'rgba(255,255,255,.2)', borderRadius: 99, fontSize: 13, color: '#fff', fontWeight: 700 }}>
              {modalidade} · {taxa}% a.a. + TR
            </div>
          </div>

          {/* Grid de métricas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--border)' }}>
            {[
              { l: 'Parcela estimada', v: formatBRL(parcela) + '/mês', d: `${compr.toFixed(1)}% da renda` },
              { l: 'Prazo máximo', v: `${prazoAnos} anos`, d: `${prazoMaxMeses} meses` },
              { l: useMCMV ? 'Subsídio estimado' : 'FGTS disponível', v: useMCMV ? formatBRL(subsidioEstimado || 0) : formatBRL(perfil.fgts), d: useMCMV ? 'Valor estimado · confirme na Caixa' : 'Usado como entrada' },
              { l: 'Taxa de juros', v: `${taxa}% a.a.`, d: `+TR ${TR_MENSAL}%/mês` },
            ].map(({ l, v, d }) => (
              <div key={l} style={{ padding: '16px', background: 'var(--bg-card)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.4px' }}>{l}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{v}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{d}</div>
              </div>
            ))}
          </div>

          {/* Saúde financeira */}
          <div style={{ padding: '16px 20px', background: sc.bg, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{sc.emoji}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: sc.txt }}>Saúde financeira: {saude.toUpperCase()}</div>
              <div style={{ fontSize: 12, color: sc.cor }}>
                {saude === 'ótimo' && 'Comprometimento abaixo de 20% — excelente margem de segurança.'}
                {saude === 'bom' && 'Entre 20% e 25% — dentro do ideal, com alguma folga.'}
                {saude === 'atenção' && 'Entre 25% e 30% — aprovável, mas próximo do limite bancário.'}
                {saude === 'risco' && 'Acima de 30% — banco provavelmente reprovará. Considere aumentar a entrada ou o prazo.'}
              </div>
            </div>
          </div>
        </div>

        {/* Informações adicionais */}
        {!useMCMV && faixa && (
          <div style={{ padding: '12px 16px', background: '#FAEEDA', borderRadius: 10, marginBottom: 16, fontSize: 13, color: '#633806' }}>
            <strong>Renda compatível com {faixa.label} MCMV</strong>, mas o teto do imóvel ({formatBRL(faixa.teto)}) limita a compra. Para imóveis acima do teto, usa-se o SBPE ({TAXA_SBPE_ANUAL}% a.a.).
          </div>
        )}

        {subsidioEstimado > 0 && (
          <div style={{ padding: '12px 16px', background: '#E1F5EE', borderRadius: 10, marginBottom: 16, fontSize: 13, color: '#085041' }}>
            ✅ Subsídio estimado de <strong>{formatBRL(subsidioEstimado)}</strong> incluído no cálculo. O valor exato depende do perfil, município e disponibilidade de verba — confirme na Caixa.
          </div>
        )}

        {/* CTAs */}
        <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          <Link href={`/imoveis?max=${valorMax}&modalidade=${useMCMV ? 'mcmv' : 'sbpe'}`}
            style={{ display: 'block', padding: '16px 0', borderRadius: 12, background: 'var(--primary)', color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
            🏠 Ver imóveis compatíveis
          </Link>
          <button onClick={avancar}
            style={{ padding: '14px 0', borderRadius: 12, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Simular imóvel específico
          </button>
        </div>

        <button onClick={voltar} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit', display: 'block', textAlign: 'center', width: '100%' }}>
          ← Ajustar dados
        </button>
      </Etapa>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA 6 — SIMULAÇÃO DE IMÓVEL ESPECÍFICO
  // ═══════════════════════════════════════════════════════════════════════════
  if (etapa === 6) {
    const valorImovel = parseMoeda(e.valorImovel);
    const perfValorMax = perfil ? (perfil.mcmv.elegivel ? perfil.mcmv.valorMaxImovel : perfil.sbpe.valorMaxImovel) : 0;
    return (
      <Etapa>
        {voltar_link}
        <Barra etapa={5} total={6} />
        <Titulo>Qual é o valor do imóvel?</Titulo>
        <Subtitulo>Informe o valor do imóvel que você tem em mente para ver a simulação completa.</Subtitulo>

        <InputBRL label="Valor do imóvel" value={e.valorImovel} onChange={v => upd({ valorImovel: v })} />

        {perfValorMax > 0 && valorImovel > 0 && (
          <div style={{ marginBottom: 24 }}>
            {valorImovel > perfValorMax * 1.05 ? (
              <div style={{ padding: '12px 16px', background: '#FAECE7', borderRadius: 10, fontSize: 13, color: '#4A1B0C' }}>
                ⚠️ <strong>{formatBRL(valorImovel)}</strong> está acima do seu teto ({formatBRL(perfValorMax)}). A parcela pode ultrapassar 30% da renda.
              </div>
            ) : (
              <div style={{ padding: '12px 16px', background: '#E1F5EE', borderRadius: 10, fontSize: 13, color: '#085041' }}>
                ✅ Dentro da sua capacidade (teto: {formatBRL(perfValorMax)})
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: 28 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.8px' }}>Prazo de financiamento</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[10, 15, 20, 25, 30, 35].map(a => (
              <Chip key={a} label={`${a} anos`} ativo={e.prazoAnos === a} onClick={() => upd({ prazoAnos: a })} />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 10, border: `1px solid ${e.naPlanta ? 'var(--primary)' : 'var(--border)'}`, cursor: 'pointer', marginBottom: 28 }}
          onClick={() => upd({ naPlanta: !e.naPlanta })}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>Imóvel na planta (crédito associativo)</div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>Há fase de obra antes da entrega das chaves</div>
          </div>
          <div style={{ width: 42, height: 24, borderRadius: 99, background: e.naPlanta ? 'var(--primary)' : 'var(--border)', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
            <div style={{ width: 18, height: 18, borderRadius: 99, background: '#fff', position: 'absolute', top: 3, left: e.naPlanta ? 21 : 3, transition: 'left .2s' }} />
          </div>
        </div>

        <BtnPrimario label="Ver simulação completa →" onClick={avancar} disabled={valorImovel < 10000} />
      </Etapa>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ETAPA 7 — RESULTADO COMPLETO
  // ═══════════════════════════════════════════════════════════════════════════
  if (etapa === 7) {
    if (!sim) { calcularSimulacao(); return <Etapa><p>Calculando...</p></Etapa>; }

    const sc = SAUDE[sim.saudeLabel];
    const economiasSAC = sim.totalPagoPrice - sim.totalPagoSAC;

    return (
      <Etapa>
        {voltar_link}

        {/* Header do resultado */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: sc.cor, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>{sc.emoji} {sim.modalidade}</div>
          <div style={{ fontSize: 38, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{formatBRL(sim.parcelaPrimeiro)}</div>
          <div style={{ fontSize: 14, color: 'var(--text-faint)', marginTop: 4 }}>parcela inicial (Price) · {sim.comprometimento.toFixed(1)}% da renda</div>
        </div>

        {/* Price vs SAC */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: 14, border: '1.5px solid var(--primary)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Tabela Price</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{formatBRL(sim.parcelaPrimeiro)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>parcela fixa</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 8 }}>Total: {formatBRL(sim.totalPagoPrice)}</div>
          </div>
          <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>SAC</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{formatBRL(sim.parcelaSACPrimeiro)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>1ª parcela · decresce</div>
            <div style={{ fontSize: 11, color: '#0F6E56', marginTop: 8, fontWeight: 600 }}>Economiza {formatBRL(Math.max(0, economiasSAC))}</div>
          </div>
        </div>

        {/* Detalhamento */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
          {[
            { l: 'Valor do imóvel', v: formatBRL(sim.valorImovel) },
            { l: 'Entrada total (dinheiro + FGTS' + (sim.subsidioEstimado > 0 ? ' + subsídio)' : ')'), v: formatBRL(sim.entrada) },
            sim.subsidioEstimado > 0 ? { l: '  ↳ Subsídio estimado MCMV', v: formatBRL(sim.subsidioEstimado), destaque: true } : null,
            { l: 'Valor financiado', v: formatBRL(sim.valorFinanciado) },
            { l: 'Taxa de juros nominal', v: `${sim.taxaAnual}% a.a. + TR` },
            { l: 'Prazo', v: `${Math.round(sim.prazoMeses / 12)} anos (${sim.prazoMeses} meses)` },
            { l: 'Parcela (A+J)', v: formatBRL(sim.parcelaPrimeiro - sim.seguros.total) },
            { l: 'MIP (seguro vida, idade)', v: formatBRL(sim.seguros.mip) },
            { l: 'DFI (seguro imóvel)', v: formatBRL(sim.seguros.dfi) },
            { l: 'Tarifa de administração', v: formatBRL(sim.seguros.txAdm) },
          ].filter(Boolean).map((item, i) => {
            const { l, v, destaque } = item as { l: string; v: string; destaque?: boolean };
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid var(--border)', background: destaque ? '#E1F5EE' : 'transparent' }}>
                <span style={{ fontSize: 13, color: destaque ? '#085041' : 'var(--text-faint)' }}>{l}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: destaque ? '#0F6E56' : 'var(--text)' }}>{v}</span>
              </div>
            );
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: sc.bg }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: sc.txt }}>Parcela total (Price)</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: sc.cor }}>{formatBRL(sim.parcelaPrimeiro)}</span>
          </div>
        </div>

        {/* Alertas */}
        {sim.alertas.map((a, i) => (
          <div key={i} style={{ padding: '12px 14px', background: '#FAEEDA', borderLeft: '3px solid #EF9F27', borderRadius: '0 8px 8px 0', marginBottom: 10, fontSize: 13, color: '#633806' }}>
            {a}
          </div>
        ))}

        {sim.obraAlerta && (
          <div style={{ padding: '12px 14px', background: '#E6F1FB', borderLeft: '3px solid #378ADD', borderRadius: '0 8px 8px 0', marginBottom: 16, fontSize: 13, color: '#0C447C' }}>
            🏗️ {sim.obraAlerta}
          </div>
        )}

        {/* Aviso legal */}
        <p style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.5, marginBottom: 28 }}>
          Simulação educativa com base nas regras SFH/MCMV vigentes · maio/2026. MIP calculado pelo coeficiente etário real do contrato SIOPI/Caixa. Valores exatos devem ser confirmados na Caixa Econômica Federal. Não constitui proposta de crédito.
        </p>

        {/* CTAs finais */}
        <div style={{ display: 'grid', gap: 12 }}>
          <Link href={`/imoveis?max=${sim.valorImovel}&modalidade=${sim.isMCMV ? 'mcmv' : 'sbpe'}`}
            style={{ display: 'block', padding: '16px 0', borderRadius: 12, background: 'var(--primary)', color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
            🏠 Ver imóveis compatíveis
          </Link>
          <button onClick={() => { setEtapa(0); setE(ESTADO_INICIAL); setPerfil(null); setSim(null); }}
            style={{ padding: '14px 0', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
            Fazer nova simulação
          </button>
        </div>
      </Etapa>
    );
  }

  return null;
}
