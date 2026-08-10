'use client';

import { useState } from 'react';

interface Props {
  descricaoFiltros: string;
  filtrosQuery: string;
  onClose: () => void;
}

/**
 * Modal de identificação leve (Fase 3 do roadmap) — só pede contato quando o
 * usuário explicitamente pede pra salvar a busca (ação de valor percebido),
 * nunca de forma intrusiva/automática. Consentimento LGPD é obrigatório.
 */
export default function SalvarBuscaModal({ descricaoFiltros, filtrosQuery, onClose }: Props) {
  const [contato, setContato] = useState('');
  const [consentimento, setConsentimento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  async function salvar() {
    if (!contato.trim()) { setErro('Informe seu telefone ou e-mail.'); return; }
    if (!consentimento) { setErro('Confirme que pode te avisar sobre essa busca.'); return; }
    setEnviando(true);
    setErro('');
    try {
      const res = await fetch('/api/buscas-salvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contato: contato.trim(), descricaoFiltros, filtrosQuery, consentimento }),
      });
      const data = await res.json();
      if (!res.ok) { setErro(data.error || 'Não foi possível salvar.'); return; }
      setSucesso(true);
      import('@/lib/gtag').then(m => m.gtagEvent({ action: 'save_search', category: 'engagement', label: descricaoFiltros }));
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-card)', borderRadius: '18px', padding: '26px', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}
      >
        {sucesso ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <p style={{ fontSize: '36px', marginBottom: '10px' }}>🔔</p>
            <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>Alerta ativado!</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Vamos te avisar quando surgir um imóvel compatível.
            </p>
            <button onClick={onClose} className="btn-primary" style={{ width: '100%' }}>Fechar</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text)', marginBottom: '4px' }}>🔔 Ativar alerta para esta busca</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>{descricaoFiltros}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-faint)', marginBottom: '18px' }}>
              O catálogo muda o tempo todo — deixe seu contato e avisamos assim que entrar um imóvel assim.
            </p>

            <input
              type="text"
              value={contato}
              onChange={e => setContato(e.target.value)}
              placeholder="Telefone (WhatsApp) ou e-mail"
              autoFocus
              style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '12px' }}
            />

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', cursor: 'pointer', lineHeight: 1.4 }}>
              <input
                type="checkbox"
                checked={consentimento}
                onChange={e => setConsentimento(e.target.checked)}
                style={{ marginTop: '2px', flexShrink: 0 }}
              />
              Autorizo o FinancieCerto a usar meu contato exclusivamente para me avisar sobre imóveis compatíveis com este alerta, conforme a LGPD.
            </label>

            {erro && <p style={{ fontSize: '12px', color: '#dc2626', marginBottom: '12px' }}>{erro}</p>}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={onClose}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={enviando}
                className="btn-primary"
                style={{ flex: 2, opacity: enviando ? 0.7 : 1 }}
              >
                {enviando ? 'Ativando...' : 'Ativar alerta'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
