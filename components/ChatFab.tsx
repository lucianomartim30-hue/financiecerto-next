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

// ──────────────────────────────────────────────────────────────────────────────
// Sugestões contextuais por página
// ──────────────────────────────────────────────────────────────────────────────
const SUGESTOES_POR_PAGINA: Record<string, string[]> = {
  '/': [
    'O que é MCMV?',
    'Qual a diferença entre SAC e Price?',
    'Preciso de entrada para financiar?',
    'Posso usar FGTS na compra?',
  ],
  '/simulador': [
    'Como a renda afeta o financiamento?',
    'MCMV ou SBPE — qual escolher?',
    'O que é comprometimento de renda?',
    'Subsídio é devolvido?',
  ],
  '/simulador/na-planta': [
    'Como funciona a evolução de obra?',
    'O que são juros evolutivos?',
    'Pago à construtora e ao banco juntos?',
    'O que é crédito associativo?',
  ],
  '/imoveis': [
    'O que significa "Na Planta"?',
    'O que verificar na matrícula do imóvel?',
    'Qual a diferença entre VGV e preço unitário?',
    'Posso visitar o empreendimento antes de comprar?',
  ],
  '/guia': [
    'Quanto tempo leva a aprovação?',
    'Autônomo consegue financiar?',
    'Quais documentos preciso separar?',
    'Como funciona o FGTS Futuro?',
  ],
  '/glossario': [
    'O que é TR?',
    'O que é CET no financiamento?',
    'Explica alienação fiduciária',
    'O que é habite-se?',
  ],
};

const DEFAULT_SUGESTOES = [
  'O que é MCMV?',
  'Qual a diferença de SAC e Price?',
  'Como funciona o crédito associativo?',
  'Posso usar FGTS na entrada?',
];

// ──────────────────────────────────────────────────────────────────────────────
// Markdown simples → HTML seguro
// ──────────────────────────────────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m =>
      `<ul style="margin:6px 0 6px 16px;padding:0;list-style:disc;">${m}</ul>`,
    )
    .replace(/\n(?![<])/g, '<br/>');
}

// ──────────────────────────────────────────────────────────────────────────────
// Export: salvar contexto de simulação (chamado pelas páginas)
// ──────────────────────────────────────────────────────────────────────────────
export function saveSimContext(ctx: SimulacaoContext) {
  if (typeof window === 'undefined') return;
  try {
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
  const [open, setOpen]     = useState(false);
  const [msgs, setMsgs]     = useState<Msg[]>([]);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [simCtx, setSimCtx] = useState<SimulacaoContext | null>(null);
  const msgsRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Greeting contextual ──────────────────────────────────────────────────
  const getGreeting = useCallback((path: string): string => {
    const map: Record<string, string> = {
      '/simulador':
        'Olá! Sou o **João**, seu consultor FinancieCerto. 👋\n\nVejo que você está no simulador. Se tiver dúvidas sobre renda, entrada, FGTS ou qual modalidade faz mais sentido para você, é só perguntar.',
      '/simulador/na-planta':
        'Olá! Sou o **João**. 👋\n\nVocê está simulando um imóvel na planta. Se tiver dúvidas sobre evolução de obra, crédito associativo, juros evolutivos ou qualquer parte do processo, estou aqui.',
      '/imoveis':
        'Olá! Sou o **João**, consultor FinancieCerto. 👋\n\nEstá explorando imóveis. Se quiser entender melhor algum empreendimento, status de obra ou comparar opções financeiramente, é só me perguntar.',
      '/guia':
        'Olá! Sou o **João**. 👋\n\nVocê está no Guia. Se algum tópico ficou com dúvida ou quiser aprofundar — MCMV, documentação, processo — pode me perguntar diretamente.',
      '/glossario':
        'Olá! Sou o **João**. 👋\n\nEstá no Glossário. Se quiser que eu explique algum termo de forma mais contextual ou com exemplos práticos, é só dizer.',
    };
    return (
      map[path] ||
      'Olá! Sou o **João**, consultor virtual do FinancieCerto. 👋\n\nSou especialista em financiamento imobiliário — MCMV, SBPE, imóvel na planta, FGTS, processo de aprovação. Como posso ajudar?'
    );
  }, []);

  // Reinicializa conversa quando pathname muda
  useEffect(() => {
    setMsgs([{ role: 'assistant', content: getGreeting(pathname), id: 'init' }]);
  }, [pathname, getGreeting]);

  // Lê contexto de simulação do sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = sessionStorage.getItem('fc_sim_context');
    if (raw) { try { setSimCtx(JSON.parse(raw)); } catch { /**/ } }

    const handler = (e: StorageEvent) => {
      if (e.key === 'fc_sim_context' && e.newValue) {
        try { setSimCtx(JSON.parse(e.newValue)); } catch { /**/ }
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
      if (simCtx) ctx.simulacao = simCtx;

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

  const sugestoes = SUGESTOES_POR_PAGINA[pathname] ?? DEFAULT_SUGESTOES;
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
                📊 contexto ativo
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
              border: '2px solid'2px solid #fff',
            }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </div>
    </>
  );
}
