'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

interface Alerta {
  id: string;
  descricaoFiltros: string;
  filtrosQuery: string;
  criadoEm: string;
}
interface Contato {
  id: string;
  imovelId: string;
  imovelName: string;
  criadoEm: string;
}

function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  async function enviar() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErro('Informe um e-mail válido.'); return; }
    setErro('');
    setEnviando(true);
    try {
      const res = await fetch('/api/conta/entrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setErro(data?.error || 'Não foi possível enviar.'); return; }
      setEnviado(true);
    } catch {
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <p style={{ fontSize: '36px', marginBottom: '10px' }}>📩</p>
        <p style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>Confira seu e-mail</p>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Enviamos um link de acesso pra <strong>{email.trim()}</strong>. Ele expira em 15 minutos e só funciona uma vez.
        </p>
      </div>
    );
  }

  return (
    <>
      <p style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text)', marginBottom: '6px' }}>👤 Minha conta</p>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
        Sem senha — informe seu e-mail e enviamos um link de acesso. Use pra ver seus alertas ativos e o histórico de contatos.
        <br />Navegar e simular no FinancieCerto <strong>nunca</strong> exige conta.
      </p>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') enviar(); }}
        placeholder="seuemail@exemplo.com"
        autoFocus
        style={{ width: '100%', padding: '12px 14px', border: '1.5px solid var(--border)', borderRadius: '10px', fontSize: '14px', outline: 'none', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '12px' }}
      />
      {erro && <p style={{ fontSize: '13px', color: '#dc2626', marginBottom: '12px' }}>{erro}</p>}
      <button
        onClick={enviar}
        disabled={enviando || !email}
        className="btn-primary"
        style={{ width: '100%', opacity: enviando ? 0.7 : 1 }}
      >
        {enviando ? 'Enviando…' : 'Enviar link de acesso'}
      </button>
    </>
  );
}

function Dashboard({ email, onSair }: { email: string; onSair: () => void }) {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelando, setCancelando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/conta/dados');
    const data = await res.json().catch(() => null);
    setAlertas(data?.alertas || []);
    setContatos(data?.contatos || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function cancelarAlerta(id: string) {
    setCancelando(id);
    try {
      await fetch(`/api/buscas-salvas/${id}`, { method: 'PATCH' });
      setAlertas(prev => prev.filter(a => a.id !== id));
    } finally {
      setCancelando(null);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <p style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text)', marginBottom: '2px' }}>👤 Minha conta</p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{email}</p>
        </div>
        <button onClick={onSair} style={{ padding: '8px 14px', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
          Sair
        </button>
      </div>

      {loading && <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Carregando…</p>}

      {!loading && (
        <>
          <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            🔔 Alertas ativos {alertas.length > 0 ? `(${alertas.length})` : ''}
          </p>
          {alertas.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-faint)', marginBottom: '24px' }}>
              Nenhum alerta ativo. Ative um em <a href="/imoveis" style={{ color: 'var(--primary)' }}>Imóveis</a>, filtrando o que você procura.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {alertas.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '10px' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>{a.descricaoFiltros}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>desde {formatData(a.criadoEm)}</p>
                  </div>
                  <button
                    onClick={() => cancelarAlerta(a.id)}
                    disabled={cancelando === a.id}
                    style={{ flexShrink: 0, padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {cancelando === a.id ? 'Cancelando…' : 'Cancelar'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            💬 Contatos feitos {contatos.length > 0 ? `(${contatos.length})` : ''}
          </p>
          {contatos.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-faint)' }}>Nenhum contato registrado ainda com este e-mail.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {contatos.map(c => (
                <a key={c.id} href={`/imoveis/${c.imovelId}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '10px', textDecoration: 'none' }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>{c.imovelName}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-faint)', flexShrink: 0 }}>{formatData(c.criadoEm)}</p>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function ContaInner() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string | null | undefined>(undefined); // undefined = checando

  const checar = useCallback(async () => {
    const res = await fetch('/api/conta/me');
    const data = await res.json().catch(() => ({ email: null }));
    setEmail(data.email);
  }, []);

  useEffect(() => { checar(); }, [checar]);

  async function sair() {
    await fetch('/api/conta/sair', { method: 'POST' });
    setEmail(null);
  }

  const bemVindo = searchParams.get('bemvindo') === '1';
  const erroLink = searchParams.get('erro') === '1';

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '60px 20px 40px' }}>
      {bemVindo && (
        <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#E1F5EE', border: '1px solid #A7F3D0', borderRadius: '10px', fontSize: '13px', color: '#085041', fontWeight: '600' }}>
          ✅ Acesso confirmado!
        </div>
      )}
      {erroLink && (
        <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', fontSize: '13px', color: '#dc2626', fontWeight: '600' }}>
          Esse link expirou ou já foi usado. Peça um novo abaixo.
        </div>
      )}
      <div style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: '16px', padding: '28px' }}>
        {email === undefined && <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Carregando…</p>}
        {email === null && <LoginForm />}
        {email && <Dashboard email={email} onSair={sair} />}
      </div>
    </div>
  );
}

export default function ContaPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
      <ContaInner />
    </Suspense>
  );
}
