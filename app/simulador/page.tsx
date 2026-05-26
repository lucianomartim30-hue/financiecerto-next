'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  descobrir, simular, formatBRL, motivoSBPE, parcelaPrice,
  detectarFaixaMCMV, TAXA_SBPE_ANUAL, TAXA_SFI_ANUAL, TR_MENSAL, TETO_SFH,
  BANCOS_SBPE,
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
          height: 7, flex: i === etapa ? 2 : 1, borderRadius: 99,
          background: i < etapa ? '#93C5FD' : i === etapa ? 'var(--primary)' : '#E2E8F0',
          opacity: 1, transition: 'all .35s ease',
        }} />
      ))}
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginLeft: 8 }}>
        {etapa + 1}/{total}
      </span>
    </div>
  );
}

function InputBRL({
  label, hint, value, onChange, prefix = 'R$', placeholder = '0',
}: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void; prefix?: string; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 28 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--primary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 10, borderBottom: `3px solid ${focused ? 'var(--primary)' : '#D1D5DB'}`, transition: 'border-color .2s' }}>
        <span className="fc-input-brl-prefix" style={{ fontSize: 26, fontWeight: 400, color: focused ? 'var(--primary)' : '#9CA3AF', transition: 'color .2s', flexShrink: 0 }}>{prefix}</span>
        <input
          type="text" inputMode="numeric" value={value} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          onChange={e => onChange(fmtInput(e.target.value))}
          className="fc-input-brl"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 36, fontWeight: 700, background: 'transparent', color: '#111827', fontFamily: 'inherit', width: '100%' }}
        />
      </div>
      {hint && <p style={{ fontSize: 13, color: '#6B7280', marginTop: 8 }}>{hint}</p>}
    </div>
  );
}

function Toggle({ label, sub, value, onChange, danger }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; danger?: boolean }) {
  const cor = danger ? '#E24B4A' : 'var(--primary)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 10, border: `1px solid ${value ? cor : 'var(--border)'}`, cursor: 'pointer', marginBottom: 10 }}
      onClick={() => onChange(!value)}>
      <div>
        <div style={{ fontSize: 14, color: 'var(--text)' }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ width: 42, height: 24, borderRadius: 99, background: value ? cor : 'var(--border)', position: 'relative', transition: 'background .2s', flexShrink: 0, marginLeft: 12 }}>
        <div style={{ width: 18, height: 18, borderRadius: 99, background: '#fff', position: 'absolute', top: 3, left: value ? 21 : 3, transition: 'left .2s' }} />
      </div>
    </div>
  );
}

function Chip({ label, ativo, onClick }: { label: string; ativo: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 20px', borderRadius: 99, border: `1.5px solid ${ativo ? 'var(--primary)' : 'var(--border)'}`,
      background: ativo ? 'linear-gradient(135deg, #2563eb, #1e40af)' : 'transparent',
      color: ativo ? '#fff' : '#374151', fontSize: 14, fontWeight: ativo ? 700 : 500,
      boxShadow: ativo ? '0 2px 8px rgba(37,99,235,0.3)' : 'none',
      cursor: 'pointer', transition: 'all .2s', fontFamily: 'inherit',
    }}>{label}</button>
  );
}

function BtnPrimario({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '18px 0', borderRadius: 12, border: 'none',
      background: disabled ? '#E2E8F0' : 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
      color: disabled ? '#94A3B8' : '#fff',
      fontSize: 17, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all .2s', fontFamily: 'inherit',
      boxShadow: disabled ? 'none' : '0 4px 18px rgba(37,99,235,0.38)',
      letterSpacing: '0.2px',
    }}>{label}</button>
  );
}

// Hero escuro — mesmo estilo da na-planta
function Hero({ etapa }: { etapa: number }) {
  const heroCopy: Record<number, { tag: string; titulo: string; sub: string }> = {
    0: { tag: 'Simulador FinancieCerto 2026', titulo: 'Primeiro entenda\nseu perfil.', sub: 'Qualquer renda, qualquer imóvel — identificamos MCMV, SBPE ou SFI e mostramos taxas e teto reais.' },
    1: { tag: 'Passo 1 de 6', titulo: 'Qual é a sua\nrenda familiar?', sub: 'Usamos a renda bruta para calcular faixa, taxa e comprometimento.' },
    2: { tag: 'Passo 2 de 6', titulo: 'Você tem FGTS\ndisponível?', sub: 'O FGTS amplia seu poder de compra e reduz o valor financiado.' },
    3: { tag: 'Passo 3 de 6', titulo: 'Tem entrada\noutra reserva?', sub: 'Entrada própria reduz o financiamento e pode melhorar a aprovação.' },
    4: { tag: 'Passo 4 de 6', titulo: 'Prazo e\nperfil pessoal', sub: 'O prazo e a idade definem a parcela e o seguro MIP.' },
    5: { tag: 'Descobrindo seu perfil...', titulo: 'Calculando seu\nteto de compra.', sub: 'Aguarde um instante.' },
    6: { tag: 'Imóvel específico', titulo: 'Simule um\nimóvel concreto.', sub: 'Informe o valor e o estágio — calcularemos parcela, FGTS e modalidade.' },
    7: { tag: 'Resultado', titulo: 'Simulação\ncompleta.', sub: '' },
  };
  const { tag, titulo, sub } = heroCopy[etapa] ?? heroCopy[0];
  return (
    <section style={{
      background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 100%)',
      padding: 'clamp(48px, 7vw, 80px) 20px clamp(52px, 7vw, 72px)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 16 }}>{tag}</div>
      <h1 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: sub ? 12 : 0, marginTop: 0, whiteSpace: 'pre-line' }}>{titulo}</h1>
      {sub && <p style={{ fontSize: 15, color: 'rgba(255,255,255,.55)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto', marginTop: 0 }}>{sub}</p>}
    </section>
  );
}

function Etapa({ children, etapa }: { children: React.ReactNode; etapa?: number }) {
  return (
    <div style={{ background: '#F1F5F9', minHeight: 'calc(100vh - var(--header-h))', overflowX: 'hidden' }}>
      {etapa !== undefined && <Hero etapa={etapa} />}
      <div style={{ maxWidth: 520, margin: etapa !== undefined ? '-40px auto 0' : '0 auto', padding: '0 16px 80px', position: 'relative', zIndex: 1 }}>
        <div className="fc-card-inner" style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', boxShadow: '0 4px 40px rgba(0,0,0,.10)', padding: '32px 28px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <h1 className="fc-titulo" style={{ fontSize: 34, fontWeight: 800, color: '#111827', lineHeight: 1.2, marginBottom: 14, marginTop: 0 }}>{children}</h1>;
}
function Sub({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 16, color: '#4B5563', lineHeight: 1.65, marginBottom: 32, marginTop: 0 }}>{children}</p>;
}
function BtnVoltar({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 4 }}>← Voltar</button>;
}

// ─── Badge de faixa em tempo real ────────────────────────────────────────────
function BadgeModalidade({ renda }: { renda: number }) {
  if (!renda) return null;
  const faixa = detectarFaixaMCMV(renda);
  if (faixa) {
    const cores: Record<number, { bg: string; txt: string; cor: string }> = {
      1: { bg: '#E1F5EE', txt: '#0F6E56', cor: '#0F6E56' },
      2: { bg: '#E6F1FB', txt: '#185FA5', cor: '#185FA5' },
      3: { bg: '#FAEEDA', txt: '#854F0B', cor: '#854F0B' },
      4: { bg: '#FAECE7', txt: '#993C1D', cor: '#993C1D' },
    };
    const c = cores[faixa.numero];
    return (
      <div style={{ marginBottom: 20 }}>
        <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 99, background: c.bg, color: c.txt, fontSize: 14, fontWeight: 800, marginBottom: 8, border: `1.5px solid ${c.cor}44` }}>
          {faixa.label} MCMV · {faixa.taxaRef}% a.a. + TR
        </span>
        <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: 0 }}>
          Teto: {formatBRL(faixa.teto)} · Subsídio máx: {formatBRL(faixa.subsidioMax)}
        </p>
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 20 }}>
      <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 99, background: '#E6F1FB', color: '#185FA5', fontSize: 14, fontWeight: 800, marginBottom: 8, border: '1.5px solid #185FA544' }}>
        💼 Perfil SBPE · {TAXA_SBPE_ANUAL}% a.a. + TR
      </span>
      <p style={{ fontSize: 12, color: 'var(--text-faint)', margin: 0 }}>
        Financiamento bancário convencional · imóveis SFH até {formatBRL(TETO_SFH)} · FGTS permitido · também opera no SFI acima desse valor
      </p>
    </div>
  );
}

// ─── Comparativo de bancos SBPE ───────────────────────────────────────────────
function ComparativoBancosSBPE({ financiado, prazoMeses }: { financiado: number; prazoMeses: number }) {
  if (financiado <= 0) return null;
  return (
    <div style={{ marginTop: 20, padding: '16px', background: '#F8FAFF', border: '1.5px solid #BFDBFE', borderRadius: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12 }}>
        🏦 Comparativo SBPE — Principais bancos (referência mai/2026 · + TR)
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {BANCOS_SBPE.map((b, i) => {
          const parcela = parcelaPrice(financiado, b.taxa, prazoMeses > 0 ? prazoMeses : 420);
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', borderRadius: 10,
              background: b.destaque ? '#EFF6FF' : 'white',
              border: `1px solid ${b.destaque ? '#BFDBFE' : '#E5E7EB'}`,
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: b.destaque ? 800 : 600, color: b.destaque ? 'var(--primary)' : '#374151' }}>
                  {b.banco}{b.destaque && <span style={{ marginLeft: 6, fontSize: 10, background: '#2563eb', color: '#fff', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>menor taxa</span>}
                </div>
                {b.obs && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{b.obs}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: b.destaque ? 'var(--primary)' : '#111827' }}>{b.taxa.toFixed(2).replace('.', ',')}% a.a.</div>
                {financiado > 0 && <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>~{formatBRL(Math.round(parcela))}/mês</div>}
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: '#6B7280', marginTop: 10, lineHeight: 1.5 }}>
        ℹ️ Taxas nominais + TR. Parcela estimada (Price · sem seguros). Taxas variam por perfil, LTV e relacionamento com o banco. Consulte cada instituição para proposta personalizada.
      </p>
    </div>
  );
}

// ─── Painel explicativo SFH / SFI ────────────────────────────────────────────
function ExplicacaoSFI() {
  return (
    <div style={{ padding: '14px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, marginTop: 20, marginBottom: 4 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10 }}>
        Entenda as modalidades
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {[
          {
            tag: 'MCMV', tagBg: '#E1F5EE', tagTxt: '#0F6E56', cor: '#0F6E56',
            desc: 'Minha Casa Minha Vida — renda até R$ 13.000/mês. Taxas subsidiadas pela CEF. Subsídio direto para Faixas 1 e 2.',
          },
          {
            tag: 'SBPE / SFH', tagBg: '#E6F1FB', tagTxt: '#185FA5', cor: '#185FA5',
            desc: 'SBPE é a fonte de captação (poupança). Opera dentro do SFH — regras para imóveis até R$ 2,25M. Taxa CEF: ' + TAXA_SBPE_ANUAL + '% a.a. + TR. Permite FGTS.',
          },
          {
            tag: 'SFI', tagBg: '#FAEEDA', tagTxt: '#854F0B', cor: '#D97706',
            desc: 'Sistema paralelo ao SFH para imóveis acima de R$ 2,25M. Sem limite de valor, sem teto de taxa, sem FGTS. Taxa estimada: ' + TAXA_SFI_ANUAL + '% a.a.',
          },
        ].map(({ tag, tagBg, tagTxt, cor, desc }) => (
          <div key={tag} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: tagBg + '55', borderRadius: 10, borderLeft: `3.5px solid ${cor}` }}>
            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 99, background: tagBg, color: tagTxt, fontSize: 11, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>{tag}</span>
            <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.55, fontWeight: 500 }}>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Estado ───────────────────────────────────────────────────────────────────
type Estado = {
  renda: string; idade: string; dependentes: number;
  fgts: string; cotista: boolean; primeiroImovel: boolean;
  jaRecebeuBeneficio: boolean; temImovelMunicipio: boolean;
  entrada: string; valorImovel: string; prazoAnos: number; naPlanta: boolean;
};
const E0: Estado = {
  renda: '', idade: '', dependentes: 0,
  fgts: '', cotista: true, primeiroImovel: true,
  jaRecebeuBeneficio: false, temImovelMunicipio: false,
  entrada: '', valorImovel: '', prazoAnos: 35, naPlanta: false,
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
// ─── Wrapper para useSearchParams (requer Suspense no App Router) ─────────────
function SimuladorInner() {
  const searchParams = useSearchParams();
  const [etapa, setEtapa] = useState(0);
  const [e, setE] = useState<Estado>(E0);
  const [perfil, setPerfil] = useState<ResultadoDescobrir | null>(null);
  const [sim, setSim] = useState<ResultadoSimulacao | null>(null);
  // Qual painel o usuário quer ver na revelação: mcmv | sbpe | sfi
  const [painelAtivo, setPainelAtivo] = useState<'mcmv' | 'sbpe' | 'sfi'>('mcmv');
  const [tipoImovel,  setTipoImovel]  = useState<'residencial' | 'comercial'>('residencial');

  // Lê URL params vindos da página do imóvel e vai direto ao resultado
  useEffect(() => {
    const valorImovelStr = searchParams.get('valorImovel');
    const rendaStr       = searchParams.get('renda');
    const entradaStr     = searchParams.get('entrada');
    const prazoStr       = searchParams.get('prazo');
    const naPlantaStr    = searchParams.get('naPlanta');
    const idadeStr       = searchParams.get('idade');

    if (!valorImovelStr || !rendaStr) return; // sem dados suficientes

    const valorImovel = Number(valorImovelStr);
    const rendaNum    = Number(rendaStr);
    const entradaNum  = Number(entradaStr) || 0;
    const prazoNum    = Number(prazoStr) || 35;
    const naPlanta    = naPlantaStr === 'true';
    const idadeNum    = Number(idadeStr) || 35;

    if (valorImovel < 1000 || rendaNum < 500) return;

    const novoEstado: Estado = {
      ...E0,
      renda:       fmtInput(String(rendaNum)),
      entrada:     fmtInput(String(entradaNum)),
      valorImovel: fmtInput(String(valorImovel)),
      prazoAnos:   prazoNum,
      naPlanta,
      idade:       String(idadeNum),
    };
    setE(novoEstado);

    // Calcula perfil mínimo para mostrar painel
    const p = descobrir(rendaNum, 0, entradaNum, prazoNum, idadeNum);
    setPerfil(p);
    if (p.mcmv.elegivel) setPainelAtivo('mcmv');
    else setPainelAtivo('sbpe');

    // Calcula simulação e pula direto para o resultado
    const resultado = simular({
      rendaBruta:        rendaNum,
      fgts:              0,
      entrada:           entradaNum,
      valorImovel,
      prazoAnos:         prazoNum,
      naPlanta,
      prazoObraAnos:     naPlanta ? 3 : 0,
      idadeProponente:   idadeNum,
    });
    setSim(resultado);
    setEtapa(7); // pula direto para o resultado completo
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function upd(p: Partial<Estado>) { setE(prev => ({ ...prev, ...p })); }

  function calcularPerfil() {
    const r = descobrir(
      parseMoeda(e.renda), parseMoeda(e.fgts), parseMoeda(e.entrada),
      e.prazoAnos, Number(e.idade) || 35,
      e.cotista, e.primeiroImovel, e.jaRecebeuBeneficio, e.dependentes,
    );
    setPerfil(r);
    // Define painel padrão: MCMV se elegível, SBPE caso contrário
    if (r.mcmv.elegivel) setPainelAtivo('mcmv');
    else setPainelAtivo('sbpe');
    const faixa = r.faixa?.label ?? 'SBPE';
    const valorMaxImovel = r.mcmv.elegivel ? r.mcmv.valorMaxImovel : r.sbpe.valorMaxImovel;
    const modalidade = r.mcmv.elegivel ? `MCMV ${faixa}` : 'SBPE';
    const parcela = r.mcmv.elegivel ? r.mcmv.parcela : r.sbpe.parcela;
    const subsidio = r.mcmv.elegivel ? (r.subsidioEstimado ?? 0) : 0;
    const taxaAnual = r.mcmv.elegivel ? r.mcmv.taxa : TAXA_SBPE_ANUAL;
    const comprometimento = r.mcmv.elegivel ? r.mcmv.comprometimento : r.sbpe.comprometimento;

    // Legacy key (mantido para compatibilidade)
    salvarCtx({
      renda: parseMoeda(e.renda), fgts: parseMoeda(e.fgts),
      entrada: parseMoeda(e.entrada), faixa, valorMaxImovel,
    });

    // Chave rica — lida pelo ChatFab e pela API do João
    const richCtx = {
      renda: parseMoeda(e.renda),
      fgts: parseMoeda(e.fgts),
      entrada: parseMoeda(e.entrada),
      prazo: e.prazoAnos,
      idade: Number(e.idade) || 35,
      dependentes: e.dependentes,
      resultado: { faixa, modalidade, valorMaxImovel, parcela, comprometimento, subsidio, taxaAnual },
    };
    try {
      sessionStorage.setItem('fc_sim_context', JSON.stringify(richCtx));
      window.dispatchEvent(new StorageEvent('storage', { key: 'fc_sim_context', newValue: JSON.stringify(richCtx) }));
    } catch { /* SSR */ }
  }

  function calcularSim() {
    if (!e.valorImovel) return;
    const r = simular({
      rendaBruta: parseMoeda(e.renda), fgts: parseMoeda(e.fgts),
      entrada: parseMoeda(e.entrada), valorImovel: parseMoeda(e.valorImovel),
      prazoAnos: e.prazoAnos, naPlanta: e.naPlanta, prazoObraAnos: 3,
      idadeProponente: Number(e.idade) || 35,
      cotista: e.cotista, primeiroImovel: e.primeiroImovel,
      jaRecebeuBeneficio: e.jaRecebeuBeneficio,
      temImovelMunicipio: e.temImovelMunicipio,
      dependentes: e.dependentes,
    });
    setSim(r);
  }

  function avancar() {
    if (etapa === 4) calcularPerfil();
    if (etapa === 6 && e.valorImovel) calcularSim(); // calcula ao sair do etapa de escolha do imóvel
    setEtapa(n => Math.min(n + 1, 7));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function voltar() { setEtapa(n => Math.max(n - 1, 0)); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  // ═══════════════ ETAPA 0 — LANDING ════════════════════════════════════════
  if (etapa === 0) return (
    <Etapa etapa={0}>
      <div style={{ display: 'grid', gap: 10, marginBottom: 32 }}>
        {[
          { ico: '📊', txt: 'Renda define seu perfil: MCMV (F1–F4), SBPE ou SFI — detectados automaticamente', cor: '#2563eb', bg: '#EFF6FF' },
          { ico: '🏦', txt: 'Taxa real: SBPE 11,19% + TR (Caixa), MCMV subsidiado ou SFI — nunca estimativa genérica', cor: '#0F6E56', bg: '#F0FDF9' },
          { ico: '🏗️', txt: 'Simule imóvel pronto, em obras ou na planta — para qualquer faixa de renda', cor: '#7C3AED', bg: '#F5F3FF' },
          { ico: '🏠', txt: 'Imóveis compatíveis com seu poder de compra real ao final da simulação', cor: '#B45309', bg: '#FFFBEB' },
        ].map(({ ico, txt, cor, bg }) => (
          <div key={txt} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', background: bg, borderRadius: 12, borderLeft: `4px solid ${cor}` }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{ico}</span>
            <span style={{ fontSize: 14, color: '#1F2937', lineHeight: 1.55, fontWeight: 500 }}>{txt}</span>
          </div>
        ))}
      </div>
      <BtnPrimario label="Começar — leva 2 minutos" onClick={avancar} />
      <p style={{ fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', marginTop: 14 }}>
        Regras SFH/MCMV vigentes · maio/2026 · TR {TR_MENSAL}%/mês
      </p>
    </Etapa>
  );

  // ═══════════════ ETAPA 1 — RENDA ══════════════════════════════════════════
  if (etapa === 1) {
    const renda = parseMoeda(e.renda);
    return (
      <Etapa etapa={etapa}>
        <BtnVoltar onClick={voltar} />
        <Barra etapa={0} total={6} />
        <Titulo>Qual é a renda familiar mensal?</Titulo>
        <Sub>Some a renda bruta de todos que vão participar do financiamento — casal, pais, filhos.</Sub>

        <InputBRL label="Renda total bruta" value={e.renda} onChange={v => upd({ renda: v })}
          hint="Renda antes de descontos. Inclua todos os participantes." />

        {renda > 0 && <BadgeModalidade renda={renda} />}

        <ExplicacaoSFI />

        <div style={{ marginTop: 24 }}>
          <BtnPrimario label="Próximo →" onClick={avancar} disabled={renda < 500} />
        </div>
      </Etapa>
    );
  }

  // ═══════════════ ETAPA 2 — COMPOSIÇÃO FAMILIAR ════════════════════════════
  if (etapa === 2) {
    const idade = Number(e.idade) || 0;
    const prazoMax = idade > 0 ? Math.min(35, Math.floor(80.5 - idade)) : 35;
    return (
      <Etapa etapa={etapa}>
        <BtnVoltar onClick={voltar} />
        <Barra etapa={1} total={6} />
        <Titulo>Composição familiar</Titulo>
        <Sub>O prazo máximo é definido pela idade do proponente mais velho. Limite: 80 anos e 6 meses — regra da Caixa Econômica Federal.</Sub>

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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[0, 1, 2, 3, 4].map(n => (
              <Chip key={n} label={n === 4 ? '4+' : String(n)} ativo={e.dependentes === n} onClick={() => upd({ dependentes: n })} />
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 8 }}>Dependentes aumentam o subsídio estimado no MCMV</p>
        </div>

        <BtnPrimario label="Próximo →" onClick={avancar} disabled={!e.idade} />
      </Etapa>
    );
  }

  // ═══════════════ ETAPA 3 — FGTS E ELEGIBILIDADE ═══════════════════════════
  if (etapa === 3) {
    const faixa = detectarFaixaMCMV(parseMoeda(e.renda));
    return (
      <Etapa etapa={etapa}>
        <BtnVoltar onClick={voltar} />
        <Barra etapa={2} total={6} />
        <Titulo>FGTS e elegibilidade</Titulo>
        <Sub>O FGTS pode ser usado como entrada, reduzindo o valor financiado. É liberado pela Caixa Econômica Federal para cotistas.</Sub>

        <InputBRL label="Saldo do FGTS disponível" value={e.fgts} onChange={v => upd({ fgts: v })}
          hint="Saldo atual da sua conta FGTS. Deixe em branco se não tiver ou não quiser usar." />

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.8px' }}>Condições de uso do FGTS</label>
          <Toggle label="Cotista FGTS há pelo menos 3 anos" value={e.cotista} onChange={v => upd({ cotista: v })} />
          <Toggle label="Será o meu primeiro imóvel financiado" value={e.primeiroImovel} onChange={v => upd({ primeiroImovel: v })} />
        </div>

        {faixa && (
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.8px' }}>Elegibilidade MCMV</label>
            <Toggle label="Já recebi benefício habitacional" sub="MCMV, subsídio, BNH — barra novo benefício" value={e.jaRecebeuBeneficio} onChange={v => upd({ jaRecebeuBeneficio: v })} danger />
            <Toggle label="Tenho imóvel no mesmo município" sub="Barra uso do FGTS e elegibilidade MCMV" value={e.temImovelMunicipio} onChange={v => upd({ temImovelMunicipio: v })} danger />
          </div>
        )}

        <BtnPrimario label="Próximo →" onClick={avancar} />
      </Etapa>
    );
  }

  // ═══════════════ ETAPA 4 — ENTRADA ════════════════════════════════════════
  if (etapa === 4) {
    const fgts  = parseMoeda(e.fgts);
    const entrada = parseMoeda(e.entrada);
    const fgtsOk = e.cotista && e.primeiroImovel;
    const total   = entrada + (fgtsOk ? fgts : 0);
    const faixa   = detectarFaixaMCMV(parseMoeda(e.renda));
    return (
      <Etapa etapa={etapa}>
        <BtnVoltar onClick={voltar} />
        <Barra etapa={3} total={6} />
        <Titulo>Quanto você tem de entrada?</Titulo>
        <Sub>Soma o dinheiro guardado mais o FGTS disponível. Quanto mais entrada, menor a parcela e menor o risco de reprovação.</Sub>

        <InputBRL label="Entrada em dinheiro (poupança, reserva)" value={e.entrada} onChange={v => upd({ entrada: v })}
          hint="Não inclua o FGTS aqui — já calculamos acima." />

        {total > 0 && (
          <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Poupança</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{formatBRL(entrada)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>FGTS</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: fgtsOk ? 'var(--text)' : 'var(--text-faint)' }}>
                  {fgtsOk ? formatBRL(fgts) : '—'}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Total</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{formatBRL(total)}</div>
              </div>
            </div>
          </div>
        )}

        {faixa ? (
          <p style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 28 }}>
            Entrada mínima {faixa.label}: {faixa.numero <= 2 ? '5%' : '20%'} do imóvel. O FGTS pode complementar a entrada no MCMV e no SBPE (SFH). No SFI, FGTS não é permitido.
          </p>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 28 }}>
            SBPE (SFH): entrada mínima 30% (Tabela Price) ou 20% (SAC) do imóvel. No SFI (acima de R$ {(TETO_SFH / 1e6).toFixed(2).replace('.', ',')}M), FGTS não é permitido.
          </p>
        )}

        <BtnPrimario label="Descobrir meu perfil →" onClick={avancar} />
      </Etapa>
    );
  }

  // ═══════════════ ETAPA 5 — REVELAÇÃO DO PERFIL ════════════════════════════
  if (etapa === 5) {
    if (!perfil) { calcularPerfil(); return <Etapa etapa={etapa}><p>Calculando...</p></Etapa>; }

    const { faixa, mcmv, sbpe, sfi, subsidioEstimado, prazoMaxMeses } = perfil;
    const prazoAnos = Math.round(prazoMaxMeses / 12);

    // Dados do painel ativo
    const dados = {
      mcmv: { ...mcmv, label: faixa ? `${faixa.label} MCMV` : 'MCMV', taxa: mcmv.taxa, cor: '#0F6E56', bg: '#E1F5EE', txt: '#085041', teto: faixa?.teto ?? 0, habilitado: mcmv.elegivel },
      sbpe: { valorMaxImovel: sbpe.valorMaxImovel, parcela: sbpe.parcela, comprometimento: sbpe.comprometimento, label: 'SBPE (SFH)', taxa: TAXA_SBPE_ANUAL, cor: '#185FA5', bg: '#E6F1FB', txt: '#0C447C', teto: TETO_SFH, habilitado: true },
      sfi:  { valorMaxImovel: sfi.valorMaxImovel,  parcela: sfi.parcela,  comprometimento: sfi.comprometimento,  label: 'SFI', taxa: TAXA_SFI_ANUAL, cor: '#854F0B', bg: '#FAEEDA', txt: '#633806', teto: 0, habilitado: true },
    }[painelAtivo];

    const compr = dados.comprometimento;
    const saude = compr <= 20 ? 'ótimo' : compr <= 25 ? 'bom' : compr <= 30 ? 'atenção' : 'risco';
    const sc = SAUDE[saude];

    const paneis: { key: 'mcmv' | 'sbpe' | 'sfi'; label: string; tagBg: string; tagTxt: string; disabled?: boolean }[] = [
      { key: 'mcmv', label: faixa ? `${faixa.label} MCMV` : 'MCMV', tagBg: '#E1F5EE', tagTxt: '#0F6E56', disabled: !mcmv.elegivel },
      { key: 'sbpe', label: 'SBPE / SFH', tagBg: '#E6F1FB', tagTxt: '#185FA5' },
      { key: 'sfi',  label: 'SFI',        tagBg: '#FAEEDA', tagTxt: '#854F0B' },
    ];

    // Variáveis para o card "Composição do poder de compra" (etapa 5)
    const entradaEmDinheiro5 = Math.max(0, perfil.entrada - perfil.fgts);
    const fgtsAtivo5         = painelAtivo === 'sfi' ? 0 : perfil.fgts;
    const valorFinanciadoAtivo5 = perfil[painelAtivo].valorFinanciado;
    const subsidioAtivo5     = painelAtivo === 'mcmv' ? subsidioEstimado : 0;
    const totalPoderCompra5  = valorFinanciadoAtivo5 + entradaEmDinheiro5 + fgtsAtivo5 + subsidioAtivo5;

    return (
      <Etapa etapa={etapa}>
        {/* Seletor de modalidade */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {paneis.map(({ key, label, tagBg, tagTxt, disabled }) => (
            <button key={key} onClick={() => !disabled && setPainelAtivo(key)}
              style={{
                padding: '8px 18px', borderRadius: 99,
                border: `${painelAtivo === key ? '2.5px' : '1.5px'} solid ${painelAtivo === key ? (disabled ? '#ccc' : dados.cor) : '#D1D5DB'}`,
                background: painelAtivo === key ? (disabled ? '#f5f5f5' : tagBg) : 'transparent',
                color: disabled ? '#aaa' : (painelAtivo === key ? tagTxt : '#6B7280'),
                fontSize: 13, fontWeight: painelAtivo === key ? 800 : 500,
                boxShadow: painelAtivo === key && !disabled ? `0 2px 10px ${dados.cor}44` : 'none',
                cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all .2s',
              }}>
              {label}{disabled ? ' (inelegível)' : ''}
            </button>
          ))}
        </div>

        {/* Card principal */}
        <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ background: dados.cor, padding: '24px 24px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.65)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 10 }}>Seu perfil — {dados.label}</div>
            <div style={{ fontSize: 38, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{formatBRL(dados.valorMaxImovel)}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.8)', marginTop: 6 }}>
              {painelAtivo === 'sfi' ? 'capacidade de compra (sem limite de teto)' : `valor máximo do imóvel${dados.teto ? ` · teto ${formatBRL(dados.teto)}` : ''}`}
            </div>
            <div style={{ display: 'inline-block', marginTop: 14, padding: '5px 16px', background: 'rgba(255,255,255,.2)', borderRadius: 99, fontSize: 13, color: '#fff', fontWeight: 700 }}>
              {dados.taxa}% a.a. + {painelAtivo === 'sfi' ? 'taxa livre' : 'TR'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--border)' }}>
            {[
              { l: 'Parcela estimada', v: formatBRL(dados.parcela) + '/mês', d: `${compr.toFixed(1)}% da renda` },
              { l: 'Prazo máximo', v: `${prazoAnos} anos`, d: `${prazoMaxMeses} meses` },
              {
                l: painelAtivo === 'mcmv' && subsidioEstimado > 0 ? 'Subsídio estimado' : 'FGTS disponível',
                v: painelAtivo === 'mcmv' && subsidioEstimado > 0 ? formatBRL(subsidioEstimado) : (painelAtivo === 'sfi' ? 'Não permitido' : formatBRL(perfil.fgts)),
                d: painelAtivo === 'mcmv' && subsidioEstimado > 0 ? 'Confirme na Caixa Econômica Federal' : painelAtivo === 'sfi' ? 'SFI não usa FGTS' : 'Usado como entrada',
              },
              { l: 'Modalidade', v: painelAtivo === 'sbpe' ? 'SFH / SBPE' : dados.label, d: painelAtivo === 'sbpe' ? 'SBPE opera dentro do SFH' : painelAtivo === 'sfi' ? 'Paralelo ao SFH, sem teto' : 'Subsídio CEF' },
            ].map(({ l, v, d }) => (
              <div key={l} style={{ padding: '16px', background: 'var(--bg-card)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.4px' }}>{l}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{v}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{d}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '14px 20px', background: sc.bg, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{sc.emoji}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: sc.txt }}>Saúde financeira: {saude.toUpperCase()}</div>
              <div style={{ fontSize: 12, color: sc.cor }}>
                {saude === 'ótimo' && 'Comprometimento abaixo de 20% — excelente margem de segurança.'}
                {saude === 'bom' && 'Entre 20% e 25% — dentro do ideal, com boa folga.'}
                {saude === 'atenção' && 'Entre 25% e 30% — aprovável, mas próximo do limite da Caixa Econômica Federal.'}
                {saude === 'risco' && 'Acima de 30% — banco provavelmente reprovará. Aumente a entrada ou o prazo.'}
              </div>
            </div>
          </div>
        </div>

        {/* Nota explicativa por modalidade */}
        {painelAtivo === 'sbpe' && (
          <>
            <div style={{ padding: '12px 14px', background: '#E6F1FB', borderRadius: 10, marginBottom: 14, fontSize: 13, color: '#0C447C' }}>
              <strong>SBPE</strong> (Sistema Brasileiro de Poupança e Empréstimo) é a <em>fonte de captação</em> — recursos da poupança. Opera dentro do <strong>SFH</strong> (Sistema Financeiro da Habitação) para imóveis até {formatBRL(TETO_SFH)}. Permite uso do FGTS. <strong>Qualquer banco pode oferecer SBPE</strong> — compare as taxas abaixo.
            </div>
            <ComparativoBancosSBPE financiado={perfil?.sbpe.valorFinanciado ?? 0} prazoMeses={perfil?.prazoMaxMeses ?? 420} />
          </>
        )}
        {painelAtivo === 'sfi' && (
          <div style={{ padding: '12px 14px', background: '#FAEEDA', borderRadius: 10, marginBottom: 14, fontSize: 13, color: '#633806' }}>
            <strong>SFI</strong> (Sistema de Financiamento Imobiliário) é <em>paralelo ao SFH</em> — atende imóveis acima de {formatBRL(TETO_SFH)}. Sem teto de valor, sem limite de taxa, <strong>sem uso de FGTS</strong>. Taxa referência de mercado: ~{TAXA_SFI_ANUAL}% a.a. Não é financiado pela Caixa Econômica Federal exclusivamente — outros bancos também operam.
          </div>
        )}
        {painelAtivo === 'mcmv' && subsidioEstimado > 0 && (
          <div style={{ padding: '12px 14px', background: '#E1F5EE', borderRadius: 10, marginBottom: 14, fontSize: 13, color: '#085041' }}>
            ✅ Subsídio estimado de <strong>{formatBRL(subsidioEstimado)}</strong> incluído. O valor exato é definido pela Caixa Econômica Federal conforme perfil, município e verba disponível.
          </div>
        )}

        {/* Nota: renda F1/F2 mas imóvel em F3/F4 — explica por que não há subsídio */}
        {sim && sim.isMCMV && sim.faixa && sim.faixa.numero >= 3 && sim.faixaRenda && sim.faixaRenda.numero <= 2 && (
          <div style={{ padding: '12px 14px', background: '#FAEEDA', borderLeft: '3px solid #EF9F27', borderRadius: '0 8px 8px 0', marginBottom: 14, fontSize: 13, color: '#633806' }}>
            💡 Sua renda se enquadra na <strong>{sim.faixaRenda.label}</strong> (subsídio até {formatBRL(sim.faixaRenda.subsidioMax)}), mas o imóvel de {formatBRL(sim.valorImovel)} supera o teto {sim.faixaRenda.label} ({formatBRL(sim.faixaRenda.teto)}) — mesmo descontando o subsídio estimado. Por isso aplica-se a <strong>{sim.faixa.label} MCMV</strong> (sem subsídio, taxa {sim.faixa.taxaRef}% a.a.). Para ter acesso ao subsídio, busque imóveis até {formatBRL(sim.faixaRenda.teto)}.
          </div>
        )}

        {/* ── Composição do poder de compra ───────────────────────────── */}
        <div style={{ marginBottom: 20, background: dados.bg, border: `1.5px solid ${dados.cor}44`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${dados.cor}22` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: dados.cor, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              📊 Composição do poder de compra — {dados.label}
            </div>
          </div>
          <div style={{ padding: '4px 16px 12px', background: 'var(--bg-card)' }}>
            {([
              { emoji: '🏛️', label: 'Financiamento bancário',    valor: valorFinanciadoAtivo5 },
              { emoji: '💰', label: 'Entrada (ato / dinheiro)',    valor: entradaEmDinheiro5 },
              ...(fgtsAtivo5 > 0
                ? [{ emoji: '🏦', label: 'FGTS', valor: fgtsAtivo5 }]
                : (painelAtivo === 'sfi' && perfil.fgts > 0
                  ? [{ emoji: '🏦', label: 'FGTS (não permitido no SFI)', valor: 0 }]
                  : [])),
              ...(subsidioAtivo5 > 0 ? [{ emoji: '🎁', label: 'Subsídio MCMV (estimado)', valor: subsidioAtivo5 }] : []),
            ] as { emoji: string; label: string; valor: number }[]).map(({ emoji, label, valor: v }, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px dashed #E2E8F0' }}>
                <span style={{ fontSize: 13, color: '#374151' }}>
                  {i > 0 && <span style={{ color: '#9CA3AF', marginRight: 5, fontSize: 11 }}>+</span>}
                  {emoji} {label}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: v === 0 ? '#9CA3AF' : '#111827' }}>
                  {v === 0 ? '—' : formatBRL(v)}
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 0', borderTop: `2px solid ${dados.cor}33`, marginTop: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: dados.cor }}>= 🏠 Poder de compra total</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: dados.cor }}>{formatBRL(totalPoderCompra5)}</span>
            </div>
            {/* Explicação: como o banco calcula (CET / encargo mensal completo) */}
            <div style={{ marginTop: 12, padding: '12px 14px', background: '#F1F5F9', borderRadius: 10, fontSize: 12, color: '#4B5563', lineHeight: 1.8 }}>
              <strong style={{ color: dados.cor, fontSize: 12 }}>
                💡 Como o banco calcula o financiamento
              </strong>
              <br />
              O banco avalia o <strong>encargo mensal completo</strong> — não o valor bruto liberado. O encargo inclui <strong>amortização + juros (A+J) + seguro de vida (MIP) + seguro do imóvel (DFI) + tarifa de administração</strong>. Esse total não pode ultrapassar <strong>30% da renda bruta</strong> (Res. CMN 4.676/2018 — regra aplicada à CEF e todos os bancos no SFH/MCMV).
              <br /><br />
              Renda de <strong>{formatBRL(perfil.rendaBruta)}/mês</strong> × 30% = <strong>{formatBRL(Math.round(perfil.rendaBruta * 0.30))}/mês</strong> de encargo máximo.
              {' '}Parcela estimada neste perfil: <strong>{formatBRL(dados.parcela)}/mês</strong> ({dados.comprometimento.toFixed(1)}% da renda) — inclui todos os custos.
              {' '}Portanto o banco aprova <strong>{formatBRL(valorFinanciadoAtivo5)}</strong> de financiamento.
              {(entradaEmDinheiro5 > 0 || fgtsAtivo5 > 0 || subsidioAtivo5 > 0) && (
                <span>
                  {' '}Somando{' '}
                  {[
                    entradaEmDinheiro5 > 0 ? `entrada de ${formatBRL(entradaEmDinheiro5)}` : null,
                    fgtsAtivo5 > 0        ? `FGTS de ${formatBRL(fgtsAtivo5)}` : null,
                    subsidioAtivo5 > 0    ? `subsídio de ${formatBRL(subsidioAtivo5)}` : null,
                  ].filter(Boolean).join(' + ')}
                  , o poder de compra total chega a <strong>{formatBRL(totalPoderCompra5)}</strong>.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Plano de Compra Personalizado ───────────────────────────── */}
        <div style={{ marginBottom: 20, padding: '18px 18px 14px', background: '#F8FAFF', border: '1.5px solid #BFDBFE', borderRadius: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 14 }}>
            📋 Plano de Compra Personalizado
          </div>
          {[
            {
              num: '✓', done: true,
              titulo: 'Perfil calculado',
              desc: `${dados.label} · teto ${formatBRL(dados.valorMaxImovel)} · parcela ~${formatBRL(dados.parcela ?? 0)}/mês`,
            },
            {
              num: '2', done: false,
              titulo: 'Reunir documentação',
              desc: 'RG, CPF, holerites (ou IR + extratos), extrato FGTS e certidões negativas',
            },
            {
              num: '3', done: false,
              titulo: 'Escolher o imóvel',
              desc: `Busque imóveis até ${formatBRL(dados.valorMaxImovel)}. Lembre: FGTS${parseMoeda(e.fgts) > 0 ? ` (${formatBRL(parseMoeda(e.fgts))})` : ''} e entrada ampliam seu poder de compra`,
            },
            ...(painelAtivo === 'mcmv' ? [{
              num: '4', done: false,
              titulo: 'Fase de obra (se na planta)',
              desc: 'Parcelas de entrada à construtora + juros evolutivos ao banco. As duas correm em paralelo durante a obra',
            }] : []),
            {
              num: painelAtivo === 'mcmv' ? '5' : '4', done: false,
              titulo: 'Análise de crédito',
              desc: 'Caixa Econômica Federal analisa renda, crédito e avalia o imóvel. Prazo médio: 30–60 dias',
            },
            {
              num: painelAtivo === 'mcmv' ? '6' : '5', done: false,
              titulo: 'Contrato e registro',
              desc: 'Assinatura do contrato de financiamento e registro no cartório de imóveis (CRI)',
            },
          ].map(({ num, done, titulo, desc }) => (
            <div key={titulo} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: done ? '#0F6E56' : 'var(--primary)',
                color: '#fff', fontSize: 11, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{num}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: done ? '#0F6E56' : 'var(--text)', marginBottom: 2 }}>{titulo}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 6, fontWeight: 600, borderTop: '1px solid #BFDBFE', paddingTop: 10 }}>
            💬 Fale com o João para tirar dúvidas sobre cada etapa
          </div>
        </div>

        {/* Tipo de imóvel */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10 }}>Tipo de imóvel que busca</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {([
              { val: 'residencial' as const, icon: '🏠', label: 'Residencial' },
              { val: 'comercial'   as const, icon: '🏢', label: 'Comercial' },
            ]).map(({ val, icon, label }) => (
              <button key={val} onClick={() => setTipoImovel(val)}
                style={{ flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer', border: `2px solid ${tipoImovel === val ? 'var(--primary)' : 'var(--border)'}`, background: tipoImovel === val ? 'rgba(37,99,235,.08)' : 'var(--bg-card)', textAlign: 'center', transition: 'all .15s', fontFamily: 'inherit' }}>
                <div style={{ fontSize: 18, marginBottom: 3 }}>{icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: tipoImovel === val ? 'var(--primary)' : 'var(--text-muted)' }}>{label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: 'grid', gap: 12, marginBottom: 12 }}>
          <Link href={`/imoveis?min=${Math.round(dados.valorMaxImovel * 0.5)}&max=${dados.valorMaxImovel}&tipo=${tipoImovel}`}
            style={{ display: 'block', padding: '16px 0', borderRadius: 12, background: 'var(--primary)', color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
            🏠 Ver imóveis compatíveis — {dados.label}
          </Link>
          <button onClick={avancar} style={{ padding: '14px 0', borderRadius: 12, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Simular imóvel específico
          </button>
        </div>
        <button onClick={voltar} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit', display: 'block', textAlign: 'center', width: '100%' }}>
          ← Ajustar dados
        </button>
      </Etapa>
    );
  }

  // ═══════════════ ETAPA 6 — IMÓVEL ESPECÍFICO ══════════════════════════════
  if (etapa === 6) {
    const valorImovel = parseMoeda(e.valorImovel);
    const perfValorMax = perfil ? (perfil.mcmv.elegivel ? perfil.mcmv.valorMaxImovel : perfil.sbpe.valorMaxImovel) : 0;
    const isSFI = valorImovel > TETO_SFH;
    return (
      <Etapa etapa={etapa}>
        <BtnVoltar onClick={voltar} />
        <Barra etapa={4} total={6} />
        <Titulo>Qual é o valor do imóvel?</Titulo>
        <Sub>Informe o valor do imóvel que você tem em mente para ver a simulação completa com Price e SAC.</Sub>

        <InputBRL label="Valor do imóvel" value={e.valorImovel} onChange={v => upd({ valorImovel: v })} />

        {valorImovel > 0 && (
          <div style={{ marginBottom: 20 }}>
            {isSFI ? (
              <div style={{ padding: '12px 16px', background: '#FAEEDA', borderRadius: 10, fontSize: 13, color: '#633806' }}>
                📌 Imóvel acima de {formatBRL(TETO_SFH)} — enquadrado no <strong>SFI</strong>. Taxa ~{TAXA_SFI_ANUAL}% a.a. · FGTS não permitido · sem teto de valor.
              </div>
            ) : valorImovel > perfValorMax * 1.05 ? (
              <div style={{ padding: '12px 16px', background: '#FAECE7', borderRadius: 10, fontSize: 13, color: '#4A1B0C' }}>
                ⚠️ {formatBRL(valorImovel)} está acima do seu teto calculado ({formatBRL(perfValorMax)}). A parcela pode ultrapassar 30% da renda.
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

        {/* Seletor de estágio do imóvel */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.8px' }}>Estágio do imóvel</label>
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              { id: 'pronto', ico: '🏠', label: 'Pronto / Novo / Usado', sub: 'Entrega imediata — sem fase de obra', naPlanta: false },
              { id: 'obras',  ico: '🏗️', label: 'Em Obras', sub: 'Medições ativas — pode entrar no crédito associativo', naPlanta: true },
              { id: 'planta', ico: '🌱', label: 'Na Planta', sub: 'Obra não iniciada — crédito associativo MCMV / SBPE', naPlanta: true },
            ].map(({ id, ico, label, sub, naPlanta: np }) => {
              const selecionado = np === false ? !e.naPlanta : e.naPlanta && (
                id === 'planta' ? !e.temImovelMunicipio : e.temImovelMunicipio
              );
              // Simplificado: pronto = !naPlanta; em obras/planta = naPlanta
              const ativo = id === 'pronto' ? !e.naPlanta : e.naPlanta;
              // Para distinguir entre obras e planta quando naPlanta=true, não é crítico aqui
              const realmente = id === 'pronto' ? !e.naPlanta : (e.naPlanta && id === 'obras' ? true : (e.naPlanta && id === 'planta' ? true : false));
              void selecionado; void realmente;
              return (
                <button
                  key={id}
                  onClick={() => {
                    upd({ naPlanta: np });
                    if (id === 'planta') {
                      // Não redireciona — simula dentro do fluxo principal com naPlanta=true
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${(id === 'pronto' && !e.naPlanta) || (id !== 'pronto' && e.naPlanta) ? 'var(--primary)' : 'var(--border)'}`,
                    background: (id === 'pronto' && !e.naPlanta) || (id !== 'pronto' && e.naPlanta) ? 'var(--primary-light)' : 'var(--bg)',
                    textAlign: 'left', width: '100%', fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{ico}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45 }}>{sub}</div>
                  </div>
                </button>
              );
            })}
          </div>
          {e.naPlanta && (
            <div style={{ marginTop: 10, padding: '10px 14px', background: '#FAEEDA', borderRadius: 10, fontSize: 12, color: '#633806' }}>
              🏗️ Imóvel na planta — simulamos juros evolutivos + crédito associativo.{' '}
              <Link href="/simulador/na-planta" style={{ color: '#854F0B', fontWeight: 700 }}>Ver simulação detalhada da obra →</Link>
            </div>
          )}
        </div>

        <BtnPrimario label="Ver simulação completa →" onClick={avancar} disabled={valorImovel < 10000} />
      </Etapa>
    );
  }

  // ═══════════════ ETAPA 7 — RESULTADO COMPLETO ═════════════════════════════
  if (etapa === 7) {
    if (!sim) { calcularSim(); return <Etapa etapa={etapa}><p>Calculando...</p></Etapa>; }

    const sc = SAUDE[sim.saudeLabel];
    const economiasSAC = Math.max(0, sim.totalPagoPrice - sim.totalPagoSAC);
    // Usa sim.faixa (faixa real do imóvel — pode ser superior à faixa base da renda)
    const modalLabel = sim.isMCMV ? (sim.faixa ? `${sim.faixa.label} MCMV` : 'MCMV') : sim.isSFI ? 'SFI' : 'SBPE (SFH)';
    // Decomposição da entrada: dinheiro (ato) + FGTS usado + subsídio = sim.entrada
    const entradaDinheiro = Math.max(0, sim.entrada - sim.fgtsUsado - sim.subsidioEstimado);

    return (
      <Etapa etapa={etapa}>
        <BtnVoltar onClick={voltar} />

        {/* Header */}
        <div className="fc-header-bleed" style={{ margin: '-32px -28px 28px', padding: '36px 28px 32px', background: `linear-gradient(135deg, ${sc.cor} 0%, ${sc.cor}CC 100%)`, borderRadius: '20px 20px 0 0', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '2.5px', marginBottom: 6 }}>{sc.emoji} {modalLabel}</div>
          {!sim.isMCMV && !sim.isSFI && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 10, lineHeight: 1.5 }}>
              ℹ️ {sim.faixaRenda
                ? `Imóvel (${formatBRL(sim.valorImovel)}) acima do teto máximo MCMV para sua renda — Faixa 4 cobre até ${formatBRL(600000)}`
                : `Renda acima do limite MCMV (máx. ${formatBRL(13000)}/mês)`}
              {' '}— financiamento SBPE
            </div>
          )}
          <div style={{ fontSize: 42, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{formatBRL(sim.parcelaPrimeiro)}</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>parcela inicial (Price) · {sim.comprometimento.toFixed(1)}% da renda</div>
        </div>

        {/* Price vs SAC */}
        <div className="fc-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ padding: '18px', background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', borderRadius: 14, border: '2px solid #2563eb' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Tabela Price</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{formatBRL(sim.parcelaPrimeiro)}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>parcela fixa/mês</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>Total: {formatBRL(sim.totalPagoPrice)}</div>
          </div>
          <div style={{ padding: '18px', background: 'linear-gradient(135deg, #F0FDF9, #D1FAE5)', borderRadius: 14, border: '2px solid #0F6E56' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#0F6E56', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>SAC</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{formatBRL(sim.parcelaSACPrimeiro)}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>1ª parcela · decresce</div>
            <div style={{ fontSize: 12, color: '#065F46', marginTop: 8, fontWeight: 700 }}>Economiza {formatBRL(economiasSAC)}</div>
          </div>
        </div>

        {/* ── Composição do poder de compra ──────────────────────────── */}
        <div style={{ background: 'var(--bg-card)', border: `1.5px solid ${sc.cor}44`, borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '12px 16px', background: sc.bg, borderBottom: `1px solid ${sc.cor}22` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: sc.cor, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              📊 Composição do poder de compra
            </div>
          </div>
          <div style={{ padding: '4px 16px 12px' }}>
            {([
              { emoji: '🏛️', label: 'Financiamento bancário',    valor: sim.valorFinanciado },
              { emoji: '💰', label: 'Entrada (ato / dinheiro)',    valor: entradaDinheiro },
              ...(sim.fgtsUsado > 0
                ? [{ emoji: '🏦', label: 'FGTS utilizado', valor: sim.fgtsUsado }]
                : sim.fgts > 0
                  ? [{ emoji: '🏦', label: 'FGTS (não elegível / não usado)', valor: 0 }]
                  : []),
              ...(sim.subsidioEstimado > 0 ? [{ emoji: '🎁', label: 'Subsídio MCMV (estimado)', valor: sim.subsidioEstimado }] : []),
            ] as { emoji: string; label: string; valor: number }[]).map(({ emoji, label, valor: v }, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px dashed var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>
                  {i > 0 && <span style={{ color: '#9CA3AF', marginRight: 5, fontSize: 11 }}>+</span>}
                  {emoji} {label}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: v === 0 ? '#9CA3AF' : 'var(--text)' }}>
                  {v === 0 ? '—' : formatBRL(v)}
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 0', borderTop: `2px solid ${sc.cor}33`, marginTop: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: sc.cor }}>= 🏠 Valor do imóvel</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: sc.cor }}>{formatBRL(sim.valorImovel)}</span>
            </div>
            {/* Explicação: como o banco calcula (CET / encargo mensal completo) */}
            <div style={{ marginTop: 12, padding: '12px 14px', background: '#F1F5F9', borderRadius: 10, fontSize: 12, color: '#4B5563', lineHeight: 1.8 }}>
              <strong style={{ color: sc.cor, fontSize: 12 }}>
                💡 Como o banco calcula o financiamento
              </strong>
              <br />
              O banco avalia o <strong>encargo mensal completo</strong> — não o valor bruto liberado. O limite é <strong>30% da renda bruta</strong> sobre o encargo total (Res. CMN 4.676/2018).
              <br /><br />
              <strong>Renda {formatBRL(parseMoeda(e.renda))}/mês × 30% = {formatBRL(Math.round(parseMoeda(e.renda) * 0.30))}/mês</strong> de encargo máximo.
              <br />
              Encargo real desta simulação: <strong>{formatBRL(sim.parcelaPrimeiro)}/mês</strong> ({sim.comprometimento.toFixed(1)}% da renda{sim.comprometimento > 30 ? ' ⚠️ acima do limite' : ''})
              <br />
              <span style={{ paddingLeft: 8, display: 'inline-block', color: '#6B7280' }}>
                ↳ A+J (amort. + juros): {formatBRL(sim.parcelaPrimeiro - sim.seguros.total)}/mês
              </span>
              <br />
              <span style={{ paddingLeft: 8, display: 'inline-block', color: '#6B7280' }}>
                ↳ MIP (seg. vida) + DFI (seg. imóvel) + tarifa: {formatBRL(sim.seguros.total)}/mês
              </span>
              <br />
              Com esse encargo, o banco aprova <strong>{formatBRL(sim.valorFinanciado)}</strong> de financiamento à taxa de <strong>{sim.taxaAnual}% a.a.</strong> em <strong>{Math.round(sim.prazoMeses / 12)} anos</strong>.
            </div>
          </div>
        </div>

        {/* Detalhamento */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
          {([
            { l: 'Valor do imóvel', v: formatBRL(sim.valorImovel) },
            { l: '  ↳ 💰 Entrada (ato / dinheiro)', v: formatBRL(entradaDinheiro) },
            sim.fgtsUsado > 0 ? { l: '  ↳ 🏦 FGTS utilizado', v: formatBRL(sim.fgtsUsado) } : null,
            sim.subsidioEstimado > 0 ? { l: '  ↳ 🎁 Subsídio MCMV (estimado)', v: formatBRL(sim.subsidioEstimado), destaque: true } : null,
            { l: '  = Total entrada', v: formatBRL(sim.entrada) },
            { l: '🏛️ Valor financiado (banco)', v: formatBRL(sim.valorFinanciado) },
            { l: 'Taxa de juros nominal', v: `${sim.taxaAnual}% a.a. + ${sim.isSFI ? 'taxa livre' : 'TR'}` },
            { l: 'Prazo', v: `${Math.round(sim.prazoMeses / 12)} anos (${sim.prazoMeses} meses)` },
            { l: 'Parcela A+J (amort. + juros)', v: formatBRL(sim.parcelaPrimeiro - sim.seguros.total) },
            { l: `MIP — seguro vida (idade ${Number(e.idade) || 35} anos)`, v: formatBRL(sim.seguros.mip) },
            { l: 'DFI — seguro do imóvel', v: formatBRL(sim.seguros.dfi) },
            { l: 'Tarifa de administração (CEF)', v: formatBRL(sim.seguros.txAdm) },
          ] as Array<{ l: string; v: string; destaque?: boolean } | null>)
            .filter(Boolean)
            .map((item, i) => {
              const { l, v, destaque } = item!;
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

        {/* Comparativo bancos SBPE */}
        {!sim.isMCMV && !sim.isSFI && (
          <ComparativoBancosSBPE financiado={sim.valorFinanciado} prazoMeses={sim.prazoMeses} />
        )}

        {/* Nota legal */}
        <p style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.5, marginBottom: 24, marginTop: 16 }}>
          Simulação educativa — regras SFH/MCMV vigentes · mai/2026. MIP calculado pelo coeficiente etário real do contrato SIOPI/Caixa. Taxas SBPE: referência de mercado — variam por banco, perfil e LTV. Valores exatos confirmados em cada instituição financeira. Não constitui proposta de crédito.
        </p>

        <div style={{ display: 'grid', gap: 12 }}>
          <Link href={`/imoveis?min=${Math.round(sim.valorImovel * 0.75)}&max=${Math.round(sim.valorImovel * 1.20)}${sim.naPlanta ? '&status=na planta' : ''}&tipo=${tipoImovel}`}
            style={{ display: 'block', padding: '16px 0', borderRadius: 12, background: 'var(--primary)', color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
            🏠 Ver imóveis compatíveis — {formatBRL(Math.round(sim.valorImovel * 0.75))} a {formatBRL(Math.round(sim.valorImovel * 1.20))}
          </Link>
          <button onClick={() => { setEtapa(0); setE(E0); setPerfil(null); setSim(null); }}
            style={{ padding: '15px 0', borderRadius: 12, border: '1.5px solid var(--primary)', background: 'transparent', color: 'var(--primary)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Fazer nova simulação
          </button>
        </div>
      </Etapa>
    );
  }

  return null;
}

export default function SimuladorPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <SimuladorInner />
    </Suspense>
  );
}
