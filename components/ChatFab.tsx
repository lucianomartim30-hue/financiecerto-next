'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
interface Msg {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

interface SimulacaoContext {
  renda?: number;
  entrada?: number;
  fgts?: number;
  prazo?: number;
  idade?: number;
  dependentes?: string;
  resultado?: {
    faixa?: string;
    modalidade?: string;
    valorMaxImovel?: number;
    valorImovel?: number;
    valorFinanciado?: number;
    parcela?: number;
    parcelaSAC?: number;
    comprometimento?: number;
    subsidio?: number;
    taxaAnual?: number;
  };
  planta?: {
    valorImovel?: number;
    prazoObraMeses?: number;
    estagio?: string;
    modalidade?: string;
  };
}

interface ImovelContext {
  id?: string;
  name?: string;
  developer?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  neighborhood?: string;
  city?: string;
  deliveryDate?: string;
  bedroomsMin?: number;
  bedroomsMax?: number;
  areaMin?: number;
  areaMax?: number;
  description?: string;
  amenities?: string[];
  typologies?: { type?: unknown; bedrooms?: unknown; area?: unknown; price?: unknown; vagas?: unknown }[];
  totalUnits?: number;
  stock?: number;
  numberOfFloors?: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Sugestões contextuais por página
// ──────────────────────────────────────────────────────────────────────────────
const SUGESTOES_POR_PAGINA: Record<string, string[]> = {
  '/': [
    'Quanto preciso de renda para comprar um apartamento?',
    'Posso usar FGTS como entrada?',
    'Qual a diferença entre MCMV e financiamento normal?',
    'Preciso de entrada para financiar?',
  ],
  '/simulador': [
    'O que significa esse valor que apareceu?',
    'Como o FGTS entra no meu poder de compra?',
    'O que compõe a minha parcela mensal?',
    'Qual o próximo passo depois de simular?',
  ],
  '/simulador/na-planta': [
    'Quanto vou pagar por mês durante a obra?',
    'Pago para a construtora e para o banco ao mesmo tempo?',
    'O que acontece se a obra atrasar?',
    'Qual o próximo passo depois de simular?',
  ],
  '/imoveis': [
    'Como saber se consigo financiar esse imóvel?',
    'O que significa "Na Planta" no status?',
    'Quanto eu pagaria de parcela nesse imóvel?',
    'Quero agendar uma visita — como faço?',
  ],
  '/guia': [
    'Quais documentos preciso separar?',
    'Quanto tempo leva a aprovação do financiamento?',
    'Autônomo ou MEI consegue financiar?',
    'O que é ITBI e quanto custa?',
  ],
  '/glossario': [
    'O que é TR e como afeta minha parcela?',
    'Explica alienação fiduciária de forma simples',
    'O que é habite-se?',
    'O que é CET e por que importa?',
  ],
};

const DEFAULT_SUGESTOES = [
  'Quanto preciso de renda para comprar um apartamento?',
  'Posso usar FGTS como entrada?',
  'Preciso pagar ITBI e cartório na compra?',
  'Qual a diferença entre MCMV e SBPE?',
];

// ──────────────────────────────────────────────────────────────────────────────
// Markdown simples → HTML seguro
// ──────────────────────────────────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    // Remover blocos LaTeX completos (\[ ... \]) — não são renderizáveis
    .replace(/\\\[[\s\S]*?\\\]/g, '')
    // Remover LaTeX inline (\( ... \))
    .replace(/\\\([\s\S]*?\\\)/g, '')
    // Headings ####, ###, ## → negrito com quebra
    .replace(/^#{4}\s+(.+)$/gm, '<strong>$1</strong>')
    .replace(/^#{3}\s+(.+)$/gm, '<strong>$1</strong>')
    .replace(/^#{2}\s+(.+)$/gm, '<strong>$1</strong>')
    // Bold e itálico
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Listas numeradas (1. 2. 3.)
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // Listas com hífen
    .replace(/^-\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m =>
      `<ul style="margin:6px 0 6px 16px;padding:0;list-style:disc;">${m}</ul>`,
    )
    .replace(/\n(?![<])/g, '<br/>');
}

// ──────────────────────────────────────────────────────────────────────────────
// Export: salvar contexto de simulação (chamado pelas páginas)
// Preserva valorMaxImovel do simulador de perfil se o contexto novo não tiver
// (evita misturar resultado do simulador na planta com o poder de compra descoberto)
// ──────────────────────────────────────────────────────────────────────────────
export function saveSimContext(ctx: SimulacaoContext) {
  if (typeof window === 'undefined') return;
  try {
    // Se o novo contexto não tem valorMaxImovel (ex: simulador na planta),
    // preserva o valorMaxImovel anterior para não misturar cenários
    if (!ctx.resultado?.valorMaxImovel) {
      const raw = sessionStorage.getItem('fc_sim_context');
      if (raw) {
        try {
          const prev = JSON.parse(raw) as SimulacaoContext;
          if (prev.resultado?.valorMaxImovel) {
            ctx = {
              ...ctx,
              resultado: {
                ...ctx.resultado,
                valorMaxImovel: prev.resultado.valorMaxImovel,
                faixa: ctx.resultado?.faixa || prev.resultado.faixa,
              },
            };
          }
        } catch { /* ignore */ }
      }
    }
    sessionStorage.setItem('fc_sim_context', JSON.stringify(ctx));
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'fc_sim_context',
        newValue: JSON.stringify(ctx),
      }),
    );
  } catch { /* ignore */ }
}

// ──────────────────────────────────────────────────────────────────────────────
// ChatFab component
// ──────────────────────────────────────────────────────────────────────────────
export default function ChatFab() {
  const pathname = usePathname();
  const [open, setOpen]       = useState(false);
  const [msgs, setMsgs]       = useState<Msg[]>([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread]   = useState(0);
  const [simCtx, setSimCtx]   = useState<SimulacaoContext | null>(null);
  const [imovelCtx, setImovelCtx] = useState<ImovelContext | null>(null);
  const msgsRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Greeting contextual — proativo com perfil + imóvel ───────────────────
  const getGreeting = useCallback(
    (path: string, ctx: SimulacaoContext | null, imovel: ImovelContext | null): string => {
      const fmtBRL = (v: number) =>
        v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

      const temPerfil = !!ctx?.resultado?.valorMaxImovel;
      const teto = ctx?.resultado?.valorMaxImovel ?? 0;
      const faixa = ctx?.resultado?.faixa ?? '';
      const parcela = ctx?.resultado?.parcela ?? 0;
      const renda = ctx?.renda ?? 0;
      const fgts = ctx?.fgts ?? 0;
      const comprometimento = ctx?.resultado?.comprometimento ?? 0;

      // Imóvel específico + perfil → análise completa e didática
      if (path.startsWith('/imoveis/') && imovel?.name && temPerfil) {
        const precoMin = imovel.minPrice ?? 0;
        const diff = teto - precoMin;
        const viavel = diff >= 0;
        const analise = viavel
          ? `Este imóvel está **${fmtBRL(diff)} abaixo** do seu poder de compra. ✅ Você tem folga.`
          : `Este imóvel está **${fmtBRL(Math.abs(diff))} acima** do seu poder de compra calculado. ⚠️ Mas vale conversar — FGTS e a avaliação da Caixa podem mudar esse quadro.`;
        return `Olá! Sou o **João**, seu consultor. 👋\n\nVejo que você está olhando o **${imovel.name}**.\n\n${analise}\n\nQuer que eu explique o que esses números significam para você na prática?`;
      }

      // Simulador com resultado → convida a conversar, sem repetir os números
      if ((path === '/simulador' || path === '/') && temPerfil) {
        return `Olá! Sou o **João**. 👋\n\nVi que você já tem seu perfil calculado. Ficou alguma dúvida sobre os resultados? Posso explicar o que cada número significa, como a parcela é calculada ou qual o próximo passo para você.`;
      }

      // Simulador na planta com resultado
      if (path === '/simulador/na-planta' && temPerfil) {
        return `Olá! Sou o **João**. 👋\n\nVi que você simulou um imóvel na planta. Ficou alguma dúvida? Posso explicar como funciona o pagamento durante a obra, o que são os juros evolutivos ou qual o próximo passo.`;
      }

      // Portal de imóveis com perfil
      if (path === '/imoveis' && temPerfil) {
        return `Olá! Sou o **João**. 👋\n\nVocê já tem seu perfil calculado — ótimo! Se quiser, me mostra qual imóvel te chamou atenção e eu analiso se cabe no seu orçamento.`;
      }

      // Padrões por página
      const map: Record<string, string> = {
        '/simulador':
          'Olá! Sou o **João**, seu consultor FinancieCerto. 👋\n\nEstou aqui para te ajudar a entender tudo sobre financiamento — desde o básico ("quanto preciso de entrada?") até os cálculos mais detalhados. Pode perguntar sem medo, não existe pergunta boba!',
        '/simulador/na-planta':
          'Olá! Sou o **João**. 👋\n\nComprar um imóvel na planta tem algumas particularidades. Se você quiser entender o que vai pagar durante a obra, quanto são os juros do banco nesse período ou como funciona a entrada — é só me perguntar, explico de forma simples.',
        '/imoveis':
          'Olá! Sou o **João**, consultor FinancieCerto. 👋\n\nEstá explorando imóveis! Se quiser, me conta sua renda e FGTS que eu calculo na hora quanto você consegue financiar e quais imóveis daqui se encaixam no seu orçamento.',
        '/guia':
          'Olá! Sou o **João**. 👋\n\nEstá lendo o Guia — ótimo! Qualquer dúvida que surgir, pode me perguntar diretamente. Explico os termos, os cálculos e o processo de forma simples.',
        '/glossario':
          'Olá! Sou o **João**. 👋\n\nSe algum termo não ficou claro, é só me pedir! Explico com exemplos práticos e com os números da sua situação, se você já simulou.',
      };
      return (
        map[path] ||
        'Olá! Sou o **João**, seu consultor de financiamento imobiliário. 👋\n\nPode me perguntar qualquer coisa — desde "o que é MCMV?" até "quanto vou pagar de parcela se comprar um apartamento de R$ 400 mil". Estou aqui para te ajudar a entender tudo antes de tomar qualquer decisão.'
      );
    },
    [],
  );

  // Reinicializa conversa quando pathname muda
  useEffect(() => {
    setMsgs([{ role: 'assistant', content: getGreeting(pathname, simCtx, imovelCtx), id: 'init' }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Re-dispara saudação quando o perfil é preenchido pela primeira vez
  useEffect(() => {
    if (msgs.length === 1 && msgs[0].id === 'init') {
      setMsgs([{ role: 'assistant', content: getGreeting(pathname, simCtx, imovelCtx), id: 'init' }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simCtx, imovelCtx]);

  // Lê contexto de simulação e imóvel do sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const rawSim = sessionStorage.getItem('fc_sim_context');
    if (rawSim) { try { setSimCtx(JSON.parse(rawSim)); } catch { /**/ } }

    const rawImovel = sessionStorage.getItem('fc_current_imovel');
    if (rawImovel) { try { setImovelCtx(JSON.parse(rawImovel)); } catch { /**/ } }

    const handler = (e: StorageEvent) => {
      if (e.key === 'fc_sim_context' && e.newValue) {
        try { setSimCtx(JSON.parse(e.newValue)); } catch { /**/ }
      }
      if (e.key === 'fc_current_imovel' && e.newValue) {
        try { setImovelCtx(JSON.parse(e.newValue)); } catch { /**/ }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (msgsRef.current)
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [msgs, loading]);

  // Focus ao abrir
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  // ── Send ─────────────────────────────────────────────────────────────────
  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    setInput('');

    const userMsg: Msg = { role: 'user', content: text, id: Date.now().toString() };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);
    setLoading(true);

    try {
      const ctx: Record<string, unknown> = { page: pathname };
      // Envia perfil completo separado de simulação pontual
      if (simCtx) {
        ctx.perfil = {
          renda: simCtx.renda,
          fgts: simCtx.fgts,
          entrada: simCtx.entrada,
          prazo: simCtx.prazo,
          idade: simCtx.idade,
          dependentes: simCtx.dependentes,
          resultado: simCtx.resultado,
        };
        ctx.simulacao = simCtx;
      }
      if (imovelCtx) ctx.imovelAtual = imovelCtx;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: msgs
            .filter(m => m.id !== 'init')
            .slice(-12)
            .map(m => ({ role: m.role, content: m.content })),
          context: ctx,
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setMsgs([...newMsgs, {
          role: 'assistant',
          content: data.error || 'Limite de mensagens atingido. Aguarde um momento! ⏳',
          id: Date.now().toString(),
        }]);
        return;
      }

      const reply = data.reply || data.message || 'Desculpe, não consegui processar sua pergunta.';
      setMsgs([...newMsgs, { role: 'assistant', content: reply, id: Date.now().toString() }]);
      if (!open) setUnread(u => u + 1);
    } catch {
      setMsgs([...newMsgs, {
        role: 'assistant',
        content: 'Ops! Problema técnico agora. Tente de novo em instantes 😅',
        id: Date.now().toString(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  }

  // Sugestões contextuais: prioridade imóvel+perfil > perfil > padrão
  const sugestoes = (() => {
    if (simCtx?.resultado?.valorMaxImovel && imovelCtx?.name) {
      return [
        'Consigo comprar esse imóvel?',
        'Como usar meu FGTS aqui?',
        'Qual seria minha parcela?',
        'Quais documentos preciso separar?',
      ];
    }
    if (simCtx?.resultado?.valorMaxImovel) {
      return [
        'O que faço agora com meu perfil?',
        'Como o FGTS aumenta meu poder de compra?',
        'Qual a diferença de imóvel pronto vs na planta?',
        'Quais documentos preciso separar?',
      ];
    }
    return SUGESTOES_POR_PAGINA[pathname] ?? DEFAULT_SUGESTOES;
  })();

  const userMsgCount = msgs.filter(m => m.id !== 'init' && m.role === 'user').length;
  const mostrarSugestoes = userMsgCount === 0;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: '88px', right: '20px',
          width: 'min(390px, calc(100vw - 32px))',
          maxHeight: 'min(580px, calc(100vh - 120px))',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          boxShadow: '0 8px 40px rgba(0,0,0,.15)',
          zIndex: 250,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeUp 0.22s cubic-bezier(.4,0,.2,1)',
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
            padding: '16px 18px',
            display: 'flex', alignItems: 'center', gap: '12px',
            flexShrink: 0,
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid rgba(255,255,255,.35)',
              flexShrink: 0,
            }}>
              <img src="/avatar-joao.png" alt="João" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontWeight: '800', fontSize: '14px' }}>João</div>
              <div style={{ color: 'rgba(255,255,255,.65)', fontSize: '12px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', flexShrink: 0, display: 'inline-block' }} />
                Consultor FinancieCerto · online
              </div>
            </div>

            {simCtx?.resultado && (
              <div style={{
                background: 'rgba(255,255,255,.15)', borderRadius: '99px',
                padding: '3px 10px', fontSize: '10px', fontWeight: '700',
                color: 'rgba(255,255,255,.85)', whiteSpace: 'nowrap',
              }}>
                {simCtx.resultado.faixa ? `📊 ${simCtx.resultado.faixa}` : '📊 perfil ativo'}
              </div>
            )}

            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'rgba(255,255,255,.15)', border: 'none',
                color: '#fff', width: '28px', height: '28px',
                borderRadius: '50%', cursor: 'pointer', fontSize: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.28)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.15)'}
            >✕</button>
          </div>

          {/* Messages */}
          <div ref={msgsRef} style={{
            flex: 1, overflowY: 'auto',
            padding: '14px',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            {msgs.map(msg => (
              <div key={msg.id} style={{
                maxWidth: '88%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, var(--primary), var(--accent))'
                  : 'var(--bg)',
                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                color: msg.role === 'user' ? '#fff' : 'var(--text)',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                fontSize: '14px', lineHeight: '1.6',
                boxShadow: msg.role === 'user' ? '0 2px 8px rgba(37,99,235,.2)' : 'none',
              }}>
                <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              </div>
            ))}

            {/* Typing dots */}
            {loading && (
              <div style={{
                alignSelf: 'flex-start', padding: '12px 16px',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: '4px 16px 16px 16px',
                display: 'flex', gap: '4px', alignItems: 'center',
              }}>
                {[0, 1, 2].map(d => (
                  <span key={d} className="anim-bounce-y" style={{
                    width: '7px', height: '7px',
                    background: 'var(--text-faint)', borderRadius: '50%',
                    display: 'inline-block', animationDelay: `${d * 0.15}s`,
                  }} />
                ))}
              </div>
            )}
          </div>

          {/* Sugestões */}
          {mostrarSugestoes && (
            <div style={{
              padding: '8px 12px 10px',
              borderTop: '1px solid var(--border)',
              flexShrink: 0,
            }}>
              <p style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '7px' }}>
                Perguntas frequentes
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {sugestoes.map(s => (
                  <button key={s} onClick={() => sendMessage(s)} style={{
                    padding: '5px 11px',
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: '99px', fontSize: '12px',
                    color: 'var(--text-muted)', cursor: 'pointer',
                    transition: 'all 0.15s', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--primary-light)';
                    e.currentTarget.style.color = 'var(--primary)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--bg)';
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div style={{
            display: 'flex', gap: '8px',
            padding: '10px 12px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-card)',
            flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Pergunte ao João..."
              disabled={loading}
              style={{
                flex: 1, padding: '10px 14px',
                border: '1.5px solid var(--border)',
                borderRadius: '12px',
                background: 'var(--bg)',
                color: 'var(--text)', fontSize: '14px', outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                padding: '10px 14px',
                background: input.trim() && !loading
                  ? 'linear-gradient(135deg, var(--primary), var(--accent))'
                  : 'var(--border)',
                color: input.trim() && !loading ? '#fff' : 'var(--text-faint)',
                border: 'none', borderRadius: '12px',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                fontSize: '16px', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: input.trim() && !loading ? '0 2px 8px rgba(37,99,235,.3)' : 'none',
              }}
            >➤</button>
          </div>
        </div>
      )}

      {/* FAB button */}
      <div style={{
        position: 'fixed', bottom: '20px', right: '20px',
        zIndex: 250,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
      }}>
        {!open && (
          <div style={{
            background: '#1e3a5f', color: '#fff',
            fontSize: '12px', fontWeight: '700',
            padding: '6px 14px', borderRadius: '99px',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(30,58,95,.35)',
            animation: 'pulse 3.5s ease-in-out infinite',
            pointerEvents: 'none',
          }}>
            Falar com o João
          </div>
        )}

        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: open ? 'var(--text)' : 'linear-gradient(135deg, #1e3a5f, #2563eb)',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(37,99,235,.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: open ? '18px' : '24px',
            transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
            position: 'relative',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(37,99,235,.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,99,235,.4)';
          }}
          aria-label={open ? 'Fechar chat' : 'Falar com o João'}
        >
          {open ? '✕' : (
            <img src="/avatar-joao.png" alt="João" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
          )}
          {unread > 0 && !open && (
            <span style={{
              position: 'absolute', top: '-3px', right: '-3px',
              background: '#dc2626', color: '#fff',
              width: '18px', height: '18px', borderRadius: '50%',
              fontSize: '11px', fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #fff',
            }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </div>
    </>
  );
}
