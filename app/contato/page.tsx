'use client';

import { useState } from 'react';

const ASSUNTOS = [
  'Dúvida sobre financiamento',
  'Simulação personalizada',
  'Parceria comercial',
  'Sugestão para o site',
  'Outro',
];

export default function ContatoPage() {
  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', assunto: '', mensagem: '', lgpd: false,
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [erro, setErro] = useState('');

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.lgpd) { setErro('Você precisa autorizar o uso dos seus dados para enviar a mensagem.'); return; }
    setErro('');
    setStatus('sending');

    try {
      const res = await fetch('/api/contato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus('ok');
        setForm({ nome: '', email: '', telefone: '', assunto: '', mensagem: '', lgpd: false });
        import('@/lib/gtag').then(m => m.trackContato(form.assunto));
      }
      else { const d = await res.json(); setErro(d.error || 'Erro ao enviar. Tente novamente.'); setStatus('error'); }
    } catch {
      setErro('Erro de conexão. Verifique sua internet e tente novamente.');
      setStatus('error');
    }
  }

  return (
    <div>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)',
        padding: '64px 24px 56px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,.1)',
            border: '1px solid rgba(255,255,255,.15)',
            borderRadius: 999, padding: '5px 16px',
            fontSize: 12, fontWeight: 700, color: '#93c5fd',
            letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 20,
          }}>
            Contato
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 14 }}>
            Fale conosco
          </h1>
          <p style={{ fontSize: 16, color: '#cbd5e1', lineHeight: 1.7, margin: 0 }}>
            Tire dúvidas, envie sugestões ou entre em contato para parcerias.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 16px 80px' }}>

      {/* Banner email direto */}
      <div style={{
        background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12,
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
        marginBottom: 20,
      }}>
        <span style={{ fontSize: 24 }}>✉️</span>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 2 }}>
            E-MAIL DIRETO
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1D4ED8' }}>
            contato@financiecerto.com.br
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
        {[
          { icon: '⏱️', label: 'RESPOSTA', valor: 'Em até 2 dias úteis' },
          { icon: '📍', label: 'ATENDIMENTO', valor: 'São Paulo — SP' },
        ].map(({ icon, label, valor }) => (
          <div key={label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{valor}</div>
          </div>
        ))}
      </div>

      {/* Formulário */}
      {status === 'ok' ? (
        <div style={{
          background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 16,
          padding: '40px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#166534', marginBottom: 8 }}>Mensagem enviada!</h2>
          <p style={{ fontSize: 14, color: '#15803D', marginBottom: 24 }}>
            Recebemos sua mensagem e responderemos em até 2 dias úteis.
          </p>
          <button
            onClick={() => setStatus('idle')}
            style={{
              background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10,
              padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Enviar outra mensagem
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Nome + Email */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: 6 }}>
                NOME *
              </label>
              <input
                required
                type="text"
                placeholder="Seu nome completo"
                value={form.nome}
                onChange={e => set('nome', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: 6 }}>
                E-MAIL *
              </label>
              <input
                required
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Telefone + Assunto */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: 6 }}>
                TELEFONE / WHATSAPP
              </label>
              <input
                type="tel"
                placeholder="+55 (11) 99999-9999"
                value={form.telefone}
                onChange={e => set('telefone', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: 6 }}>
                ASSUNTO
              </label>
              <select
                value={form.assunto}
                onChange={e => set('assunto', e.target.value)}
                style={{ ...inputStyle, appearance: 'auto' }}
              >
                <option value="">Selecione...</option>
                {ASSUNTOS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Mensagem */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: 6 }}>
              MENSAGEM *
            </label>
            <textarea
              required
              rows={5}
              placeholder="Descreva sua dúvida ou mensagem..."
              value={form.mensagem}
              onChange={e => set('mensagem', e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}
            />
          </div>

          {/* LGPD */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            background: '#F8FAFC', border: '1px solid var(--border)',
            borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={form.lgpd}
              onChange={e => set('lgpd', e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16 }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.6 }}>
              Autorizo o FinancieCerto a armazenar e utilizar meus dados (nome, e-mail e telefone)
              exclusivamente para responder a esta mensagem, conforme a{' '}
              <strong style={{ color: 'var(--text)' }}>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
              {' '}Meus dados não serão compartilhados com terceiros. *
            </span>
          </label>

          {/* Erro */}
          {erro && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#DC2626' }}>
              {erro}
            </div>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={status === 'sending'}
            style={{
              background: status === 'sending' ? '#93C5FD' : 'var(--primary)',
              color: '#fff', border: 'none', borderRadius: 12,
              padding: '15px 32px', fontSize: 15, fontWeight: 700,
              cursor: status === 'sending' ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              width: 'fit-content',
            }}
          >
            {status === 'sending' ? '⏳ Enviando...' : '✉️ Enviar mensagem'}
          </button>

          <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: -8 }}>* Campos obrigatórios.</p>
        </form>
      )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  border: '1.5px solid var(--border)',
  borderRadius: 10,
  fontSize: 14,
  color: 'var(--text)',
  background: 'var(--bg-card)',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};
