'use client';

import { useEffect, useState, useCallback } from 'react';
import type { BuscaSalva } from '@/lib/buscas-salvas-kv';

function formatData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function entrar() {
    setLoading(true);
    setErro('');
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) { setErro('Senha incorreta.'); return; }
      onSuccess();
    } catch {
      setErro('Erro ao entrar. Tente de novo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '360px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
        <p style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>🔔 Buscas Salvas</p>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Acesso restrito — FinancieCerto</p>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') entrar(); }}
          placeholder="Senha"
          autoFocus
          style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '12px' }}
        />
        {erro && <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '12px' }}>{erro}</p>}
        <button
          onClick={entrar}
          disabled={loading || !password}
          style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </div>
    </div>
  );
}

export default function AdminBuscasSalvasPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [buscas, setBuscas] = useState<BuscaSalva[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/buscas-salvas');
    if (res.status === 401) { setAuthed(false); setLoading(false); return; }
    const data = await res.json();
    setBuscas(data.buscas || []);
    setAuthed(true);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  if (authed === null) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando…</div>;
  }
  if (authed === false) {
    return <LoginForm onSuccess={carregar} />;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)', margin: 0 }}>Buscas Salvas — FinancieCerto</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {buscas.length} contato{buscas.length !== 1 ? 's' : ''} querendo ser avisados de novidades
          </p>
        </div>
        <button onClick={carregar} style={{ padding: '8px 14px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
          ↻ Atualizar
        </button>
      </div>

      {loading && <p style={{ color: 'var(--text-muted)' }}>Carregando…</p>}

      {!loading && buscas.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '14px', color: 'var(--text-muted)' }}>
          Nenhuma busca salva ainda.
          <br />Aparece aqui quando alguém clicar em &quot;Salvar busca&quot; em /imoveis.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {buscas.map(b => (
          <div key={b.id} style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <p style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text)', marginBottom: '2px' }}>{b.contato}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-faint)' }}>{b.descricaoFiltros}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '4px' }}>{formatData(b.criadoEm)}</p>
              </div>
              {b.filtrosQuery && (
                <a href={`/imoveis${b.filtrosQuery}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  Ver busca no site →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
