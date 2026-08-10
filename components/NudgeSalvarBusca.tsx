'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getFavoritosCount, onFavoritosChange } from '@/lib/favoritos';

const DISMISS_KEY = 'fc_nudge_busca_dismissed';

/**
 * Convite discreto e único (nunca mais que uma vez) para salvar a busca —
 * disparado só depois de um sinal real de interesse (2º favorito), nunca
 * na primeira visita. Fase 3 do roadmap: pedir contato só depois que a
 * pessoa já percebeu valor na plataforma.
 */
export default function NudgeSalvarBusca() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const check = () => {
      if (typeof window === 'undefined') return;
      if (localStorage.getItem(DISMISS_KEY)) return;
      if (getFavoritosCount() >= 2) setShow(true);
    };
    check();
    return onFavoritosChange(check);
  }, []);

  function dismiss() {
    setShow(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  }

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
      zIndex: 1500, maxWidth: '92vw', width: '380px',
      background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '16px',
      boxShadow: '0 12px 40px rgba(0,0,0,.18)', padding: '16px 18px',
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      animation: 'nudgeUp 0.3s ease',
    }}>
      <span style={{ fontSize: '22px', flexShrink: 0 }}>🔔</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text)', marginBottom: '3px' }}>Gostou dos favoritos?</p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.4 }}>
          Filtre o que você procura em Imóveis e salve a busca — a gente avisa quando entrar algo parecido.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link
            href="/imoveis"
            onClick={dismiss}
            style={{ fontSize: '12px', fontWeight: '700', color: '#fff', background: 'var(--primary)', borderRadius: '8px', padding: '7px 12px', textDecoration: 'none' }}
          >
            Salvar busca
          </Link>
          <button
            onClick={dismiss}
            style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '7px 8px' }}
          >
            Agora não
          </button>
        </div>
      </div>
      <button
        onClick={dismiss}
        aria-label="Fechar"
        style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: '16px', padding: '2px', lineHeight: 1, flexShrink: 0 }}
      >
        ✕
      </button>
      <style>{`@keyframes nudgeUp { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
}
