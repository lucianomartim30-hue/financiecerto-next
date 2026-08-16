'use client';

import { useState, useCallback } from 'react';

interface FotoAdmin {
  url: string;
  id: string | null;
  oculta: boolean;
}

// ─── Login (mesma senha do /admin/leads) ─────────────────────────────────────
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
        <p style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>🖼️ Curadoria de Fotos</p>
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

// ─── Painel principal ───────────────────────────────────────────────────────
export default function AdminFotosPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [buildingId, setBuildingId] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [fotos, setFotos] = useState<FotoAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const id = buildingId.trim();
    if (!id) return;
    setLoading(true);
    setErro('');
    setFotos([]);
    try {
      const res = await fetch(`/api/orulo/${encodeURIComponent(id)}`);
      if (res.status === 401) { setAuthed(false); return; }
      if (!res.ok) { setErro('Imóvel não encontrado.'); return; }
      const data = await res.json();
      if (!data.admin_fotos) { setErro('Sem permissão pra ver fotos ocultas — faça login de novo.'); return; }
      setBuildingName(data.name || '');
      setFotos(data.admin_fotos);
    } catch {
      setErro('Erro ao carregar. Tente de novo.');
    } finally {
      setLoading(false);
    }
  }, [buildingId]);

  async function alternar(foto: FotoAdmin) {
    if (!foto.id) return;
    setSalvando(foto.id);
    const novaOculta = !foto.oculta;
    setFotos(prev => prev.map(f => f.id === foto.id ? { ...f, oculta: novaOculta } : f));
    try {
      await fetch('/api/admin/fotos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildingId: buildingId.trim(), photoId: foto.id, oculta: novaOculta }),
      });
    } finally {
      setSalvando(null);
    }
  }

  if (authed === null) {
    // Checa sessão via uma chamada leve — reaproveita /api/leads (mesmo cookie)
    fetch('/api/leads').then(res => setAuthed(res.status !== 401)).catch(() => setAuthed(false));
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando…</div>;
  }
  if (authed === false) {
    return <LoginForm onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>🖼️ Curadoria de Fotos</h1>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
        Esconda fotos que não deveriam aparecer pro cliente (material de marketing pra corretor/imobiliária, ex: banners de comissão) — cole o id do empreendimento (o número no final da URL do imóvel no site).
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <input
          type="text"
          value={buildingId}
          onChange={e => setBuildingId(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') carregar(); }}
          placeholder="Id do empreendimento — ex: 72556"
          style={{ flex: 1, padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit' }}
        />
        <button onClick={carregar} disabled={loading || !buildingId.trim()} style={{ padding: '11px 20px', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Carregando…' : 'Carregar fotos'}
        </button>
      </div>

      {erro && <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '16px' }}>{erro}</p>}

      {buildingName && <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px' }}>{buildingName}</p>}

      {fotos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
          {fotos.map(foto => (
            <div key={foto.url} style={{ border: '1.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', opacity: foto.oculta ? 0.4 : 1, position: 'relative' }}>
              <img src={foto.url} alt="" style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: '8px' }}>
                <button
                  onClick={() => alternar(foto)}
                  disabled={salvando === foto.id || !foto.id}
                  style={{
                    width: '100%', padding: '7px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
                    border: `1.5px solid ${foto.oculta ? '#16a34a' : '#dc2626'}`,
                    background: foto.oculta ? 'rgba(22,163,74,.1)' : 'rgba(220,38,38,.08)',
                    color: foto.oculta ? '#16a34a' : '#dc2626',
                  }}
                >
                  {salvando === foto.id ? '…' : foto.oculta ? '👁️ Reexibir' : '🚫 Esconder'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
